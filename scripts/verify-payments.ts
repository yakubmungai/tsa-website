/**
 * Walks payments through the whole flow against the test database.
 *
 *   npm run verify:payments
 *
 * DELETES ALL DATA and reseeds the demo roster, so it refuses to run unless
 * DEMO_MODE is on and the site is not tansha.org.
 *
 *  - a case is announced; an overdrawn member owes their share
 *  - they report a Zelle payment ("Nimelipa"); nothing moves yet
 *  - the bank file is uploaded; the deposit matches the report
 *  - uploading the same file again adds nothing
 *  - confirming pays the share first, then what else is owed
 *  - confirming twice posts nothing twice
 *  - an unreported deposit is suggested to the right member
 *  - a pay link resolves, and a made-up one does not
 */
import { PrismaClient } from '@prisma/client';
import { clearAllData, seedDemoData } from '../src/features/demo/seed';
import { announceClaim, createClaimRow, loadShares, reviewClaim } from '../src/features/claims/service';
import { confirmPaymentTx, importBankStatement, mintPayLink, rematchBank, resolvePayLink } from '../src/features/payments/service';
import { getMemberStanding } from '../src/lib/finance/ledger';
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

function usDate(d: Date) {
  const [y, m, day] = orgIsoDate(d).split('-');
  return `${m}/${day}/${y}`;
}

async function main() {
  if (process.env.DEMO_MODE !== 'true') throw new Error('Refusing: DEMO_MODE is not "true". This deletes all data.');
  if (/tansha\.org/i.test(process.env.NEXT_PUBLIC_SITE_URL ?? '')) throw new Error('Refusing: points at tansha.org.');
  console.log('\nPayments verification\n');
  await clearAllData(db);
  await seedDemoData(db);
  const today = new Date();

  const amina = await db.member.findFirstOrThrow({ where: { names: 'Amina Hassan Mrisho' } });
  const daniel = await db.member.findFirstOrThrow({ where: { names: 'Daniel Kileo' } });
  const grace = await db.member.findFirstOrThrow({ where: { names: 'Grace Ndosi' } });

  const claim = await db.$transaction((tx) =>
    createClaimRow(tx, {
      memberId: amina.id,
      type: 'RELATIVE_DEATH',
      relationship: 'PARENT_GUARDIAN',
      subjectName: 'Zainabu Hassan',
      eventDate: addDays(today, -1),
      reportedAt: today,
      description: 'Verification case',
    })
  );
  const review = await reviewClaim(claim.id);
  await db.claim.update({
    where: { id: claim.id },
    data: { status: 'APPROVED', tierAtEvent: review.tierAtEvent, benefitCents: 300_000, levyPoolCents: 300_000 },
  });
  await announceClaim(claim.id, null);
  const share = (await loadShares({ claimId: claim.id, memberId: daniel.id }, new Date()))[0];
  check('the overdrawn member owes their share', share.outstandingCents > 0, formatUSD(share.outstandingCents));

  // ── Nimelipa ─────────────────────────────────────────────────────────────
  console.log('\nReport');
  const reported = await db.payment.create({
    data: {
      memberId: daniel.id,
      method: 'ZELLE',
      amountCents: 2000,
      paidOn: today,
      payerName: 'Daniel Kileo',
      source: 'portal',
    },
  });
  const before = await getMemberStanding(daniel.id);
  check('a reported payment does not change the balance', before.outstandingCents === share.outstandingCents);

  // ── Bank file ────────────────────────────────────────────────────────────
  console.log('\nBank statement');
  const csv = [
    `"${usDate(today)}","20.00","*","","ZELLE FROM DANIEL KILEO ON ${usDate(today).slice(0, 5)} REF # WFCT0VER1"`,
    `"${usDate(today)}","-12.00","*","","MONTHLY SERVICE FEE"`,
    `"${usDate(today)}","50.00","*","","ZELLE FROM GRACE NDOSI ON ${usDate(today).slice(0, 5)} REF # WFCT0VER2"`,
  ].join('\n');
  const first = await importBankStatement(csv, 'verify.csv', null);
  check('keeps the two deposits, skips the fee', first.newRows === 2 && first.skippedDebits === 1, JSON.stringify(first));
  check('matches the deposit to the report', first.matched === 1);
  check('suggests the unreported deposit to the right member', first.suggested === 1);
  const again = await importBankStatement(csv, 'verify.csv', null);
  check('uploading the same file again adds nothing', again.newRows === 0 && again.duplicates === 2);
  const matchedPayment = await db.payment.findUniqueOrThrow({ where: { id: reported.id } });
  check('the report is now MATCHED', matchedPayment.status === 'MATCHED', matchedPayment.status);
  const graceRow = await db.bankTransaction.findFirstOrThrow({ where: { senderName: 'GRACE NDOSI' } });
  check('the suggestion is Grace', graceRow.suggestedMemberId === grace.id);

  // ── Confirm ──────────────────────────────────────────────────────────────
  console.log('\nConfirm');
  const { allocations } = await db.$transaction((tx) => confirmPaymentTx(tx, reported.id, null));
  check('the share is paid first', allocations[0]?.target === 'SHARE' && allocations[0].amountCents === share.outstandingCents,
    JSON.stringify(allocations));
  const rest = 2000 - share.outstandingCents;
  // Daniel has dues paid but never paid the joining fee, so that is next.
  check('the rest goes to what is still owed — his joining fee', allocations.some((a) => a.target === 'ENTRY_FEE' && a.amountCents === rest),
    JSON.stringify(allocations));
  const after = await getMemberStanding(daniel.id);
  check('nothing is owed afterwards', after.outstandingCents === 0, formatUSD(after.outstandingCents));
  const entriesBefore = await db.ledgerEntry.count({ where: { paymentId: reported.id } });
  await db.$transaction((tx) => confirmPaymentTx(tx, reported.id, null));
  check('confirming twice posts nothing twice', (await db.ledgerEntry.count({ where: { paymentId: reported.id } })) === entriesBefore);

  await rematchBank();

  // ── Pay link ─────────────────────────────────────────────────────────────
  console.log('\nPay link');
  const token = await mintPayLink(daniel.id, null);
  const link = await resolvePayLink(token);
  check('a pay link resolves to its member', link?.member.id === daniel.id);
  check('a made-up token does not', (await resolvePayLink('A'.repeat(24))) === null);
  check('only a hash of the token is stored', (await db.payLink.count({ where: { tokenHash: token } })) === 0);

  console.log(`\n${passed} passed, ${failed} failed.\n`);
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
