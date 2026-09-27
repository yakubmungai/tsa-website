import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { authOptions } from './auth';

/**
 * Append-only audit trail.
 *
 * KATIBA Art 6.1 gives every member the right to inspect the association's
 * records. Anything that moves money, changes a member's data, or grants
 * access must leave a row here.
 *
 * Never update or delete audit rows. To correct a mistake, record the
 * correction as a new entry.
 */

export type AuditAction =
  // members
  | 'MEMBER_CREATED'
  | 'MEMBER_UPDATED'
  | 'MEMBER_ARCHIVED'
  | 'MEMBER_RESTORED'
  | 'MEMBER_DELETED'
  // money
  | 'TRANSACTION_POSTED'
  | 'LEDGER_ENTRY_POSTED'
  | 'LEDGER_ENTRY_REVERSED'
  // cases (Stage 3)
  | 'CLAIM_FILED'
  | 'CLAIM_REVIEW_STARTED'
  | 'CLAIM_CHECKLIST_UPDATED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_VOLUNTARY'
  | 'CLAIM_REJECTED'
  | 'CLAIM_ANNOUNCED'
  | 'CLAIM_PAYOUT_RECORDED'
  | 'CLAIM_CLOSED'
  | 'SHARE_PAYMENT_RECORDED'
  | 'SHARE_EXCUSED'
  // submissions
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_REJECTED'
  // data egress
  | 'MEMBER_DATA_EXPORTED'
  // auth
  | 'LOGIN_SUCCEEDED'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_CLAIMED'
  | 'ACCOUNT_REVOKED'
  // delegation
  | 'DELEGATION_GRANTED'
  | 'DELEGATION_REVOKED'
  | 'ACTING_SESSION_STARTED';

interface WriteAuditInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
  onBehalfOfMemberId?: string | null;
  success?: boolean;
  failureReason?: string;
  /**
   * Pass the surrounding transaction client for anything that moves money, so
   * the audit row and the change it describes commit or roll back together.
   */
  tx?: Prisma.TransactionClient;
  /** Override when there is no session (system jobs, webhooks). */
  actor?: { userId?: string | null; label: string; role?: string | null };
}

/**
 * Hash the caller's IP with a server-side pepper, so the audit log records
 * "same person" without itself becoming a store of personal data.
 */
async function getIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip');
    if (!ip) return null;
    const pepper = process.env.AUDIT_IP_PEPPER ?? '';
    return createHash('sha256').update(`${pepper}:${ip}`).digest('hex').slice(0, 32);
  } catch {
    // headers() throws outside a request scope (cron, scripts).
    return null;
  }
}

async function resolveActor(override?: WriteAuditInput['actor']) {
  if (override) return override;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { userId: null, label: 'anonymous', role: null };
    return {
      userId: session.user.id,
      label: `${session.user.email ?? session.user.id} (${session.user.role})`,
      role: session.user.role,
    };
  } catch {
    return { userId: null, label: 'system', role: 'SYSTEM' };
  }
}

/**
 * Write an audit entry.
 *
 * Best-effort by default: a logging failure must never break the user's action.
 * When `tx` is supplied the write joins that transaction, so a failure there
 * *does* roll back the operation — which is what you want for money.
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  const actor = await resolveActor(input.actor);
  const data = {
    actorUserId: actor.userId ?? null,
    actorLabel: actor.label,
    actorRole: actor.role ?? null,
    onBehalfOfMemberId: input.onBehalfOfMemberId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata,
    ipHash: await getIpHash(),
    success: input.success ?? true,
    failureReason: input.failureReason,
  };

  if (input.tx) {
    await input.tx.auditLog.create({ data });
    return;
  }

  try {
    await db.auditLog.create({ data });
  } catch (err) {
    console.error('[audit] failed to write entry', input.action, err);
  }
}
