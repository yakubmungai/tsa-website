/**
 * Walks cases through the whole engine against the test database.
 *
 *   npm run verify:claims
 *
 * DELETES ALL DATA and reseeds the demo roster first, so it refuses to run
 * unless DEMO_MODE is on and the site is not tansha.org — the same guard as
 * `npm run seed:demo`.
 *
 * Checks, in order:
 *  - a relative's death for a FULL-tier member suggests $3,000 with no flags
 *  - announcing splits $3,000 among the other members to the cent
 *  - members with savings are covered from their advance; one without is not
 *  - fifteen days on, that member's share is missed (Art 17.4 warning)
 *  - paying it clears the warning
 *  - a child's death for a REDUCED-tier member is $5,000, and a top-up made
 *    after the event date does not raise the tier (Art 18.9)
 *  - a payout is recorded against the case
 */
import { PrismaClient } from '@prisma/client';
import { clearAllData, seedDemoData } from '../src/features/demo/seed';
import {
  announceClaim,
  applyToShare,
  createClaimRow,
  loadShares,
  paidOutCents,
  reviewClaim,
} from '../src/features/claims/service';
import { countMissedContributions, getMemberStanding, recomputeBalance } from '../src/lib/finance/ledger';
import { addDays, orgIsoDate } from '../src/lib/finance/dates';
import { formatUSD } from '../src/lib/money';

const db = new PrismaClient();
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (ok) passed++;
  else failed++;
}

function assertSafe() {
  if (process.env.DEMO_MODE !== 'true') throw new Error('Refusing: DEMO_MODE is not "true". This deletes all data.');
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? '';
  if (/tansha\.org/i.test(url)) throw new Error(`Refusing: this environment points at ${url}.`);
}

async function approve(claimId: string) {
  const review = await reviewClaim(claimId);
  await db.claim.update({
    where: { id: claimId },
    data: {
      status: 'APPROVED',
      effectiveType: review.eligibility.effectiveType,
      tierAtEvent: review.tierAtEvent,
      standingAtEventCents: review.standingAtEventCents,
      benefitCents: review.eligibility.suggestedBenefitCents,
      levyPoolCents: review.eligibility.suggestedLevyPoolCents,
      approvedAt: new Date(),
    },
  });
  return review;
}

async function memberNamed(names: string) {
  return db.member.findFirstOrThrow({ where: { names } });
}

async function main() {
  assertSafe();
  console.log('\nClaims verification\n');
  await clearAllData(db);
  await seedDemoData(db);
  const today = new Date();

  // ── A relative's death, FULL tier ────────────────────────────────────────
  console.log("A relative's death for a member holding the $125");
  const amina = await memberNamed('Amina Hassan Mrisho');
  const c1 = await db.$transaction((tx) =>
    createClaimRow(tx, {
      memberId: amina.id,
      type: 'RELATIVE_DEATH',
      relationship: 'PARENT_GUARDIAN',
      subjectName: 'Zainabu Hassan',
      eventDate: addDays(today, -2),
      reportedAt: today,
      description: 'Verification case',
    })
  );
  const r1 = await approve(c1.id);
  check('tier on the event date is FULL', r1.tierAtEvent === 'FULL', r1.tierAtEvent);
  check('suggests $3,000', r1.eligibility.suggestedBenefitCents === 300_000, formatUSD(r1.eligibility.suggestedBenefitCents));
  check('raises no warnings', r1.eligibility.flags.filter((f) => f.severity === 'warning').length === 0,
    r1.eligibility.flags.map((f) => f.code).join(','));

  const { result: a1 } = await announceClaim(c1.id, null);
  const activeOthers = await db.member.count({ where: { status: 'ACTIVE', archivedAt: null, id: { not: amina.id } } });
  check('every other active member is charged', a1.payers === activeOthers, `${a1.payers} vs ${activeOthers}`);
  check('the shares add up to $3,000 exactly', a1.totalCents === 300_000, formatUSD(a1.totalCents));
  check('the claimant is not charged', (await db.assessment.count({ where: { claimId: c1.id, memberId: amina.id } })) === 0);

  const shares1 = await loadShares({ claimId: c1.id }, new Date());
  const baraka = await memberNamed('Baraka Mwakalinga');
  const daniel = await memberNamed('Daniel Kileo');
  const barakaShare = shares1.find((s) => s.memberId === baraka.id)!;
  const danielShare = shares1.find((s) => s.memberId === daniel.id)!;
  check('shares are about $19.61, as with the real roster', barakaShare.amountCents >= 1900 && barakaShare.amountCents <= 2100,
    formatUSD(barakaShare.amountCents));
  check('a member with savings is covered from their advance', barakaShare.state === 'PAID' && barakaShare.fromAdvanceCents === barakaShare.amountCents,
    `${barakaShare.state} ${barakaShare.fromAdvanceCents}`);
  check('an overdrawn member still owes the share', danielShare.state === 'OPEN' && danielShare.outstandingCents === danielShare.amountCents,
    `${danielShare.state} ${danielShare.outstandingCents}`);
  const barakaStanding = await getMemberStanding(baraka.id);
  check('the draw reduces the advance', barakaStanding.advanceCents === 15_000 - barakaShare.amountCents, formatUSD(barakaStanding.advanceCents));

  // ── Missed contribution, and clearing it ─────────────────────────────────
  console.log('\nMissed contributions (Art 17.4)');
  const later = addDays(today, 15);
  check('fifteen days on, the unpaid share counts as missed', (await countMissedContributions(daniel.id, later)) === 1);
  const warned = await getMemberStanding(daniel.id, { asOf: later });
  check('which gives a warning, not a Board referral', warned.hasWarning && !warned.needsBoardReferral);
  await db.$transaction(async (tx) => {
    await applyToShare(tx, {
      assessmentId: danielShare.id,
      amountCents: danielShare.amountCents,
      occurredAt: addDays(today, 16),
      userId: null,
      note: 'Zelle',
    });
    await recomputeBalance(tx, daniel.id);
  });
  check('paying what was missed clears it', (await countMissedContributions(daniel.id, addDays(today, 17))) === 0);

  // ── A child's death, REDUCED tier ────────────────────────────────────────
  console.log("\nA child's death for a member under $125");
  const neema = await memberNamed('Neema Kimaro');
  const eventDate = addDays(today, -1);
  // A top-up after the event: must not lift the tier for this case.
  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        memberId: neema.id,
        account: 'ADVANCE_DEPOSIT',
        entryKind: 'PAYMENT',
        amountCents: 10_000,
        description: 'Top-up after the event',
        occurredAt: today,
      },
    });
    await recomputeBalance(tx, neema.id);
  });
  const c2 = await db.$transaction((tx) =>
    createClaimRow(tx, {
      memberId: neema.id,
      type: 'CHILD_DEATH',
      relationship: 'CHILD',
      subjectName: 'Verification Child',
      subjectAge: 9,
      subjectLivesInUsa: true,
      eventDate,
      reportedAt: today,
      description: 'Verification case',
    })
  );
  const r2 = await approve(c2.id);
  check('tier is taken on the event date (REDUCED), not after the top-up', r2.tierAtEvent === 'REDUCED', r2.tierAtEvent);
  check('suggests $5,000', r2.eligibility.suggestedBenefitCents === 500_000, formatUSD(r2.eligibility.suggestedBenefitCents));
  check('the levy is scaled to the $5,000 paid', r2.eligibility.suggestedLevyPoolCents === 500_000);
  const { result: a2 } = await announceClaim(c2.id, null);
  check('the shares add up to $5,000 exactly', a2.totalCents === 500_000, formatUSD(a2.totalCents));

  // ── Announcing twice is refused ──────────────────────────────────────────
  let refused = false;
  try {
    await announceClaim(c2.id, null);
  } catch {
    refused = true;
  }
  check('a case cannot be announced twice', refused);

  // ── Payout ───────────────────────────────────────────────────────────────
  console.log('\nPayout');
  await db.ledgerEntry.create({
    data: {
      memberId: neema.id,
      account: 'BENEFIT_PAYOUT',
      entryKind: 'PAYOUT',
      amountCents: -500_000,
      description: 'Verification payout',
      occurredAt: today,
      caseEventId: c2.id,
    },
  });
  check('the payout is counted against the case', (await paidOutCents(c2.id)) === 500_000);
  const neemaAfter = await getMemberStanding(neema.id);
  check("and reported as received, not taken from the member's savings", neemaAfter.receivedCents === 500_000 && neemaAfter.advanceCents >= 0,
    `${neemaAfter.receivedCents} ${neemaAfter.advanceCents}`);

  console.log(`\n${passed} passed, ${failed} failed (as of ${orgIsoDate(today)}).\n`);
  // Leave the demo tidy for whoever uses it next.
  await clearAllData(db);
  await seedDemoData(db);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
