import 'server-only';
import { db } from '../db';
import { generateNumericCode, sha256 } from '../crypto';
import type { CheckResult, StartResult, VerificationChannel, VerificationTransport } from './types';

/**
 * Local and test-environment transport.
 *
 * Exercises the real code path — a CSPRNG code, an expiry, single use, and the
 * same rate limits — but instead of sending an SMS it surfaces the code to the
 * caller so it can be shown on screen. That lets leaders test phone sign-in
 * before a Twilio account exists, and lets the flow be developed offline.
 *
 * Only the SHA-256 of the code is stored, so a database dump does not hand
 * anyone a working sign-in code.
 *
 * `index.ts` refuses to select this transport on the live site.
 */

const CODE_TTL_MS = 10 * 60_000;

/** The code most recently issued, so demo UI can display it. */
export const lastIssuedCodes = new Map<string, string>();

export const demoTransport: VerificationTransport = {
  name: 'demo',
  channels: ['demo'] as const,

  async start(phoneE164: string): Promise<StartResult> {
    const code = generateNumericCode(6);

    // Invalidate any outstanding codes for this number, so only the newest works.
    await db.verificationToken.deleteMany({ where: { target: phoneE164 } });

    await db.verificationToken.create({
      data: {
        target: phoneE164,
        token: sha256(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    lastIssuedCodes.set(phoneE164, code);
    console.log(`[verification:demo] code for ${phoneE164}: ${code}`);
    return { ok: true, channel: 'demo', providerRef: 'demo' };
  },

  async check(phoneE164: string, code: string): Promise<CheckResult> {
    const record = await db.verificationToken.findFirst({
      where: { target: phoneE164, token: sha256(code) },
    });

    if (!record) return { ok: false, reason: 'invalid_code' };

    if (record.expiresAt.getTime() < Date.now()) {
      await db.verificationToken.deleteMany({ where: { target: phoneE164 } });
      return { ok: false, reason: 'expired' };
    }

    // Consume every outstanding code for this number, so none can be replayed.
    // The previous implementation never deleted tokens at all, leaving each one
    // valid for its full lifetime after use.
    await db.verificationToken.deleteMany({ where: { target: phoneE164 } });
    lastIssuedCodes.delete(phoneE164);
    return { ok: true };
  },
};
