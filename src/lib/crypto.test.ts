import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  sha256,
  randomToken,
  generateNumericCode,
} from './crypto';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

describe('hashPassword / verifyPassword', () => {
  it('accepts the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toMatchObject({
      valid: true,
      needsRehash: false,
    });
    await expect(verifyPassword('wrong password', hash)).resolves.toMatchObject({ valid: false });
  });

  it('produces a different hash each time, so equal passwords are not linkable', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });

  it('records its parameters so they can be raised later without breaking logins', async () => {
    expect(await hashPassword('x')).toMatch(/^scrypt\$32768\$8\$1\$/);
  });

  it('treats unicode-equivalent passwords as the same', async () => {
    // "é" composed vs decomposed — otherwise a member's password can stop
    // working depending on the keyboard or device they typed it on.
    const hash = await hashPassword('café');
    await expect(verifyPassword('café', hash)).resolves.toMatchObject({ valid: true });
  });

  it('handles missing or malformed stored hashes without throwing', async () => {
    for (const bad of [null, undefined, '', 'garbage', 'scrypt$', 'a:b']) {
      await expect(verifyPassword('x', bad as string | null)).resolves.toMatchObject({
        valid: false,
      });
    }
  });

  it('still verifies legacy pbkdf2 hashes, and flags them for upgrade', async () => {
    // The format previously stored: pbkdf2-sha512, 1,000 iterations, "salt:hash".
    const salt = randomBytes(16).toString('hex');
    const legacy = `${salt}:${pbkdf2Sync('old-password', salt, 1000, 64, 'sha512').toString('hex')}`;

    await expect(verifyPassword('old-password', legacy)).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
    await expect(verifyPassword('nope', legacy)).resolves.toMatchObject({ valid: false });
  });
});

describe('generateNumericCode', () => {
  it('always returns the requested number of digits, including leading zeros', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateNumericCode(6);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('spans the full range rather than clustering', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateNumericCode(6)));
    // Collisions in 500 draws from 1,000,000 are possible but rare.
    expect(codes.size).toBeGreaterThan(480);
  });
});

describe('sha256 / randomToken', () => {
  it('hashes deterministically', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).not.toBe(sha256('abd'));
    expect(sha256('abc')).toHaveLength(64);
  });

  it('generates unguessable, url-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => randomToken()));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
