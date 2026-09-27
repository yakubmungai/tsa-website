/**
 * Where a payment goes.
 *
 * A member sends one Zelle for "what I owe". The Treasurer should not have to
 * divide it by hand, so the default order is fixed and explainable:
 *
 *   1. overdue case contributions, oldest first — these are what count against
 *      the member under Art 17.4, so clearing them first lifts a warning soonest
 *   2. other open contributions, soonest due first
 *   3. this year's dues (Art 5.3 / 17.1)
 *   4. the joining fee, if still owed (Art 5.3)
 *   5. anything left tops up their advance savings (Art 6.2)
 *
 * A member can instead ask for the whole amount to go to savings — the way to
 * restore the $125 — and an officer can re-allocate before confirming.
 */

export type AllocationTarget = 'SHARE' | 'ANNUAL_DUES' | 'ENTRY_FEE' | 'ADVANCE_TOPUP';

export interface Allocation {
  target: AllocationTarget;
  assessmentId?: string;
  amountCents: number;
}

export interface OpenShare {
  assessmentId: string;
  outstandingCents: number;
  dueAt: Date;
  overdue: boolean;
}

export function allocatePayment(input: {
  amountCents: number;
  preference: 'AUTO' | 'ADVANCE';
  shares: OpenShare[];
  duesOwedCents: number;
  entryFeeOwedCents: number;
}): Allocation[] {
  let left = input.amountCents;
  const out: Allocation[] = [];
  if (left <= 0) return out;

  if (input.preference === 'AUTO') {
    const ordered = [...input.shares]
      .filter((s) => s.outstandingCents > 0)
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueAt.getTime() - b.dueAt.getTime());
    for (const s of ordered) {
      if (left <= 0) break;
      const take = Math.min(left, s.outstandingCents);
      out.push({ target: 'SHARE', assessmentId: s.assessmentId, amountCents: take });
      left -= take;
    }
    for (const [target, owed] of [
      ['ANNUAL_DUES', input.duesOwedCents],
      ['ENTRY_FEE', input.entryFeeOwedCents],
    ] as const) {
      if (left <= 0) break;
      const take = Math.min(left, Math.max(0, owed));
      if (take > 0) {
        out.push({ target, amountCents: take });
        left -= take;
      }
    }
  }
  if (left > 0) out.push({ target: 'ADVANCE_TOPUP', amountCents: left });
  return out;
}

/** What a member is asked to pay: everything owed now, rounded up to a whole dollar. */
export function amountToPay(input: { outstandingCents: number; duesOwedCents: number; topUpCents: number }): number {
  const total = input.outstandingCents + Math.max(0, input.duesOwedCents) + Math.max(0, input.topUpCents);
  return Math.ceil(total / 100) * 100;
}
