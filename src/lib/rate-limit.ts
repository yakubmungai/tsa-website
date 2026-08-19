import 'server-only';
import { db } from './db';

/**
 * Fixed-window rate limiting, stored in Postgres.
 *
 * Not in memory: on serverless each invocation has its own memory, so an
 * in-process counter limits nothing. Not Redis either, for now — this needs no
 * extra vendor, and at TSA's scale a single indexed upsert per check is
 * irrelevant. Swapping to Upstash later means reimplementing `consume` only.
 *
 * The counter is incremented with one atomic upsert, so concurrent requests
 * cannot both read a stale count and both be allowed through.
 */

export interface RateLimitPolicy {
  /** What is being limited, e.g. "otp:send:phone". */
  scope: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** When the current window ends, so callers can say "try again in N seconds". */
  resetAt: Date;
  retryAfterSeconds: number;
}

/**
 * Budgets.
 *
 * Sending a code costs money and rings a real person's phone, so the send
 * limits are deliberately tighter than the check limits.
 */
export const POLICIES = {
  /** Per phone number. Three codes in fifteen minutes is generous for a real member. */
  otpSendPhone: { scope: 'otp:send:phone', limit: 3, windowMs: 15 * 60_000 },
  /** Per phone per day, so nobody can be woken at 3am by a loop. */
  otpSendPhoneDaily: { scope: 'otp:send:phone:day', limit: 6, windowMs: 24 * 60 * 60_000 },
  /** Per caller IP. */
  otpSendIp: { scope: 'otp:send:ip', limit: 10, windowMs: 60 * 60_000 },
  /** Global spend circuit-breaker. */
  otpSendGlobal: { scope: 'otp:send:global', limit: 200, windowMs: 60 * 60_000 },
  /** Code-guessing attempts. Six digits is a million combinations; this caps guessing. */
  otpCheckPhone: { scope: 'otp:check:phone', limit: 8, windowMs: 15 * 60_000 },
  /** Password sign-in attempts. */
  loginPasswordEmail: { scope: 'login:password:email', limit: 10, windowMs: 15 * 60_000 },
  loginPasswordIp: { scope: 'login:password:ip', limit: 30, windowMs: 15 * 60_000 },

  /**
   * Public forms. Each one emails an officer, so without a limit they are a
   * relay for spam — and the funeral notice form could be used to send fake
   * bereavement notices to TSA's leadership.
   */
  publicFormIp: { scope: 'form:public:ip', limit: 5, windowMs: 24 * 60 * 60_000 },
  publicFormPhone: { scope: 'form:public:phone', limit: 3, windowMs: 24 * 60 * 60_000 },
  contactIp: { scope: 'form:contact:ip', limit: 3, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

function windowStartFor(windowMs: number, now: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/**
 * Count one use against a policy and report whether it is allowed.
 *
 * Fails **open** on a database error: a rate limiter that is down must not lock
 * every member out of their account. Abuse is the lesser risk here, and the
 * failure is logged.
 */
export async function consume(
  policy: RateLimitPolicy,
  key: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = windowStartFor(policy.windowMs, now);
  const resetAt = new Date(windowStart.getTime() + policy.windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000));

  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("id", "scope", "key", "windowStart", "count", "updatedAt")
      VALUES (gen_random_uuid(), ${policy.scope}, ${key}, ${windowStart}, 1, now())
      ON CONFLICT ("scope", "key", "windowStart")
      DO UPDATE SET "count" = "RateLimitBucket"."count" + 1, "updatedAt" = now()
      RETURNING "count"
    `;

    const count = rows[0]?.count ?? 1;
    return {
      allowed: count <= policy.limit,
      remaining: Math.max(0, policy.limit - count),
      resetAt,
      retryAfterSeconds,
    };
  } catch (err) {
    console.error('[rate-limit] check failed, allowing request', policy.scope, err);
    return { allowed: true, remaining: policy.limit, resetAt, retryAfterSeconds };
  }
}

/**
 * Apply several policies at once.
 *
 * Every policy is consumed even if an earlier one already failed, so a caller
 * cannot use a cheap limit to shield an expensive one from being counted.
 */
export async function consumeAll(
  checks: { policy: RateLimitPolicy; key: string }[]
): Promise<RateLimitResult> {
  const results = await Promise.all(checks.map((c) => consume(c.policy, c.key)));
  const blocked = results.find((r) => !r.allowed);
  return blocked ?? results[0];
}

/** Housekeeping: drop windows that can no longer be current. */
export async function pruneRateLimits(olderThanMs = 48 * 60 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const { count } = await db.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return count;
}
