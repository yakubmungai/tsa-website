import { describe, it, expect } from 'vitest';
import { diffTotals, mapLegacyTransaction, totalsByMemberAccount } from './legacy';

const base = { id: 't1', memberId: 'm1', description: null, date: new Date('2026-07-09T14:06:07Z') };

describe('mapLegacyTransaction', () => {
  it('maps each legacy type to its ledger account', () => {
    expect(mapLegacyTransaction({ ...base, amount: '100', type: 'ADVANCE' }).account).toBe('ADVANCE_DEPOSIT');
    expect(mapLegacyTransaction({ ...base, amount: '100', type: 'REGISTRATION' }).account).toBe('ENTRY_FEE');
    expect(mapLegacyTransaction({ ...base, amount: '25', type: 'MEMBERSHIP' }).account).toBe('ANNUAL_DUES');
    expect(mapLegacyTransaction({ ...base, amount: '5', type: 'OTHER' }).account).toBe('ADJUSTMENT');
  });

  it('converts the decimal string exactly, never through a float', () => {
    expect(mapLegacyTransaction({ ...base, amount: '0.10', type: 'ADVANCE' }).amountCents).toBe(10);
    expect(mapLegacyTransaction({ ...base, amount: '-35', type: 'ADVANCE' }).amountCents).toBe(-3500);
  });

  it('marks spreadsheet imports as opening balances', () => {
    const m = mapLegacyTransaction({
      ...base,
      amount: '30',
      type: 'ADVANCE',
      description: 'Imported starting Advance contribution balance',
    });
    expect(m.entryKind).toBe('OPENING');
  });

  it('keys every entry to its source row, so a re-run posts nothing twice', () => {
    expect(mapLegacyTransaction({ ...base, amount: '1', type: 'ADVANCE' }).idempotencyKey).toBe('legacy:t1');
  });
});

describe('reconciliation', () => {
  it('reports only the member/account pairs that differ', () => {
    const expected = totalsByMemberAccount([
      { memberId: 'a', account: 'ADVANCE_DEPOSIT', amountCents: 100 },
      { memberId: 'b', account: 'ANNUAL_DUES', amountCents: 2500 },
    ]);
    const actual = totalsByMemberAccount([
      { memberId: 'a', account: 'ADVANCE_DEPOSIT', amountCents: 100 },
      { memberId: 'b', account: 'ANNUAL_DUES', amountCents: 2499 },
    ]);
    expect(diffTotals(expected, actual)).toEqual([
      { key: 'b:ANNUAL_DUES', expected: 2500, actual: 2499 },
    ]);
  });
});
