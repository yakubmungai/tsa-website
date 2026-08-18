import { describe, it, expect } from 'vitest';
import {
  parseUSDToCents,
  centsFromDecimalString,
  formatUSD,
  sumCents,
  splitEvenly,
  applyBps,
  MoneyError,
} from './money';

describe('parseUSDToCents', () => {
  it('parses plain and decorated amounts', () => {
    expect(parseUSDToCents('65')).toBe(6500);
    expect(parseUSDToCents('$65')).toBe(6500);
    expect(parseUSDToCents('65.5')).toBe(6550);
    expect(parseUSDToCents('65.55')).toBe(6555);
    expect(parseUSDToCents('1,234.56')).toBe(123456);
    expect(parseUSDToCents('  25.00 ')).toBe(2500);
    expect(parseUSDToCents('-25.00')).toBe(-2500);
    expect(parseUSDToCents('0')).toBe(0);
  });

  it('parses the KATIBA amounts exactly', () => {
    expect(parseUSDToCents('100')).toBe(10_000); // entry fee, advance
    expect(parseUSDToCents('25')).toBe(2_500); // annual dues
    expect(parseUSDToCents('125')).toBe(12_500); // minimum standing
    expect(parseUSDToCents('3000')).toBe(300_000); // hardship pool
    expect(parseUSDToCents('10000')).toBe(1_000_000); // death pool
  });

  it('rejects rather than silently rounding sub-cent input', () => {
    expect(() => parseUSDToCents('19.4805')).toThrow(MoneyError);
    expect(() => parseUSDToCents('0.001')).toThrow(MoneyError);
  });

  it('rejects junk and blank input', () => {
    for (const bad of ['abc', '', '   ', '1.2.3', '--5', '5-', 'NaN', 'Infinity']) {
      expect(() => parseUSDToCents(bad), `expected "${bad}" to be rejected`).toThrow(MoneyError);
    }
  });

  it('rejects the values that reached Prisma unvalidated before', () => {
    expect(() => parseUSDToCents(NaN)).toThrow(MoneyError);
    expect(() => parseUSDToCents(Infinity)).toThrow(MoneyError);
    expect(() => parseUSDToCents('999999999999')).toThrow(MoneyError);
  });
});

describe('centsFromDecimalString', () => {
  it('avoids the float error that Number(d) * 100 introduces', () => {
    // 0.1 * 100 === 10.000000000000002
    expect(centsFromDecimalString('0.1')).toBe(10);
    expect(centsFromDecimalString('10385.00')).toBe(1_038_500);
    expect(centsFromDecimalString('15035.00')).toBe(1_503_500);
  });
});

describe('formatUSD', () => {
  it('formats with thousands separators and two decimals', () => {
    expect(formatUSD(6726)).toBe('$67.26');
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(5)).toBe('$0.05');
    expect(formatUSD(1_000_000)).toBe('$10,000.00');
    expect(formatUSD(-2500)).toBe('-$25.00');
  });

  it('can force a leading + so credits and debits never rely on colour alone', () => {
    expect(formatUSD(5000, { sign: 'always' })).toBe('+$50.00');
    expect(formatUSD(-5000, { sign: 'always' })).toBe('-$50.00');
  });
});

describe('splitEvenly', () => {
  it('splits the hardship pool across the membership without losing a cent', () => {
    const shares = splitEvenly(300_000, 154); // $3,000 among 154 members
    expect(sumCents(shares)).toBe(300_000);
    expect(shares.filter((s) => s === 1949)).toHaveLength(8);
    expect(shares.filter((s) => s === 1948)).toHaveLength(146);
  });

  it('splits the death pool without losing a cent', () => {
    const shares = splitEvenly(1_000_000, 154); // $10,000 among 154 members
    expect(sumCents(shares)).toBe(1_000_000);
    expect(new Set(shares).size).toBeLessThanOrEqual(2);
  });

  it('always sums to the total for any membership size', () => {
    for (const n of [1, 2, 3, 7, 99, 153, 154, 155, 1000]) {
      for (const pool of [300_000, 1_000_000, 12_500]) {
        expect(sumCents(splitEvenly(pool, n)), `pool ${pool} / ${n}`).toBe(pool);
      }
    }
  });

  it('distributes the remainder to the earliest shares, deterministically', () => {
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
    expect(splitEvenly(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it('rejects a non-positive membership count', () => {
    expect(() => splitEvenly(300_000, 0)).toThrow(MoneyError);
    expect(() => splitEvenly(300_000, -1)).toThrow(MoneyError);
  });
});

describe('applyBps', () => {
  it('computes the KATIBA 10% investment-club borrowing surcharge (Art 6.2)', () => {
    expect(applyBps(100_000, 1_000)).toBe(10_000); // 10% of $1,000 = $100
  });

  it('computes the 10% finder incentive (Art 18.3)', () => {
    expect(applyBps(50_000, 1_000)).toBe(5_000);
  });

  it('rounds to whole cents', () => {
    expect(applyBps(1_949, 1_000)).toBe(195);
  });
});
