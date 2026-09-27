import 'server-only';
import { db } from '@/lib/db';
import { showComplianceStatus } from '@/lib/rollout';
import { suggestedTopUpCents } from '@/lib/finance/balance';
import { paymentReference } from '@/lib/finance/constants';
import { memberOwing } from './service';

/**
 * What the pay screen needs: what is owed, the amount to suggest, the memo
 * reference, and payments already reported but not yet confirmed.
 */
export async function paySummary(memberId: string) {
  const [owing, member, pending] = await Promise.all([
    memberOwing(memberId),
    db.member.findUniqueOrThrow({ where: { id: memberId }, select: { names: true, memberNumber: true } }),
    db.payment.findMany({
      where: { memberId, status: { in: ['REPORTED', 'MATCHED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amountCents: true, paidOn: true },
    }),
  ]);
  // Owed contributions first; otherwise, once the roster is confirmed, what it
  // takes to restore the $125 (rounded up so one payment covers a few cases).
  const suggestedCents =
    owing.outstandingCents > 0
      ? Math.ceil(owing.outstandingCents / 100) * 100
      : showComplianceStatus()
        ? suggestedTopUpCents(owing.standing)
        : 0;
  return {
    firstName: member.names.split(' ')[0],
    names: member.names,
    reference: paymentReference(member.memberNumber),
    outstandingCents: owing.outstandingCents,
    suggestedCents,
    pending,
    asOf: owing.asOf,
  };
}
