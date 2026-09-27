import { describe, it, expect } from 'vitest';
import { assessEligibility, namesMatch, type EligibilityInput } from './eligibility';

const base: EligibilityInput = {
  type: 'RELATIVE_DEATH',
  relationship: 'PARENT_GUARDIAN',
  subjectName: 'Zainabu Hassan',
  eventDate: new Date('2026-09-01T18:00:00Z'),
  reportedAt: new Date('2026-09-03T18:00:00Z'),
  member: {
    joinedAt: new Date('2024-05-01T18:00:00Z'),
    joinedAtEstimated: false,
    husbandWife: 'Rashid Mrisho',
    parents: ['Hassan Mrisho', 'Zainabu Hassan'],
    children: ['Yusuf Mrisho'],
    siblings: ['Salma Mrisho'],
  },
  tierAtEvent: 'FULL',
  shortfallAtEventCents: 0,
  priorCases: [],
};

const codes = (input: Partial<EligibilityInput>) => assessEligibility({ ...base, ...input }).flags.map((f) => f.code);

describe('assessEligibility', () => {
  it('raises nothing for a clean, registered, on-time case', () => {
    const r = assessEligibility(base);
    expect(r.flags).toEqual([]);
    expect(r.suggestedBenefitCents).toBe(300_000);
    expect(r.suggestVoluntary).toBe(false);
  });

  it('flags a report later than 7 days (Art 4.3)', () => {
    expect(codes({ reportedAt: new Date('2026-09-12T18:00:00Z') })).toContain('LATE_REPORT');
  });

  it('suggests kihiari within the six-month wait (Art 4.5)', () => {
    const r = assessEligibility({ ...base, member: { ...base.member, joinedAt: new Date('2026-06-01T18:00:00Z') } });
    expect(r.flags.map((f) => f.code)).toContain('NEW_MEMBER_WAIT');
    expect(r.suggestVoluntary).toBe(true);
    expect(r.suggestedBenefitCents).toBe(0);
  });

  it('flags a sixth case in five years and defers one within three months (Art 4.5)', () => {
    const five = ['2022-01-01', '2023-01-01', '2024-01-01', '2025-01-01', '2026-01-01'].map((d) => ({
      eventDate: new Date(`${d}T18:00:00Z`),
    }));
    expect(codes({ priorCases: five })).toContain('EVENT_LIMIT');

    const r = assessEligibility({ ...base, priorCases: [{ eventDate: new Date('2026-07-15T18:00:00Z') }] });
    expect(r.flags.map((f) => f.code)).toContain('REPEAT_WITHIN_3_MONTHS');
    expect(r.announceNotBefore?.toISOString().slice(0, 10)).toBe('2026-10-15');
  });

  it('flags a relative who is not on the contract (Art 4.4)', () => {
    expect(codes({ subjectName: 'Someone Else' })).toContain('RELATIVE_NOT_REGISTERED');
    expect(codes({ subjectName: 'zainabu  HASSAN' })).not.toContain('RELATIVE_NOT_REGISTERED');
  });

  it('flags a detention or fire claimed for a relative (Art 4.3)', () => {
    expect(
      codes({ type: 'HARDSHIP', hardshipCategory: 'FIRE', relationship: 'SIBLING', subjectName: 'Salma Mrisho' })
    ).toContain('MEMBER_ONLY_CATEGORY');
    expect(codes({ type: 'HARDSHIP', hardshipCategory: 'FIRE', relationship: 'SELF' })).not.toContain(
      'MEMBER_ONLY_CATEGORY'
    );
  });

  it('flags critical illness claimed for a parent (Art 4.3 covers member, spouse, children)', () => {
    expect(codes({ type: 'HARDSHIP', hardshipCategory: 'ILLNESS_CRITICAL' })).toContain('ILLNESS_SCOPE');
  });

  it('re-routes a child living abroad to the relative tier', () => {
    const r = assessEligibility({
      ...base,
      type: 'CHILD_DEATH',
      relationship: 'CHILD',
      subjectName: 'Yusuf Mrisho',
      subjectAge: 10,
      subjectLivesInUsa: false,
    });
    expect(r.effectiveType).toBe('RELATIVE_DEATH');
    expect(r.suggestedBenefitCents).toBe(300_000);
    expect(r.flags.map((f) => f.code)).toContain('CHILD_REROUTED');
  });

  it('pays a REDUCED-tier child death at $5,000', () => {
    const r = assessEligibility({
      ...base,
      type: 'CHILD_DEATH',
      relationship: 'CHILD',
      subjectName: 'Yusuf Mrisho',
      subjectAge: 10,
      subjectLivesInUsa: true,
      tierAtEvent: 'REDUCED',
      shortfallAtEventCents: 4000,
    });
    expect(r.suggestedBenefitCents).toBe(500_000);
    expect(r.suggestedLevyPoolCents).toBe(500_000);
    expect(r.flags.map((f) => f.code)).toContain('BELOW_MINIMUM');
  });

  it('suggests kihiari with nothing on account', () => {
    const r = assessEligibility({ ...base, tierAtEvent: 'VOLUNTARY', shortfallAtEventCents: 12_500 });
    expect(r.suggestVoluntary).toBe(true);
    expect(r.flags.map((f) => f.code)).toContain('VOLUNTARY_TIER');
  });
});

describe('namesMatch', () => {
  it('ignores case, spacing and word order', () => {
    expect(namesMatch('Hassan Mrisho', 'mrisho  hassan')).toBe(true);
    expect(namesMatch('Zainabu', 'Zainabu Hassan')).toBe(true);
    expect(namesMatch('Zainabu Ali', 'Zainabu Hassan')).toBe(false);
  });
});
