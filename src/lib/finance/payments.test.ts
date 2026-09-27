import { describe, it, expect } from 'vitest';
import { allocatePayment, amountToPay } from './allocation';
import { parseBankCsv, referenceIn, senderFrom, splitCsvLine } from './bank-csv';
import { matchDeposits } from './match';

const d = (s: string) => new Date(`${s}T18:00:00Z`);

describe('allocatePayment', () => {
  const shares = [
    { assessmentId: 'open', outstandingCents: 1961, dueAt: d('2026-10-11'), overdue: false },
    { assessmentId: 'late', outstandingCents: 1948, dueAt: d('2026-09-01'), overdue: true },
  ];

  it('clears overdue shares first, then open ones, then dues, then savings', () => {
    const a = allocatePayment({ amountCents: 10_000, preference: 'AUTO', shares, duesOwedCents: 2500, entryFeeOwedCents: 0 });
    expect(a).toEqual([
      { target: 'SHARE', assessmentId: 'late', amountCents: 1948 },
      { target: 'SHARE', assessmentId: 'open', amountCents: 1961 },
      { target: 'ANNUAL_DUES', amountCents: 2500 },
      { target: 'ADVANCE_TOPUP', amountCents: 3591 },
    ]);
    expect(a.reduce((s, x) => s + x.amountCents, 0)).toBe(10_000);
  });

  it('pays part of a share when the money runs out', () => {
    const a = allocatePayment({ amountCents: 1000, preference: 'AUTO', shares, duesOwedCents: 0, entryFeeOwedCents: 0 });
    expect(a).toEqual([{ target: 'SHARE', assessmentId: 'late', amountCents: 1000 }]);
  });

  it('puts everything into savings when the member asks', () => {
    expect(allocatePayment({ amountCents: 5000, preference: 'ADVANCE', shares, duesOwedCents: 2500, entryFeeOwedCents: 0 })).toEqual([
      { target: 'ADVANCE_TOPUP', amountCents: 5000 },
    ]);
  });

  it('rounds the suggested amount up to a whole dollar', () => {
    expect(amountToPay({ outstandingCents: 1961, duesOwedCents: 0, topUpCents: 0 })).toBe(2000);
  });
});

describe('bank CSV', () => {
  const wf = [
    '"09/12/2026","19.61","*","","ZELLE FROM AMINA MRISHO ON 09/12 REF # WFCT0ABC TSA-101"',
    '"09/12/2026","-45.00","*","","BILL PAY UTILITY"',
    '"09/13/2026","25.00","*","","ZELLE FROM DANIEL KILEO ON 09/13 REF # WFCT0DEF"',
    '"09/13/2026","25.00","*","","ZELLE FROM DANIEL KILEO ON 09/13 REF # WFCT0DEF"',
  ].join('\n');

  it('reads the Wells Fargo layout, keeping only deposits', () => {
    const r = parseBankCsv(wf);
    expect(r.rows).toHaveLength(3);
    expect(r.skippedDebits).toBe(1);
    expect(r.rows[0]).toMatchObject({ amountCents: 1961, senderName: 'AMINA MRISHO', memo: 'TSA-101' });
    expect(r.rows[0].postedOn.toISOString().slice(0, 10)).toBe('2026-09-12');
  });

  it('gives identical same-day deposits different hashes, and re-reading gives the same ones', () => {
    const a = parseBankCsv(wf).rows.map((r) => r.rowHash);
    expect(new Set(a).size).toBe(3);
    expect(parseBankCsv(wf).rows.map((r) => r.rowHash)).toEqual(a);
  });

  it('accepts a file with a header row', () => {
    const r = parseBankCsv('Date,Description,Amount\n2026-09-12,"Zelle from Baraka Mwakalinga",50.00');
    expect(r.rows[0]).toMatchObject({ amountCents: 5000, senderName: 'Baraka Mwakalinga' });
  });

  it('reports lines it cannot read instead of guessing', () => {
    expect(parseBankCsv('"not a date","19.61","*","","X"').errors).toHaveLength(1);
  });

  it('handles quotes inside quoted fields', () => {
    expect(splitCsvLine('"a","b ""c""",d')).toEqual(['a', 'b "c"', 'd']);
  });

  it('finds references and senders', () => {
    expect(referenceIn('thanks tsa 147')).toBe(147);
    expect(referenceIn('no ref')).toBeNull();
    expect(senderFrom('ZELLE PAYMENT FROM GRACE NDOSI CONF# 123')).toBe('GRACE NDOSI');
  });
});

describe('matchDeposits', () => {
  const members = [
    { id: 'amina', names: 'Amina Hassan Mrisho', memberNumber: 101 },
    { id: 'daniel', names: 'Daniel Kileo', memberNumber: 110 },
    { id: 'grace', names: 'Grace Ndosi', memberNumber: 107 },
  ];
  const reported = [
    { id: 'p1', memberId: 'amina', amountCents: 1961, paidOn: d('2026-09-12'), payerName: null },
    { id: 'p2', memberId: 'daniel', amountCents: 2500, paidOn: d('2026-09-11'), payerName: 'Daniel Kileo' },
  ];

  it('matches by reference and amount, then by name, amount and date', () => {
    const m = matchDeposits(
      [
        { id: 'b1', postedOn: d('2026-09-12'), amountCents: 1961, senderName: 'SOMEONE ELSE', memo: 'TSA-101' },
        { id: 'b2', postedOn: d('2026-09-13'), amountCents: 2500, senderName: 'DANIEL KILEO', memo: null },
      ],
      reported,
      members
    );
    expect(m).toEqual([
      { bankId: 'b1', kind: 'PAYMENT', paymentId: 'p1', confidence: 'STRONG' },
      { bankId: 'b2', kind: 'PAYMENT', paymentId: 'p2', confidence: 'STRONG' },
    ]);
  });

  it('never matches one report to two deposits', () => {
    const m = matchDeposits(
      [
        { id: 'b1', postedOn: d('2026-09-13'), amountCents: 2500, senderName: 'DANIEL KILEO', memo: null },
        { id: 'b2', postedOn: d('2026-09-13'), amountCents: 2500, senderName: 'DANIEL KILEO', memo: null },
      ],
      reported,
      members
    );
    expect(m[0].kind).toBe('PAYMENT');
    expect(m[1]).toEqual({ bankId: 'b2', kind: 'MEMBER', memberId: 'daniel', confidence: 'LIKELY' });
  });

  it('suggests the member for an unreported deposit, or leaves it for the Treasurer', () => {
    const m = matchDeposits(
      [
        { id: 'b1', postedOn: d('2026-09-12'), amountCents: 5000, senderName: 'GRACE NDOSI', memo: null },
        { id: 'b2', postedOn: d('2026-09-12'), amountCents: 5000, senderName: 'UNKNOWN PERSON', memo: null },
      ],
      reported,
      members
    );
    expect(m[0]).toEqual({ bankId: 'b1', kind: 'MEMBER', memberId: 'grace', confidence: 'LIKELY' });
    expect(m[1]).toEqual({ bankId: 'b2', kind: 'NONE' });
  });

  it('does not match an amount that differs', () => {
    const m = matchDeposits(
      [{ id: 'b1', postedOn: d('2026-09-12'), amountCents: 1900, senderName: null, memo: 'TSA-101' }],
      reported,
      members
    );
    expect(m[0].kind).toBe('MEMBER');
  });
});
