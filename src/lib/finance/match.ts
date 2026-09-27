import { namesMatch } from './eligibility';

/**
 * Matching bank deposits to what members reported.
 *
 * Pure: the Treasurer confirms every match with a click, so a wrong guess
 * costs a second look, never money. In order of confidence:
 *
 *   STRONG  the memo carries the member's reference (TSA-147) and the amount
 *           equals a payment that member reported
 *   STRONG  sender name + amount + date within 5 days of a reported payment
 *   LIKELY  no report, but the memo reference or the sender's name points to
 *           exactly one member — offered as a new payment to confirm
 *   none    left for the Treasurer to assign or ignore
 */

export const MATCH_WINDOW_DAYS = 5;

export interface BankLine {
  id: string;
  postedOn: Date;
  amountCents: number;
  senderName: string | null;
  memo: string | null;
}

export interface ReportedPayment {
  id: string;
  memberId: string;
  amountCents: number;
  paidOn: Date;
  payerName: string | null;
}

export interface MemberRef {
  id: string;
  names: string;
  memberNumber: number | null;
}

export type Match =
  | { bankId: string; kind: 'PAYMENT'; paymentId: string; confidence: 'STRONG' }
  | { bankId: string; kind: 'MEMBER'; memberId: string; confidence: 'LIKELY' }
  | { bankId: string; kind: 'NONE' };

const DAY = 24 * 60 * 60 * 1000;

export function matchDeposits(lines: BankLine[], reported: ReportedPayment[], members: MemberRef[]): Match[] {
  const available = new Set(reported.map((r) => r.id));
  const byNumber = new Map(members.filter((m) => m.memberNumber !== null).map((m) => [m.memberNumber!, m]));
  const out: Match[] = [];

  for (const line of lines) {
    const refNumber = line.memo ? Number(line.memo.replace(/\D/g, '')) : null;
    const refMember = refNumber ? byNumber.get(refNumber) : undefined;
    const near = (p: ReportedPayment) => Math.abs(p.paidOn.getTime() - line.postedOn.getTime()) <= MATCH_WINDOW_DAYS * DAY;

    // 1. Reference + amount.
    let hit = refMember
      ? reported.find((p) => available.has(p.id) && p.memberId === refMember.id && p.amountCents === line.amountCents)
      : undefined;

    // 2. Sender name + amount + date.
    if (!hit && line.senderName) {
      hit = reported.find((p) => {
        if (!available.has(p.id) || p.amountCents !== line.amountCents || !near(p)) return false;
        const member = members.find((m) => m.id === p.memberId);
        return (
          (p.payerName !== null && namesMatch(p.payerName, line.senderName!)) ||
          (member !== undefined && namesMatch(member.names, line.senderName!))
        );
      });
    }

    if (hit) {
      available.delete(hit.id);
      out.push({ bankId: line.id, kind: 'PAYMENT', paymentId: hit.id, confidence: 'STRONG' });
      continue;
    }

    // 3. No report — can we at least say whose it is?
    if (refMember) {
      out.push({ bankId: line.id, kind: 'MEMBER', memberId: refMember.id, confidence: 'LIKELY' });
      continue;
    }
    if (line.senderName) {
      const candidates = members.filter((m) => namesMatch(m.names, line.senderName!));
      if (candidates.length === 1) {
        out.push({ bankId: line.id, kind: 'MEMBER', memberId: candidates[0].id, confidence: 'LIKELY' });
        continue;
      }
    }
    out.push({ bankId: line.id, kind: 'NONE' });
  }
  return out;
}
