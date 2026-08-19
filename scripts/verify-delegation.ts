/**
 * Checks the security properties of delegated access.
 *
 *   npx tsx --conditions=react-server scripts/verify-delegation.ts
 *
 * The property that matters most is instant revocation: a helper who has been
 * removed must lose access on their very next request, not whenever their token
 * happens to expire.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  ok ? passed++ : failed++;
}

/**
 * The same validity rule getEffectiveContext applies on every request.
 * Kept in step deliberately: this is what the test is asserting.
 */
async function actingSessionResolves(actingSessionId: string, userId: string) {
  const acting = await db.actingSession.findUnique({
    where: { id: actingSessionId },
    include: { delegation: { include: { ownerMember: { select: { archivedAt: true } } } } },
  });
  return Boolean(
    acting &&
      acting.actorUserId === userId &&
      acting.endedAt === null &&
      acting.expiresAt > new Date() &&
      acting.delegation.status === 'ACTIVE' &&
      (acting.delegation.expiresAt === null || acting.delegation.expiresAt > new Date()) &&
      !acting.delegation.ownerMember.archivedAt
  );
}

async function main() {
  console.log('\nDelegated access verification\n');

  const owner = await db.member.findFirst({ where: { names: { contains: 'Zawadi' } } });
  const helperMember = await db.member.findFirst({ where: { names: { contains: 'Upendo' } } });
  const stranger = await db.member.findFirst({ where: { names: { contains: 'Amina' } } });
  if (!owner || !helperMember || !stranger) throw new Error('Run `npm run seed:demo` first.');

  const helperUser = await db.user.findFirst({ where: { memberId: helperMember.id } });
  if (!helperUser) throw new Error('Demo helper account missing.');

  // Clean slate
  await db.actingSession.deleteMany({ where: { actorUserId: helperUser.id } });
  await db.delegation.deleteMany({ where: { ownerMemberId: owner.id } });

  // ── Grant ────────────────────────────────────────────────────────────────
  console.log('Granting access');
  const delegation = await db.delegation.create({
    data: {
      ownerMemberId: owner.id,
      delegatePhoneE164: helperMember.phoneE164!,
      delegateUserId: helperUser.id,
      delegateName: helperMember.names,
      relationship: 'binti / daughter',
      permissions: ['VIEW_FINANCES', 'SUBMIT_FORMS'],
      status: 'ACTIVE',
      origin: 'SELF_SERVICE',
      ownerConsentAt: new Date(),
      ownerConsentMethod: 'PHONE_CODE',
    },
  });
  check('a grant records which permissions were given', delegation.permissions.length === 2);
  check(
    'permissions not granted are absent',
    !delegation.permissions.includes('MAKE_PAYMENTS') &&
      !delegation.permissions.includes('EDIT_PROFILE')
  );

  const acting = await db.actingSession.create({
    data: {
      delegationId: delegation.id,
      actorUserId: helperUser.id,
      ownerMemberId: owner.id,
      expiresAt: new Date(Date.now() + 8 * 60 * 60_000),
    },
  });
  check('the helper can act on the account', await actingSessionResolves(acting.id, helperUser.id));

  // ── Isolation ────────────────────────────────────────────────────────────
  console.log('\nIsolation');
  const otherUser = await db.user.findFirst({
    where: { memberId: stranger.id, id: { not: helperUser.id } },
  });
  if (otherUser) {
    check(
      'another signed-in user cannot use this acting session',
      !(await actingSessionResolves(acting.id, otherUser.id))
    );
  }
  check(
    'an unknown acting session id resolves to nothing',
    !(await actingSessionResolves('00000000-0000-0000-0000-000000000000', helperUser.id))
  );

  const strangerDelegations = await db.delegation.count({
    where: { delegateUserId: helperUser.id, ownerMemberId: stranger.id },
  });
  check('the helper holds no grant over an unrelated member', strangerDelegations === 0);

  // ── Revocation is immediate ──────────────────────────────────────────────
  console.log('\nRevocation');
  await db.$transaction(async (tx) => {
    await tx.delegation.update({
      where: { id: delegation.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await tx.actingSession.updateMany({
      where: { delegationId: delegation.id, endedAt: null },
      data: { endedAt: new Date(), endedReason: 'REVOKED' },
    });
  });

  check(
    'access ends on the next request, with no token change',
    !(await actingSessionResolves(acting.id, helperUser.id))
  );

  const helperStillExists = await db.user.findUnique({ where: { id: helperUser.id } });
  check(
    'revoking does not sign the helper out of their own account',
    helperStillExists !== null && helperStillExists.memberId === helperMember.id
  );

  // ── Expiry ───────────────────────────────────────────────────────────────
  console.log('\nExpiry');
  const expiredDelegation = await db.delegation.create({
    data: {
      ownerMemberId: owner.id,
      delegatePhoneE164: '+17135550190',
      delegateUserId: helperUser.id,
      delegateName: 'Expired Helper',
      permissions: ['VIEW_FINANCES'],
      status: 'ACTIVE',
      origin: 'SELF_SERVICE',
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const expiredActing = await db.actingSession.create({
    data: {
      delegationId: expiredDelegation.id,
      actorUserId: helperUser.id,
      ownerMemberId: owner.id,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  check(
    'an expired grant stops working even with an open session',
    !(await actingSessionResolves(expiredActing.id, helperUser.id))
  );

  const staleActing = await db.actingSession.create({
    data: {
      delegationId: delegation.id,
      actorUserId: helperUser.id,
      ownerMemberId: owner.id,
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  check(
    'a stale acting session stops working',
    !(await actingSessionResolves(staleActing.id, helperUser.id))
  );

  // ── Archived owner ───────────────────────────────────────────────────────
  console.log('\nArchived member');
  const liveDelegation = await db.delegation.create({
    data: {
      ownerMemberId: stranger.id,
      delegatePhoneE164: '+17135550191',
      delegateUserId: helperUser.id,
      delegateName: 'Helper',
      permissions: ['VIEW_FINANCES'],
      status: 'ACTIVE',
      origin: 'SELF_SERVICE',
    },
  });
  const liveActing = await db.actingSession.create({
    data: {
      delegationId: liveDelegation.id,
      actorUserId: helperUser.id,
      ownerMemberId: stranger.id,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  check('access works while the member is active', await actingSessionResolves(liveActing.id, helperUser.id));

  await db.member.update({ where: { id: stranger.id }, data: { archivedAt: new Date() } });
  check(
    'archiving the member ends delegated access',
    !(await actingSessionResolves(liveActing.id, helperUser.id))
  );
  await db.member.update({ where: { id: stranger.id }, data: { archivedAt: null } });

  // ── Consent trail ────────────────────────────────────────────────────────
  console.log('\nConsent trail');
  const provisioned = await db.delegation.create({
    data: {
      ownerMemberId: owner.id,
      delegatePhoneE164: '+17135550192',
      delegateName: 'Office Helper',
      permissions: ['VIEW_FINANCES'],
      status: 'ACTIVE',
      origin: 'ADMIN_PROVISIONED',
      authorizationNote: 'Signed paper form at the March meeting',
      ownerConsentAt: new Date(),
      ownerConsentMethod: 'IN_PERSON',
    },
  });
  check(
    'an office-created grant records how consent was given',
    provisioned.authorizationNote !== null && provisioned.ownerConsentMethod === 'IN_PERSON'
  );
  check(
    'a grant can exist before the helper has an account',
    provisioned.delegateUserId === null
  );

  // clean up
  await db.actingSession.deleteMany({ where: { actorUserId: helperUser.id } });
  await db.delegation.deleteMany({
    where: { id: { in: [delegation.id, expiredDelegation.id, liveDelegation.id, provisioned.id] } },
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('\nVerification error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
