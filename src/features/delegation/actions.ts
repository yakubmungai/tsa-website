'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { DelegationPermission } from '@prisma/client';
import { db } from '@/lib/db';
import { defineAction, actionError } from '@/lib/action';
import { phoneSchema, otpCodeSchema } from '@/lib/validations';
import { writeAudit } from '@/lib/audit';
import { getEffectiveContext } from '@/lib/session';
import { getTransport, isCodeVisibleOnScreen, lastIssuedCodes } from '@/lib/verification';
import { consume, POLICIES } from '@/lib/rate-limit';

/**
 * Delegated access — "msaidizi".
 *
 * Some members already have a relative handling their TSA affairs. Without a
 * sanctioned way to do it, that happens by sharing a login, which leaves no
 * record of who actually did what.
 *
 * Two routes in, because the members who most need a helper are the least
 * likely to set one up themselves:
 *
 *  - self-service: the member grants access and approves with a code sent to
 *    their own phone
 *  - admin-provisioned: an officer sets it up and must record how the member
 *    authorised it. The member is notified either way.
 */

const PERMISSIONS = [
  'VIEW_FINANCES',
  'MAKE_PAYMENTS',
  'SUBMIT_FORMS',
  'EDIT_PROFILE',
] as const satisfies readonly DelegationPermission[];

const ACTING_SESSION_HOURS = 8;
const DEFAULT_EXPIRY_MONTHS = 12;

function monthsFromNow(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

/** A member grants someone access to their own account. */
export const requestDelegation = defineAction({
  name: 'requestDelegation',
  guard: 'auth',
  schema: z
    .object({
      delegateName: z.string().trim().min(2, 'Enter their name').max(120),
      delegatePhone: phoneSchema,
      relationship: z.string().trim().max(60).optional(),
      permissions: z.array(z.enum(PERMISSIONS)).min(1, 'Choose at least one thing they can do'),
    })
    .strict(),
  async handler(input, ctx): Promise<{ delegationId: string; codeVisible: boolean; demoCode?: string }> {
    const owner = await db.member.findUnique({
      where: { id: ctx.memberId ?? '' },
      select: { id: true, names: true, phoneE164: true, archivedAt: true },
    });
    if (!owner || owner.archivedAt) actionError('Your member profile could not be found.');
    if (!owner.phoneE164) {
      actionError('We need a phone number on your record before you can add a helper.');
    }
    if (owner.phoneE164 === input.delegatePhone) {
      actionError('That is your own number. Enter the number of the person helping you.');
    }

    const existing = await db.delegation.findUnique({
      where: {
        ownerMemberId_delegatePhoneE164: {
          ownerMemberId: owner.id,
          delegatePhoneE164: input.delegatePhone,
        },
      },
    });
    if (existing && existing.status === 'ACTIVE') {
      actionError('That person already has access to your account.');
    }

    const delegation = await db.delegation.upsert({
      where: {
        ownerMemberId_delegatePhoneE164: {
          ownerMemberId: owner.id,
          delegatePhoneE164: input.delegatePhone,
        },
      },
      create: {
        ownerMemberId: owner.id,
        delegatePhoneE164: input.delegatePhone,
        delegateName: input.delegateName,
        relationship: input.relationship ?? null,
        permissions: input.permissions,
        status: 'PENDING_OWNER_APPROVAL',
        origin: 'SELF_SERVICE',
        createdByUserId: ctx.userId,
        expiresAt: monthsFromNow(DEFAULT_EXPIRY_MONTHS),
      },
      update: {
        delegateName: input.delegateName,
        relationship: input.relationship ?? null,
        permissions: input.permissions,
        status: 'PENDING_OWNER_APPROVAL',
        origin: 'SELF_SERVICE',
        revokedAt: null,
        revokedReason: null,
        expiresAt: monthsFromNow(DEFAULT_EXPIRY_MONTHS),
      },
      select: { id: true },
    });

    // The code goes to the number already on the member's record, never to a
    // number typed into this form. A hijacked session still cannot grant access
    // without the member's own handset.
    const limit = await consume(POLICIES.otpSendPhone, owner.phoneE164);
    if (!limit.allowed) actionError('Too many attempts. Please wait a few minutes.');

    const transport = getTransport();
    const sent = await transport.start(owner.phoneE164, transport.channels[0]);
    if (!sent.ok) actionError('We could not send your confirmation code. Please try again.');

    const codeVisible = isCodeVisibleOnScreen();
    return {
      delegationId: delegation.id,
      codeVisible,
      demoCode: codeVisible ? lastIssuedCodes.get(owner.phoneE164) : undefined,
    };
  },
});

/** The member confirms with the code sent to their own phone. */
export const approveDelegation = defineAction({
  name: 'approveDelegation',
  guard: 'auth',
  schema: z.object({ delegationId: z.string().uuid(), code: otpCodeSchema }).strict(),
  async handler(input, ctx): Promise<{ delegationId: string }> {
    const delegation = await db.delegation.findUnique({
      where: { id: input.delegationId },
      include: { ownerMember: { select: { id: true, names: true, phoneE164: true } } },
    });
    if (!delegation || delegation.ownerMemberId !== ctx.memberId) {
      actionError('That request could not be found.');
    }
    if (!delegation.ownerMember.phoneE164) actionError('No phone number on your record.');

    const limit = await consume(POLICIES.otpCheckPhone, delegation.ownerMember.phoneE164);
    if (!limit.allowed) actionError('Too many attempts. Please wait a few minutes.');

    const result = await getTransport().check(delegation.ownerMember.phoneE164, input.code);
    if (!result.ok) actionError('That code is not correct. Please check and try again.');

    await db.$transaction(async (tx) => {
      await tx.delegation.update({
        where: { id: delegation.id },
        data: {
          status: 'ACTIVE',
          ownerConsentAt: new Date(),
          ownerConsentMethod: 'PHONE_CODE',
        },
      });
      await writeAudit({
        tx,
        action: 'DELEGATION_GRANTED',
        entityType: 'Delegation',
        entityId: delegation.id,
        onBehalfOfMemberId: delegation.ownerMemberId,
        summary: `${delegation.ownerMember.names} gave ${delegation.delegateName} access to their account`,
        metadata: { permissions: delegation.permissions, origin: delegation.origin },
      });
    });

    revalidatePath('/portal/access');
    return { delegationId: delegation.id };
  },
});

/** An officer sets up a helper for a member who does not use the portal. */
export const provisionDelegation = defineAction({
  name: 'provisionDelegation',
  guard: 'admin',
  schema: z
    .object({
      ownerMemberId: z.string().uuid(),
      delegateName: z.string().trim().min(2).max(120),
      delegatePhone: phoneSchema,
      relationship: z.string().trim().max(60).optional(),
      permissions: z.array(z.enum(PERMISSIONS)).min(1),
      /** Required: how the member authorised this, offline. */
      authorizationNote: z
        .string()
        .trim()
        .min(10, 'Record how the member authorised this — it is the only consent record'),
    })
    .strict(),
  async handler(input, ctx): Promise<{ delegationId: string }> {
    const owner = await db.member.findUnique({
      where: { id: input.ownerMemberId },
      select: { id: true, names: true, archivedAt: true },
    });
    if (!owner || owner.archivedAt) actionError('Member not found.');

    const delegation = await db.$transaction(async (tx) => {
      const row = await tx.delegation.upsert({
        where: {
          ownerMemberId_delegatePhoneE164: {
            ownerMemberId: owner.id,
            delegatePhoneE164: input.delegatePhone,
          },
        },
        create: {
          ownerMemberId: owner.id,
          delegatePhoneE164: input.delegatePhone,
          delegateName: input.delegateName,
          relationship: input.relationship ?? null,
          permissions: input.permissions,
          status: 'ACTIVE',
          origin: 'ADMIN_PROVISIONED',
          createdByUserId: ctx.userId,
          authorizedByUserId: ctx.userId,
          authorizationNote: input.authorizationNote,
          ownerConsentAt: new Date(),
          ownerConsentMethod: 'IN_PERSON',
          expiresAt: monthsFromNow(DEFAULT_EXPIRY_MONTHS),
        },
        update: {
          delegateName: input.delegateName,
          relationship: input.relationship ?? null,
          permissions: input.permissions,
          status: 'ACTIVE',
          origin: 'ADMIN_PROVISIONED',
          authorizedByUserId: ctx.userId,
          authorizationNote: input.authorizationNote,
          ownerConsentAt: new Date(),
          ownerConsentMethod: 'IN_PERSON',
          revokedAt: null,
          revokedReason: null,
          expiresAt: monthsFromNow(DEFAULT_EXPIRY_MONTHS),
        },
        select: { id: true },
      });

      await writeAudit({
        tx,
        action: 'DELEGATION_GRANTED',
        entityType: 'Delegation',
        entityId: row.id,
        onBehalfOfMemberId: owner.id,
        summary: `Office gave ${input.delegateName} access to ${owner.names}'s account`,
        metadata: {
          permissions: input.permissions,
          origin: 'ADMIN_PROVISIONED',
          authorizationNote: input.authorizationNote,
        },
      });

      return row;
    });

    revalidatePath(`/admin/members/${owner.id}`);
    return { delegationId: delegation.id };
  },
});

/** Begin acting on another member's behalf. */
export const startActingAs = defineAction({
  name: 'startActingAs',
  guard: 'auth',
  schema: z.object({ delegationId: z.string().uuid() }).strict(),
  async handler(input, ctx): Promise<{ actingSessionId: string; ownerName: string }> {
    const delegation = await db.delegation.findUnique({
      where: { id: input.delegationId },
      include: { ownerMember: { select: { id: true, names: true, archivedAt: true } } },
    });

    if (
      !delegation ||
      delegation.delegateUserId !== ctx.userId ||
      delegation.status !== 'ACTIVE' ||
      delegation.ownerMember.archivedAt ||
      (delegation.expiresAt && delegation.expiresAt < new Date())
    ) {
      actionError('You do not have access to that account.');
    }

    const expiresAt = new Date(Date.now() + ACTING_SESSION_HOURS * 60 * 60_000);
    const acting = await db.actingSession.create({
      data: {
        delegationId: delegation.id,
        actorUserId: ctx.userId,
        ownerMemberId: delegation.ownerMemberId,
        expiresAt: delegation.expiresAt && delegation.expiresAt < expiresAt
          ? delegation.expiresAt
          : expiresAt,
      },
      select: { id: true },
    });

    await writeAudit({
      action: 'ACTING_SESSION_STARTED',
      entityType: 'ActingSession',
      entityId: acting.id,
      onBehalfOfMemberId: delegation.ownerMemberId,
      summary: `Started acting on behalf of ${delegation.ownerMember.names}`,
    });

    return { actingSessionId: acting.id, ownerName: delegation.ownerMember.names };
  },
});

/** Stop acting on someone's behalf. */
export const stopActingAs = defineAction({
  name: 'stopActingAs',
  guard: 'auth',
  schema: z.object({}).strict(),
  async handler(_input, ctx): Promise<{ stopped: number }> {
    const { count } = await db.actingSession.updateMany({
      where: { actorUserId: ctx.userId, endedAt: null },
      data: { endedAt: new Date(), endedReason: 'USER_EXIT' },
    });
    return { stopped: count };
  },
});

/**
 * Revoke access.
 *
 * Permitted to the account owner, any admin, or the delegate removing
 * themselves. Open acting sessions are closed in the same transaction, so the
 * delegate loses access on their next request — while remaining signed in to
 * their own account.
 */
export const revokeDelegation = defineAction({
  name: 'revokeDelegation',
  guard: 'auth',
  schema: z
    .object({ delegationId: z.string().uuid(), reason: z.string().trim().max(300).optional() })
    .strict(),
  async handler(input, ctx): Promise<{ delegationId: string }> {
    const delegation = await db.delegation.findUnique({
      where: { id: input.delegationId },
      include: { ownerMember: { select: { names: true } } },
    });
    if (!delegation) actionError('That access grant could not be found.');

    const permitted =
      ctx.role === 'ADMIN' ||
      delegation.ownerMemberId === ctx.memberId ||
      delegation.delegateUserId === ctx.userId;
    if (!permitted) actionError('You cannot change that access grant.');

    await db.$transaction(async (tx) => {
      await tx.delegation.update({
        where: { id: delegation.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedByUserId: ctx.userId,
          revokedReason: input.reason ?? null,
        },
      });

      // Close any open acting sessions immediately.
      await tx.actingSession.updateMany({
        where: { delegationId: delegation.id, endedAt: null },
        data: { endedAt: new Date(), endedReason: 'REVOKED' },
      });

      await writeAudit({
        tx,
        action: 'DELEGATION_REVOKED',
        entityType: 'Delegation',
        entityId: delegation.id,
        onBehalfOfMemberId: delegation.ownerMemberId,
        summary: `Removed ${delegation.delegateName}'s access to ${delegation.ownerMember.names}'s account`,
        metadata: { reason: input.reason ?? null },
      });
    });

    revalidatePath('/portal/access');
    revalidatePath('/portal');
    return { delegationId: delegation.id };
  },
});

/**
 * Link pending invitations to the signed-in user by phone number.
 *
 * Called after sign-in: a grant is created against a phone number before that
 * person has an account, so it is bound to their user record the first time
 * they appear.
 */
export async function linkPendingDelegations(userId: string, phoneE164: string): Promise<number> {
  const { count } = await db.delegation.updateMany({
    where: { delegatePhoneE164: phoneE164, delegateUserId: null, status: { in: ['ACTIVE'] } },
    data: { delegateUserId: userId },
  });
  return count;
}

/** Grants this user holds over other members' accounts. */
export async function getMyDelegations() {
  const ctx = await getEffectiveContext();
  if (!ctx) return [];
  return db.delegation.findMany({
    where: { delegateUserId: ctx.actor.id, status: 'ACTIVE' },
    include: { ownerMember: { select: { id: true, names: true } } },
    orderBy: { createdAt: 'asc' },
  });
}
