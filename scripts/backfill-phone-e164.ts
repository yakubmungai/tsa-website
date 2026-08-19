/**
 * Normalise Member.phone into Member.phoneE164.
 *
 *   npx tsx scripts/backfill-phone-e164.ts            # report only
 *   npx tsx scripts/backfill-phone-e164.ts --apply    # write
 *
 * Phone numbers become sign-in identities, so this never guesses. Anything that
 * does not parse confidently is reported for a human to fix, because a wrong
 * guess either locks a member out or points them at somebody else's account.
 *
 * It also reports handsets shared by more than one member. That is expected —
 * spouses share phones — and the sign-in flow asks which account is theirs. It
 * is listed so the office knows which members are affected.
 */
import { PrismaClient } from '@prisma/client';
import { parsePhone, describeParseFailure } from '../src/lib/phone';

const db = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const members = await db.member.findMany({
    where: { archivedAt: null },
    select: { id: true, names: true, phone: true, phoneE164: true },
    orderBy: { names: 'asc' },
  });

  const updates: { id: string; names: string; from: string; to: string }[] = [];
  const problems: { names: string; raw: string; reason: string }[] = [];
  const seen = new Map<string, string[]>();

  for (const member of members) {
    const result = parsePhone(member.phone);

    if (!result.ok) {
      problems.push({
        names: member.names,
        raw: member.phone ?? '(none)',
        reason: describeParseFailure(result.reason),
      });
      continue;
    }

    seen.set(result.e164, [...(seen.get(result.e164) ?? []), member.names]);

    if (member.phoneE164 !== result.e164) {
      updates.push({
        id: member.id,
        names: member.names,
        from: member.phone ?? '',
        to: result.e164,
      });
    }
  }

  console.log(`\n${members.length} active members examined.\n`);

  if (problems.length) {
    console.log(`NEEDS A HUMAN — ${problems.length} member(s) cannot sign in until fixed:`);
    for (const p of problems) {
      console.log(`  ${p.names.padEnd(26)} ${String(p.raw).padEnd(24)} ${p.reason}`);
    }
    console.log('');
  }

  const shared = [...seen.entries()].filter(([, names]) => names.length > 1);
  if (shared.length) {
    console.log(`SHARED HANDSETS — ${shared.length}. Sign-in will ask which account:`);
    for (const [number, names] of shared) {
      console.log(`  ${number.padEnd(18)} ${names.join(' | ')}`);
    }
    console.log('');
  }

  console.log(`${updates.length} member(s) would be updated.`);

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these values.\n');
    return;
  }

  let written = 0;
  for (const update of updates) {
    await db.member.update({ where: { id: update.id }, data: { phoneE164: update.to } });
    written++;
  }
  console.log(`\nUpdated ${written} member(s).`);

  // Existing logins need the same value, since sign-in matches on User.phoneE164.
  const linked = await db.$executeRaw`
    UPDATE "User" u
       SET "phoneE164" = m."phoneE164"
      FROM "Member" m
     WHERE u."memberId" = m."id"
       AND m."phoneE164" IS NOT NULL
       AND (u."phoneE164" IS DISTINCT FROM m."phoneE164")
  `;
  console.log(`Updated ${linked} linked user account(s).\n`);
}

main()
  .catch((err) => {
    console.error('\nBackfill failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
