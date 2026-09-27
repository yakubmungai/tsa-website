/**
 * Checks the cached balances against the raw ledger.
 *
 *   npm run verify:ledger
 *
 * MemberBalance is a cache, rebuilt inside every ledger write. This rebuilds
 * each one from scratch and reports any member whose cache has drifted — which
 * would mean some code path wrote to the ledger without going through
 * src/lib/finance/ledger.ts. Exits non-zero on drift.
 */
import { PrismaClient } from '@prisma/client';
import { computeStanding } from '../src/lib/finance/balance';
import { outstandingFrom } from '../src/lib/finance/ledger';
import { formatUSD } from '../src/lib/money';

const db = new PrismaClient();

async function main() {
  const members = await db.member.findMany({
    select: { id: true, names: true, balance: true, ledgerEntries: true },
  });
  let drift = 0;
  let missing = 0;
  for (const m of members) {
    if (!m.balance) {
      if (m.ledgerEntries.length > 0) {
        missing++;
        console.log(`  MISSING  ${m.names}: has entries but no cached balance`);
      }
      continue;
    }
    // Compare as of when the cache was built, so the demo time machine and
    // dues-year rollover do not read as drift.
    const s = computeStanding({ entries: m.ledgerEntries, joinedAt: null, asOf: m.balance.recomputedAt });
    const outstanding = outstandingFrom(m.ledgerEntries, m.balance.recomputedAt);
    const checks: [string, number, number][] = [
      ['net', s.netCents, m.balance.netCents],
      ['advance', s.advanceCents, m.balance.advanceCents],
      ['entry fee', s.entryFeeCents, m.balance.entryFeeCents],
      ['outstanding', outstanding, m.balance.outstandingCents],
    ];
    for (const [label, expected, cached] of checks) {
      if (expected !== cached) {
        drift++;
        console.log(`  DRIFT    ${m.names}: ${label} ledger ${formatUSD(expected)} vs cache ${formatUSD(cached)}`);
      }
    }
  }
  console.log(`\nChecked ${members.length} members: ${drift} drifted value(s), ${missing} missing cache(s).\n`);
  if (drift + missing > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
