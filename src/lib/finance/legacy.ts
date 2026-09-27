import type { LedgerAccount, LedgerEntryKind } from '@prisma/client';
import { centsFromDecimalString } from '../money';

/**
 * How a row of the legacy `Transaction` table becomes a ledger entry.
 *
 * Pure, so the mapping can be tested without a database and the migration
 * script and the reconciliation check can never disagree about it.
 *
 * The legacy table already used the ledger's sign convention — positive is
 * money the member holds with TSA, a negative advance is an overdrawn float —
 * so amounts carry across unchanged.
 */

export interface LegacyTransaction {
  id: string;
  memberId: string;
  /** Prisma Decimal, as a string. Never converted through a float. */
  amount: string;
  type: string;
  description: string | null;
  date: Date;
}

export const LEGACY_ACCOUNT: Record<string, LedgerAccount> = {
  ADVANCE: 'ADVANCE_DEPOSIT',
  REGISTRATION: 'ENTRY_FEE',
  MEMBERSHIP: 'ANNUAL_DUES',
  OTHER: 'ADJUSTMENT',
};

export interface MappedEntry {
  memberId: string;
  account: LedgerAccount;
  entryKind: LedgerEntryKind;
  amountCents: number;
  description: string;
  occurredAt: Date;
  idempotencyKey: string;
}

export function mapLegacyTransaction(t: LegacyTransaction): MappedEntry {
  const account = LEGACY_ACCOUNT[t.type] ?? 'ADJUSTMENT';
  const amountCents = centsFromDecimalString(t.amount);
  const description = t.description?.trim() || `${t.type} (migrated)`;

  // The spreadsheet import wrote "Imported starting … balance" rows. Those are
  // opening balances, not payments anyone made on that date.
  const isOpening = /^imported/i.test(description);
  const entryKind: LedgerEntryKind = isOpening
    ? 'OPENING'
    : amountCents >= 0
      ? 'PAYMENT'
      : 'ADJUSTMENT';

  return {
    memberId: t.memberId,
    account,
    entryKind,
    amountCents,
    description,
    occurredAt: t.date,
    idempotencyKey: `legacy:${t.id}`,
  };
}

/** Per member, per ledger account, in cents. The shape both sides reconcile on. */
export function totalsByMemberAccount(
  rows: { memberId: string | null; account: string; amountCents: number }[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (!r.memberId) continue;
    const key = `${r.memberId}:${r.account}`;
    totals.set(key, (totals.get(key) ?? 0) + r.amountCents);
  }
  return totals;
}

/** Keys whose totals differ, with both sides. Empty means reconciled. */
export function diffTotals(
  expected: Map<string, number>,
  actual: Map<string, number>
): { key: string; expected: number; actual: number }[] {
  const keys = new Set([...expected.keys(), ...actual.keys()]);
  const out: { key: string; expected: number; actual: number }[] = [];
  for (const key of keys) {
    const e = expected.get(key) ?? 0;
    const a = actual.get(key) ?? 0;
    if (e !== a) out.push({ key, expected: e, actual: a });
  }
  return out;
}
