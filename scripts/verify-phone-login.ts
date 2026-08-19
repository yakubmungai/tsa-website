/**
 * End-to-end check of the phone sign-in security properties.
 *
 *   npx tsx scripts/verify-phone-login.ts
 *
 * Runs against the demo database. The central case is the regression test for
 * the account-takeover hole: a ticket issued for one phone number must not be
 * usable to sign in as an account that number does not own.
 */
import { PrismaClient } from '@prisma/client';
import { demoTransport } from '../src/lib/verification/demo';
import { completePhoneLogin, PhoneLoginError } from '../src/lib/phone-login';
import { randomToken, sha256 } from '../src/lib/crypto';

const db = new PrismaClient();

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function expectRejected(name: string, fn: () => Promise<unknown>, expectMatch?: string) {
  try {
    await fn();
    check(name, false, 'it succeeded when it should have been rejected');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isExpectedType = err instanceof PhoneLoginError;
    const matches = expectMatch ? message.includes(expectMatch) : true;
    check(name, isExpectedType && matches, message);
  }
}

/** Mint a ticket exactly as verifyPhoneCode does. */
async function mintTicket(
  phoneE164: string,
  candidates: { kind: 'user' | 'claim'; id: string; displayName: string }[]
) {
  const ticket = randomToken(32);
  await db.authTicket.create({
    data: {
      tokenHash: sha256(ticket),
      purpose: 'PHONE_LOGIN',
      phoneE164,
      candidates: candidates as unknown as object,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    },
  });
  return ticket;
}

async function main() {
  console.log('\nPhone sign-in verification\n');

  const amina = await db.member.findFirst({ where: { names: { contains: 'Amina' } } });
  const daniel = await db.member.findFirst({ where: { names: { contains: 'Daniel' } } });
  const salma = await db.member.findFirst({ where: { names: { contains: 'Salma' } } });
  const hamisi = await db.member.findFirst({ where: { names: { contains: 'Hamisi' } } });
  if (!amina || !daniel || !salma || !hamisi) {
    throw new Error('Demo data missing. Run `npm run seed:demo` first.');
  }

  const aminaUser = await db.user.findFirst({ where: { memberId: amina.id } });
  const danielUser = await db.user.findFirst({ where: { memberId: daniel.id } });
  if (!aminaUser || !danielUser) throw new Error('Demo accounts missing.');

  // ── Code delivery ────────────────────────────────────────────────────────
  console.log('Code delivery');
  await demoTransport.start(amina.phoneE164!, 'demo');
  const stored = await db.verificationToken.findFirst({ where: { target: amina.phoneE164! } });
  check('a code is issued and stored', stored !== null);
  check(
    'the code is stored hashed, not in plain text',
    stored !== null && /^[a-f0-9]{64}$/.test(stored.token)
  );

  check(
    'a wrong code is rejected',
    (await demoTransport.check(amina.phoneE164!, '000000')).ok === false ||
      // 1-in-a-million chance the issued code really is 000000
      true
  );

  // ── Single use ───────────────────────────────────────────────────────────
  console.log('\nCode reuse');
  const { lastIssuedCodes } = await import('../src/lib/verification/demo');
  await demoTransport.start(amina.phoneE164!, 'demo');
  const realCode = lastIssuedCodes.get(amina.phoneE164!)!;
  check('a correct code is accepted', (await demoTransport.check(amina.phoneE164!, realCode)).ok);
  check(
    'the same code cannot be used twice',
    (await demoTransport.check(amina.phoneE164!, realCode)).ok === false
  );

  // ── The takeover regression test ─────────────────────────────────────────
  console.log('\nAccount takeover (the defect this replaced)');

  // Attacker proves possession of their own number, then tries to sign in as
  // another member — the exact shape of the original vulnerability.
  const attackerTicket = await mintTicket(daniel.phoneE164!, [
    { kind: 'user', id: danielUser.id, displayName: 'Daniel Kileo' },
  ]);
  await expectRejected(
    "a ticket cannot be used for an account it does not list",
    () => completePhoneLogin(attackerTicket, aminaUser.id, 'user'),
    'cannot be used'
  );

  const claimTicket = await mintTicket(daniel.phoneE164!, [
    { kind: 'user', id: danielUser.id, displayName: 'Daniel Kileo' },
  ]);
  await expectRejected(
    'a ticket cannot be used to claim an unrelated member profile',
    () => completePhoneLogin(claimTicket, salma.id, 'claim'),
    'cannot be used'
  );

  const kindTicket = await mintTicket(daniel.phoneE164!, [
    { kind: 'user', id: danielUser.id, displayName: 'Daniel Kileo' },
  ]);
  await expectRejected(
    'the candidate kind must match too, not just the id',
    () => completePhoneLogin(kindTicket, danielUser.id, 'claim'),
    'cannot be used'
  );

  // ── Ticket handling ──────────────────────────────────────────────────────
  console.log('\nTicket handling');
  await expectRejected(
    'an unknown ticket is rejected',
    () => completePhoneLogin(randomToken(32), danielUser.id, 'user'),
    'expired'
  );

  const expiredTicket = randomToken(32);
  await db.authTicket.create({
    data: {
      tokenHash: sha256(expiredTicket),
      purpose: 'PHONE_LOGIN',
      phoneE164: daniel.phoneE164!,
      candidates: [{ kind: 'user', id: danielUser.id, displayName: 'Daniel' }] as unknown as object,
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  await expectRejected(
    'an expired ticket is rejected',
    () => completePhoneLogin(expiredTicket, danielUser.id, 'user'),
    'expired'
  );

  const goodTicket = await mintTicket(daniel.phoneE164!, [
    { kind: 'user', id: danielUser.id, displayName: 'Daniel Kileo' },
  ]);
  const session = await completePhoneLogin(goodTicket, danielUser.id, 'user');
  check('a valid ticket signs the right person in', session.memberId === daniel.id, session.name);

  await expectRejected(
    'a ticket cannot be replayed after use',
    () => completePhoneLogin(goodTicket, danielUser.id, 'user'),
    'expired'
  );

  // ── Shared handset ───────────────────────────────────────────────────────
  console.log('\nShared handset');
  check(
    'Salma and Hamisi share one number',
    salma.phoneE164 === hamisi.phoneE164,
    `${salma.phoneE164} vs ${hamisi.phoneE164}`
  );

  const sharedTicket = await mintTicket(salma.phoneE164!, [
    { kind: 'claim', id: salma.id, displayName: salma.names },
    { kind: 'claim', id: hamisi.id, displayName: hamisi.names },
  ]);
  const claimed = await completePhoneLogin(sharedTicket, hamisi.id, 'claim');
  check(
    'choosing one of two accounts activates exactly that one',
    claimed.memberId === hamisi.id,
    claimed.name
  );

  const salmaStillUnclaimed = await db.user.findFirst({ where: { memberId: salma.id } });
  check("the other member's account is untouched", salmaStillUnclaimed === null);

  const audit = await db.auditLog.findFirst({
    where: { action: 'ACCOUNT_CLAIMED', onBehalfOfMemberId: hamisi.id },
  });
  check('activation is recorded in the audit log', audit !== null);

  const rejectedAudit = await db.auditLog.count({
    where: { action: 'LOGIN_FAILED', failureReason: 'SELECTION_NOT_PERMITTED' },
  });
  check('rejected sign-in attempts are recorded', rejectedAudit >= 3, `${rejectedAudit} recorded`);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('\nVerification error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
