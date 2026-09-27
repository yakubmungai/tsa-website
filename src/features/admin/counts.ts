import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { now } from '@/lib/clock';
import { LEVY_ACCOUNTS } from '@/lib/finance/ledger';
import { MISSED_CONTRIBUTIONS_BOARD_REFERRAL } from '@/lib/finance/constants';

export interface AdminCounts {
  /** Cases waiting for the Katibu/Muhakiki to review. */
  claims: number;
  /** Cases announced and still collecting. */
  collecting: number;
  /** Member-reported payments and bank rows waiting for the Treasurer. */
  payments: number;
  /** Form submissions not yet reviewed. */
  forms: number;
  /** Shares past their deadline, unpaid and not excused (Art 17). */
  overdue: number;
  /** Members with three or more of those — for the Board of Trustees. */
  boardReferrals: { memberId: string; missed: number }[];
  total: number;
}

/**
 * Shares past due, unpaid and not excused, per member.
 *
 * Worked out from the ledger rather than stored, so paying what was missed
 * clears it immediately (Art 17.4).
 */
export async function overdueByMember(asOf: Date): Promise<Map<string, number>> {
  const overdue = await db.assessment.findMany({
    where: { dueAt: { lt: asOf }, excusedAt: null },
    select: { id: true, memberId: true },
  });
  const byMember = new Map<string, number>();
  if (overdue.length === 0) return byMember;
  const sums = await db.ledgerEntry.groupBy({
    by: ['assessmentId'],
    where: {
      assessmentId: { in: overdue.map((a) => a.id) },
      account: { in: LEVY_ACCOUNTS },
      voidedAt: null,
      occurredAt: { lte: asOf },
    },
    _sum: { amountCents: true },
  });
  const owing = new Set(sums.filter((s) => (s._sum.amountCents ?? 0) < 0).map((s) => s.assessmentId));
  for (const a of overdue) {
    if (owing.has(a.id)) byMember.set(a.memberId, (byMember.get(a.memberId) ?? 0) + 1);
  }
  return byMember;
}

/** What is waiting for an officer, for the tab badges and the Today inbox. */
export const getAdminCounts = cache(async (): Promise<AdminCounts> => {
  const asOf = await now();
  const [forms, claims, collecting, overdue] = await Promise.all([
    db.formSubmission.count({ where: { status: 'PENDING' } }),
    db.claim.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    db.claim.count({ where: { status: 'COLLECTING' } }),
    overdueByMember(asOf),
  ]);
  const payments = 0;
  const boardReferrals = [...overdue.entries()]
    .filter(([, n]) => n >= MISSED_CONTRIBUTIONS_BOARD_REFERRAL)
    .map(([memberId, missed]) => ({ memberId, missed }));
  const overdueTotal = [...overdue.values()].reduce((a, b) => a + b, 0);
  return {
    claims,
    collecting,
    payments,
    forms,
    overdue: overdueTotal,
    boardReferrals,
    total: claims + payments + forms + boardReferrals.length,
  };
});
