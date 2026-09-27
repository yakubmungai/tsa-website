import { describe, it, expect } from 'vitest';
import { daysBetween, isIsoDate, nextMonthKey, orgDateFromInput, orgIsoDate, orgMonthKey } from './dates';

describe('org dates', () => {
  it('keeps a typed date on the same Houston day in both seasons', () => {
    expect(orgIsoDate(orgDateFromInput('2026-01-15'))).toBe('2026-01-15'); // CST
    expect(orgIsoDate(orgDateFromInput('2026-07-15'))).toBe('2026-07-15'); // CDT
  });

  it('rejects impossible dates', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('12/09/2026')).toBe(false);
    expect(() => orgDateFromInput('2026-13-01')).toThrow();
  });

  it('reads the month in Houston, not UTC', () => {
    // 02:00 UTC on 1 Oct is still 30 Sep in Houston.
    expect(orgMonthKey(new Date('2026-10-01T02:00:00Z'))).toBe('2026-09');
  });

  it('rolls the month over the year end', () => {
    expect(nextMonthKey('2026-09')).toBe('2026-10');
    expect(nextMonthKey('2026-12')).toBe('2027-01');
  });

  it('counts whole days', () => {
    expect(daysBetween(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-15T12:00:00Z'))).toBe(14);
  });
});
