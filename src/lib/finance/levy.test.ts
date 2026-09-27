import { describe, it, expect } from 'vitest';
import {
  assignBillingMonth,
  benefitFor,
  effectiveTypeFor,
  eligiblePayers,
  levyPoolFor,
  shareDueAt,
  splitLevy,
  type PayerCandidate,
} from './levy';

function roster(n: number, extra: Partial<PayerCandidate> = {}): PayerCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${String(i + 1).padStart(3, '0')}`,
    status: 'ACTIVE',
    archived: false,
    memberNumber: i + 1,
    names: `Member ${i + 1}`,
    ...extra,
  }));
}

describe('what a case pays (Art 18.1, 18.2, 18.9)', () => {
  it('pays the four types by the ladder', () => {
    expect(benefitFor('MEMBER_DEATH', 'FULL')).toBe(1_000_000);
    expect(benefitFor('CHILD_DEATH', 'REDUCED')).toBe(500_000);
    expect(benefitFor('RELATIVE_DEATH', 'FULL')).toBe(300_000);
    expect(benefitFor('RELATIVE_DEATH', 'REDUCED')).toBe(150_000);
    expect(benefitFor('HARDSHIP', 'MINIMAL')).toBe(50_000);
    expect(benefitFor('MEMBER_DEATH', 'MINIMAL')).toBe(200_000);
    expect(benefitFor('MEMBER_DEATH', 'VOLUNTARY')).toBe(0);
  });

  it('pays a child 21+ or living abroad at the relative tier', () => {
    expect(effectiveTypeFor({ type: 'CHILD_DEATH', subjectAge: 12, subjectLivesInUsa: true })).toEqual({
      type: 'CHILD_DEATH',
      rerouted: false,
    });
    expect(effectiveTypeFor({ type: 'CHILD_DEATH', subjectAge: 12, subjectLivesInUsa: false }).type).toBe(
      'RELATIVE_DEATH'
    );
    expect(effectiveTypeFor({ type: 'CHILD_DEATH', subjectAge: 21, subjectLivesInUsa: true }).type).toBe(
      'RELATIVE_DEATH'
    );
  });

  it('collects what is paid out, not always the full pool', () => {
    expect(levyPoolFor('CHILD_DEATH', 500_000)).toBe(500_000);
  });
});

describe('who contributes (Art 17)', () => {
  it('never charges the member the case is for', () => {
    const payers = eligiblePayers(roster(5), 'ACTIVE_MEMBERS', 'm003');
    expect(payers.map((p) => p.id)).not.toContain('m003');
    expect(payers).toHaveLength(4);
  });

  it('divides hardships among active members and deaths among all members', () => {
    const r = [...roster(3), { id: 'susp', status: 'SUSPENDED', archived: false, memberNumber: 9, names: 'S' }];
    expect(eligiblePayers(r, 'ACTIVE_MEMBERS', 'x').map((p) => p.id)).not.toContain('susp');
    expect(eligiblePayers(r, 'ALL_MEMBERS', 'x').map((p) => p.id)).toContain('susp');
  });

  it('leaves out archived and deceased members', () => {
    const r = [
      ...roster(2),
      { id: 'gone', status: 'ACTIVE', archived: true, memberNumber: 7, names: 'G' },
      { id: 'late', status: 'DECEASED', archived: false, memberNumber: 8, names: 'L' },
    ];
    expect(eligiblePayers(r, 'ALL_MEMBERS', 'x').map((p) => p.id)).toEqual(['m001', 'm002']);
  });

  it('orders payers deterministically by member number', () => {
    const r = roster(3).reverse();
    expect(eligiblePayers(r, 'ALL_MEMBERS', 'x').map((p) => p.id)).toEqual(['m001', 'm002', 'm003']);
  });
});

describe('the split', () => {
  it('adds up to the pool exactly — $3,000 among 153', () => {
    const payers = eligiblePayers(roster(154), 'ACTIVE_MEMBERS', 'm001');
    const shares = splitLevy(300_000, payers);
    const total = [...shares.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(300_000);
    expect(Math.max(...shares.values()) - Math.min(...shares.values())).toBeLessThanOrEqual(1);
  });

  it('adds up exactly for a reduced $5,000 death benefit', () => {
    const payers = eligiblePayers(roster(154), 'ALL_MEMBERS', 'm010');
    const total = [...splitLevy(500_000, payers).values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(500_000);
  });

  it('charges nothing for a voluntary case', () => {
    expect(splitLevy(0, roster(5)).size).toBe(0);
  });
});

describe('monthly caps (Art 17)', () => {
  it('keeps a share in the month when it fits', () => {
    expect(assignBillingMonth([], 'HARDSHIP', 1948, '2026-09')).toBe('2026-09');
  });

  it('moves a sixth hardship to the next month', () => {
    const five = Array.from({ length: 5 }, () => ({ billingMonth: '2026-09', bucket: 'HARDSHIP' as const, amountCents: 1000 }));
    expect(assignBillingMonth(five, 'HARDSHIP', 1000, '2026-09')).toBe('2026-10');
  });

  it('moves a share that would take hardships past $100', () => {
    const existing = [{ billingMonth: '2026-09', bucket: 'HARDSHIP' as const, amountCents: 9000 }];
    expect(assignBillingMonth(existing, 'HARDSHIP', 1948, '2026-09')).toBe('2026-10');
  });

  it('keeps the buckets separate — deaths do not fill the hardship cap', () => {
    const deaths = [{ billingMonth: '2026-09', bucket: 'DEATH' as const, amountCents: 19_000 }];
    expect(assignBillingMonth(deaths, 'HARDSHIP', 1948, '2026-09')).toBe('2026-09');
  });

  it('moves a fourth death to the next month', () => {
    const three = Array.from({ length: 3 }, () => ({ billingMonth: '2026-12', bucket: 'DEATH' as const, amountCents: 3000 }));
    expect(assignBillingMonth(three, 'DEATH', 3000, '2026-12')).toBe('2027-01');
  });

  it('does not push an oversized share forward forever', () => {
    expect(assignBillingMonth([], 'HARDSHIP', 15_000, '2026-09')).toBe('2026-09');
  });

  it('is due two weeks after announcing, or two weeks into a deferred month', () => {
    const announced = new Date('2026-09-10T18:00:00Z');
    expect(shareDueAt(announced, '2026-09', '2026-09').toISOString()).toBe('2026-09-24T18:00:00.000Z');
    expect(shareDueAt(announced, '2026-09', '2026-10').toISOString()).toBe('2026-10-15T18:00:00.000Z');
  });
});
