/**
 * Moves the legacy `Transaction` rows into the ledger.
 *
 *   npm run migrate:ledger              # dry run: report only, writes nothing
 *   npm run migrate:ledger -- --commit  # write, then reconcile against the DB
 *
 * Take a backup first (README, "Backup and restore").
 *
 * Every entry is keyed `legacy:<transaction id>`, so running this twice posts
 * nothing the second time. After writing, the per-member, per-account totals
 * in the ledger must equal the legacy totals to the cent; any difference rolls
 * that member back and the script exits non-zero.
 */
import { PrismaClient } from '@prisma/client';
import {
  diffTotals,
  mapLegacyTransaction,
  totalsByMemberAccount,
} from '../src/lib/finance/legacy';
import { postEntry, recomputeBalance } from '../src/lib/finance/ledger';
import { formatUSD } from '../src/lib/money';

const db = new PrismaClient();
const commit = process.argv.includes('--commit');

async function main() {
  const legacy = await db.transaction.findMany({ orderBy: { date: 'asc' } });
  const mapped = legacy.map((t) =>
    mapLegacyTransaction({
      id: t.id,
      memberId: t.memberId,
      amount: t.amount.toString(),
      type: t.type,
      description: t.description,
      date: t.date,
    })
  );

  const already = new Set(
    (
      await db.ledgerEntry.findMany({
        where: { idempotencyKey: { startsWith: 'legacy:' } },
        select: { idempotencyKey: true },
      })
    ).map((e) => e.idempotencyKey)
  );
  const pending = mapped.filter((m) => !already.has(m.idempotencyKey));

  const members = new Set(mapped.map((m) => m.memberId));
  const total = mapped.reduce((s, m) => s + m.amountCents, 0);
  console.log(`\nLegacy transactions: ${legacy.length} across ${members.size} members, net ${formatUSD(total)}`);
  console.log(`Already in the ledger: ${already.size}. To post: ${pending.length}.`);

  const byKind = new Map<string, number>();
  for (const m of pending) byKind.set(`${m.account}/${m.entryKind}`, (byKind.get(`${m.account}/${m.entryKind}`) ?? 0) + 1);
  for (const [k, n] of byKind) console.log(`  ${k.padEnd(32)} ${n}`);

  if (!commit) {
    console.log('\nDry run — nothing written. Re-run with --commit to post.\n');
    return;
  }

  // One transaction per member: a member either migrates completely and
  // reconciles, or not at all.
  let failures = 0;
  for (const memberId of members) {
    const mine = mapped.filter((m) => m.memberId === memberId);
    try {
      await db.$transaction(async (tx) => {
        for (const m of mine) {
          await postEntry(tx, { ...m, createdByUserId: null });
        }
        const ledgerRows = await tx.ledgerEntry.findMany({
          where: { memberId, idempotencyKey: { startsWith: 'legacy:' } },
          select: { memberId: true, account: true, amountCents: true },
        });
        const diff = diffTotals(totalsByMemberAccount(mine), totalsByMemberAccount(ledgerRows));
        if (diff.length > 0) {
          throw new Error(`does not reconcile: ${JSON.stringify(diff)}`);
        }
        await recomputeBalance(tx, memberId);
      });
    } catch (err) {
      failures++;
      console.error(`  FAIL ${memberId}: ${(err as Error).message}`);
    }
  }

  // Members with no legacy rows still need a (zero) cached balance.
  const all = await db.member.findMany({ select: { id: true } });
  for (const m of all) {
    if (!members.has(m.id)) await db.$transaction((tx) => recomputeBalance(tx, m.id));
  }

  if (failures > 0) {
    console.error(`\n${failures} member(s) did not reconcile and were rolled back.\n`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nMigrated and reconciled ${members.size} members to the cent.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
