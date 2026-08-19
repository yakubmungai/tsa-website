import 'server-only';
import { db } from './db';
import { sha256 } from './crypto';
import { writeAudit } from './audit';

/**
 * Consuming a phone-login ticket.
 *
 * Split out of the auth config so it can be reasoned about and tested on its
 * own — this is the step that decides whose account someone gets.
 */

export interface TicketCandidate {
  kind: 'user' | 'claim';
  id: string;
  displayName: string;
}

interface AuthTicketRow {
  id: string;
  phoneE164: string;
  candidates: TicketCandidate[];
}

export class PhoneLoginError extends Error {}

/**
 * Atomically consume a ticket.
 *
 * A single conditional UPDATE, so two concurrent requests cannot both claim the
 * same ticket: the second matches no rows because `consumedAt` is already set.
 */
async function consumeTicket(rawTicket: string): Promise<AuthTicketRow> {
  const rows = await db.$queryRaw<AuthTicketRow[]>`
    UPDATE "AuthTicket"
       SET "consumedAt" = now()
     WHERE "tokenHash" = ${sha256(rawTicket)}
       AND "consumedAt" IS NULL
       AND "expiresAt" > now()
       AND "purpose" = 'PHONE_LOGIN'
    RETURNING "id", "phoneE164", "candidates"
  `;

  const ticket = rows[0];
  if (!ticket) {
    throw new PhoneLoginError('Your sign-in request has expired. Please start again.');
  }
  return ticket;
}

export interface PhoneLoginUser {
  id: string;
  email: string | null;
  role: string;
  memberId: string | null;
  name: string;
  sessionVersion: number;
}

/**
 * Exchange a verified ticket and a chosen account for a session user.
 *
 * @param selectionId   which candidate the caller picked
 * @param selectionKind whether that candidate is an existing login or a claim
 */
export async function completePhoneLogin(
  rawTicket: string,
  selectionId: string,
  selectionKind: 'user' | 'claim'
): Promise<PhoneLoginUser> {
  const ticket = await consumeTicket(rawTicket);

  // ── The check that closes the account-takeover hole ──────────────────────
  // The caller may only pick from the list the server recorded when it verified
  // the code. Previously the client supplied the member id outright, so knowing
  // someone's phone number was enough to claim their profile and ledger.
  const permitted = ticket.candidates.some(
    (candidate) => candidate.id === selectionId && candidate.kind === selectionKind
  );
  if (!permitted) {
    await writeAudit({
      action: 'LOGIN_FAILED',
      entityType: 'AuthTicket',
      entityId: ticket.id,
      summary: 'Sign-in selection was not among the verified candidates',
      success: false,
      failureReason: 'SELECTION_NOT_PERMITTED',
      metadata: { selectionId, selectionKind },
      actor: { label: 'anonymous', role: 'ANON' },
    });
    throw new PhoneLoginError('That account cannot be used with this sign-in request.');
  }

  return selectionKind === 'claim'
    ? claimMemberAccount(selectionId, ticket.phoneE164)
    : signInExistingUser(selectionId, ticket.phoneE164);
}

/** Sign in to an account that already exists. */
async function signInExistingUser(userId: string, phoneE164: string): Promise<PhoneLoginUser> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: { select: { names: true, archivedAt: true } } },
  });

  // Re-assert the binding: the account must still use the number that was
  // verified. A phone change between issuing and using a ticket invalidates it.
  if (!user || user.phoneE164 !== phoneE164) {
    throw new PhoneLoginError('That account cannot be used with this sign-in request.');
  }
  if (user.member?.archivedAt) {
    throw new PhoneLoginError('This membership is no longer active. Please contact a TSA leader.');
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await writeAudit({
    action: 'LOGIN_SUCCEEDED',
    entityType: 'User',
    entityId: user.id,
    onBehalfOfMemberId: user.memberId,
    summary: `Signed in by phone code`,
    metadata: { method: 'phone-otp' },
    actor: { userId: user.id, label: user.email ?? user.id, role: user.role },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    memberId: user.memberId,
    name: user.member?.names ?? user.email ?? 'TSA member',
    sessionVersion: user.sessionVersion,
  };
}

/**
 * Activate an account for a member who has never had one.
 *
 * Proof of identity is possession of a phone number already on TSA's roster.
 * That is the only proof available — the roster holds no emails — and it is the
 * same standard a bank uses for a password reset. It is not proof against a SIM
 * swap or a recycled number, so an activation is announced in the audit log for
 * the secretary, who personally knows every member.
 */
async function claimMemberAccount(memberId: string, phoneE164: string): Promise<PhoneLoginUser> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true } } },
  });

  if (!member || member.archivedAt || member.phoneE164 !== phoneE164) {
    throw new PhoneLoginError('That account cannot be used with this sign-in request.');
  }
  if (member.user) {
    throw new PhoneLoginError('This member already has an account. Please sign in instead.');
  }

  try {
    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: null,
          passwordHash: null,
          role: 'MEMBER',
          memberId: member.id,
          phoneE164,
          phoneVerifiedAt: new Date(),
          claimedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

      await writeAudit({
        tx,
        action: 'ACCOUNT_CLAIMED',
        entityType: 'User',
        entityId: user.id,
        onBehalfOfMemberId: member.id,
        summary: `${member.names} activated their portal account by phone`,
        metadata: { memberId: member.id, phoneE164 },
        actor: { userId: user.id, label: member.names, role: 'MEMBER' },
      });

      return user;
    });

    return {
      id: created.id,
      email: null,
      role: created.role,
      memberId: created.memberId,
      name: member.names,
      sessionVersion: created.sessionVersion,
    };
  } catch (err) {
    // User.memberId is unique, so a concurrent double-claim fails here rather
    // than producing two accounts for one member.
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      throw new PhoneLoginError('This member already has an account. Please sign in instead.');
    }
    throw err;
  }
}
