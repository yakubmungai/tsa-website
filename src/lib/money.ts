/**
 * Money handling for TSA.
 *
 * Every amount in new code is an integer number of **cents**. Never a float,
 * never a Prisma Decimal:
 *
 * - Stripe's API is natively in minor units, so each conversion we avoid is a
 *   rounding bug we don't ship.
 * - Prisma's Decimal deserialises to a Decimal.js instance that is not
 *   serialisable across the React Server Component boundary.
 * - The KATIBA divides fixed pools among members ($3,000 / 154 = $19.4805…),
 *   which needs an exact remainder distribution. That is only expressible in
 *   integers.
 *
 * This module is pure — no database, no I/O — so it is cheap to test.
 */

export type Cents = number;

/** Largest amount we will accept anywhere. Guards against typos and overflow. */
export const MAX_CENTS: Cents = 100_000_00; // $100,000.00

export class MoneyError extends Error {}

function assertSafe(cents: number): asserts cents is Cents {
  if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
    throw new MoneyError(`Amount must be a whole number of cents, got ${cents}`);
  }
  if (Math.abs(cents) > MAX_CENTS) {
    throw new MoneyError(`Amount ${cents} exceeds the maximum of ${MAX_CENTS} cents`);
  }
}

/**
 * Parse user input into cents.
 *
 * Accepts "65", "$65", "65.5", "1,234.56", " -25.00 ". Rejects anything with
 * more than two decimal places rather than silently rounding someone's money.
 */
export function parseUSDToCents(input: string | number): Cents {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new MoneyError(`Invalid amount: ${input}`);
    return parseUSDToCents(input.toFixed(2));
  }

  const cleaned = input.trim().replace(/[$,\s]/g, '');
  if (cleaned === '') throw new MoneyError('Amount is required');

  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new MoneyError(
      `"${input}" is not a valid amount. Use a number with at most two decimal places.`
    );
  }

  const [, sign, whole, frac = ''] = match;
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  const signed = sign === '-' ? -cents : cents;
  assertSafe(signed);
  return signed;
}

/**
 * Convert a decimal *string* to cents.
 *
 * For migrating legacy Prisma Decimal columns. Always pass `decimal.toString()`
 * — `Number(decimal) * 100` is wrong, because 0.1 * 100 === 10.000000000000002.
 */
export function centsFromDecimalString(value: string): Cents {
  return parseUSDToCents(value);
}

/** Format cents for display, e.g. 6726 -> "$67.26". */
export function formatUSD(cents: Cents, opts?: { sign?: 'auto' | 'always' }): string {
  assertSafe(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body = `$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;

  if (negative) return `-${body}`;
  if (opts?.sign === 'always') return `+${body}`;
  return body;
}

export function sumCents(values: Cents[]): Cents {
  const total = values.reduce((acc, v) => acc + v, 0);
  assertSafe(total);
  return total;
}

/**
 * Split a total into `n` shares that sum to **exactly** the total.
 *
 * This is the KATIBA's levy maths (Art 17.2/17.3): $3,000 across 154 members is
 * $19.4805… each. Rounding every share the same way either over- or
 * under-collects, and the case can then never reconcile to the pool. Instead the
 * remainder is handed out one cent at a time to the first `remainder` shares.
 *
 * Callers must order the recipients deterministically (by member number) so a
 * re-run produces the same allocation.
 *
 *   splitEvenly(300000, 154) -> 146 shares of 1948, 8 shares of 1949
 */
export function splitEvenly(total: Cents, n: number): Cents[] {
  assertSafe(total);
  if (!Number.isInteger(n) || n <= 0) {
    throw new MoneyError(`Cannot split among ${n} recipients`);
  }

  const base = Math.floor(total / n);
  const remainder = total - base * n;

  return Array.from({ length: n }, (_, i) => (i < remainder ? base + 1 : base));
}

/** Percentage of an amount in basis points (1000 bps = 10%), rounded half up. */
export function applyBps(cents: Cents, bps: number): Cents {
  assertSafe(cents);
  return Math.round((cents * bps) / 10_000);
}
