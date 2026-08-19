import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { DelegationPermission } from '@prisma/client';
import { authOptions } from './auth';
import { db } from './db';

/**
 * Who is acting, and on whose behalf.
 *
 * Replaces the guard logic that was copy-pasted into every page and action.
 *
 * The important property: when someone is acting under a delegation, the JWT
 * carries only the acting-session id. Everything else is re-read here on each
 * request. That is what makes revocation take effect on the delegate's very
 * next request instead of whenever their 30-day token happens to expire.
 */

export interface SessionUser {
  id: string;
  role: 'MEMBER' | 'ADMIN';
  memberId: string | null;
  email: string | null;
  name: string | null;
}

export interface EffectiveContext {
  /** Who is really signed in. Use this for attribution. */
  actor: SessionUser;
  /** The member being acted upon — the delegate's own, or the owner's. */
  memberId: string | null;
  isActing: boolean;
  acting?: {
    sessionId: string;
    delegationId: string;
    ownerMemberId: string;
    ownerName: string;
    permissions: DelegationPermission[];
  };
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    memberId: session.user.memberId ?? null,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
});

/**
 * Resolve the effective member for this request.
 *
 * Cached per render so repeated calls within one page cost a single lookup.
 */
export const getEffectiveContext = cache(async (): Promise<EffectiveContext | null> => {
  const actor = await getSessionUser();
  if (!actor) return null;

  const session = await getServerSession(authOptions);
  const actingSessionId = (session as { actingSessionId?: string } | null)?.actingSessionId;

  if (!actingSessionId) {
    return { actor, memberId: actor.memberId, isActing: false };
  }

  const acting = await db.actingSession.findUnique({
    where: { id: actingSessionId },
    include: {
      delegation: {
        include: { ownerMember: { select: { id: true, names: true, archivedAt: true } } },
      },
    },
  });

  const valid =
    acting &&
    acting.actorUserId === actor.id &&
    acting.endedAt === null &&
    acting.expiresAt > new Date() &&
    acting.delegation.status === 'ACTIVE' &&
    (acting.delegation.expiresAt === null || acting.delegation.expiresAt > new Date()) &&
    !acting.delegation.ownerMember.archivedAt;

  if (!valid) {
    // Close it if it is still open, so the row reflects reality.
    if (acting && acting.endedAt === null) {
      await db.actingSession
        .update({ where: { id: acting.id }, data: { endedAt: new Date(), endedReason: 'EXPIRED' } })
        .catch(() => {});
    }
    return { actor, memberId: actor.memberId, isActing: false };
  }

  return {
    actor,
    memberId: acting.delegation.ownerMemberId,
    isActing: true,
    acting: {
      sessionId: acting.id,
      delegationId: acting.delegationId,
      ownerMemberId: acting.delegation.ownerMemberId,
      ownerName: acting.delegation.ownerMember.names,
      permissions: acting.delegation.permissions,
    },
  };
});

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/portal?denied=admin');
  return user;
}

/** Require a member context — the actor's own, or one they may act for. */
export async function requireMember(): Promise<EffectiveContext & { memberId: string }> {
  const ctx = await getEffectiveContext();
  if (!ctx) redirect('/login');
  if (!ctx.memberId) redirect('/portal');
  return ctx as EffectiveContext & { memberId: string };
}

/**
 * Require a specific permission on the effective member.
 *
 * Acting on your own account implies every permission. Acting for someone else
 * grants only what they agreed to.
 */
export async function requirePermission(
  permission: DelegationPermission
): Promise<EffectiveContext & { memberId: string }> {
  const ctx = await requireMember();
  if (!ctx.isActing) return ctx;
  if (!ctx.acting?.permissions.includes(permission)) {
    redirect('/portal?denied=permission');
  }
  return ctx;
}

/** Non-redirecting variant, for server actions that return a result. */
export function checkPermission(
  ctx: EffectiveContext,
  permission: DelegationPermission
): boolean {
  if (!ctx.isActing) return true;
  return ctx.acting?.permissions.includes(permission) ?? false;
}
