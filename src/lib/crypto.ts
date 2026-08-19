import {
  scrypt,
  randomBytes,
  randomInt,
  timingSafeEqual,
  pbkdf2Sync,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number }
) => Promise<Buffer>;

/**
 * Password hashing.
 *
 * scrypt from node's own crypto, not PBKDF2 and not bcrypt/argon2:
 * - The previous PBKDF2 used 1,000 iterations, far below the ~210,000 OWASP
 *   suggests, and compared hashes with `===` rather than in constant time.
 * - scrypt is memory-hard, which raises the cost of offline cracking far more
 *   than iteration count alone.
 * - It is in the standard library, so there is no native module to build on the
 *   host.
 *
 * N=2^15 costs roughly 60-100ms per hash. That is fine for a login and it
 * naturally throttles brute force. Never call it in a loop.
 */
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64, maxmem: 96 * 1024 * 1024 };

/** Constant-time compare that tolerates differing lengths (timingSafeEqual throws). */
function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT.keylen, SCRYPT);
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export interface VerifyResult {
  valid: boolean;
  /** True when the stored hash used weaker parameters and should be upgraded. */
  needsRehash: boolean;
}

/**
 * Verify a password against a stored hash.
 *
 * Understands both the current scrypt format and the legacy `salt:hash`
 * PBKDF2 one, so existing accounts keep working and are upgraded silently on
 * their next successful sign-in.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<VerifyResult> {
  if (!stored) return { valid: false, needsRehash: false };

  if (stored.startsWith('scrypt$')) {
    const [, n, r, p, saltB64, hashB64] = stored.split('$');
    if (!saltB64 || !hashB64) return { valid: false, needsRehash: false };
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const derived = await scryptAsync(password.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    const valid = safeEqual(derived, expected);
    return { valid, needsRehash: valid && Number(n) < SCRYPT.N };
  }

  // Legacy: pbkdf2-sha512, 1,000 iterations, hex "salt:hash".
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return { valid: false, needsRehash: false };
  const derived = pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  const valid = safeEqual(derived, Buffer.from(originalHash, 'hex'));
  return { valid, needsRehash: valid };
}

/** SHA-256 hex. For storing lookup keys such as ticket values, never passwords. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** URL-safe random token. 32 bytes by default. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * A numeric one-time code.
 *
 * Uses randomInt, a CSPRNG. The previous implementation used Math.random(),
 * whose output is predictable from prior values.
 */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, '0');
}
