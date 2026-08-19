'use server';

import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { defineAction, actionError } from '@/lib/action';
import { phoneSchema, otpCodeSchema } from '@/lib/validations';
import { randomToken, sha256 } from '@/lib/crypto';
import { maskPhone } from '@/lib/phone';
import { consume, consumeAll, POLICIES } from '@/lib/rate-limit';
import { getTransport, isCodeVisibleOnScreen, lastIssuedCodes } from '@/lib/verification';
import { writeAudit } from '@/lib/audit';

/**
 * Phone sign-in.
 *
 * Two steps, with a server-minted ticket between them:
 *
 *   requestPhoneCode  -> a code is delivered
 *   verifyPhoneCode   -> code checked, ticket issued listing which accounts
 *                        this verified number may unlock
 *   signIn('phone-otp', { ticket, selection })  -> session
 *
 * The ticket is what closes the account-takeover hole. Previously the client
 * named the member at the final step and nothing bound that choice to the code,
 * so anyone who knew a member's phone number could send a code to their own
 * email and claim that member's profile and ledger.
 *
 * It is also required rather than merely tidy: Twilio Verify consumes a
 * verification on first check, so the account chooser that shared handsets need
 * cannot re-verify, and must rely on something the server already vouched for.
 */

const TICKET_TTL_MS = 5 * 60_000;

/** Candidate accounts a verified number may unlock. */
export interface TicketCandidate {
  /** `user` — an existing login. `claim` — a member who has never activated one. */
  kind: 'user' | 'claim';
  id: string;
  displayName: string;
}

async function requestIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip');
    if (!ip) return null;
    return createHash('sha256')
      .update(`${process.env.AUDIT_IP_PEPPER ?? ''}:${ip}`)
      .digest('hex')
      .slice(0, 32);
  } catch {
    return null;
  }
}

/** Keep responses from finishing suspiciously early when there is no account. */
async function padTo(startedAt: number, minimumMs = 400) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < minimumMs) {
    await new Promise((resolve) => setTimeout(resolve, minimumMs - elapsed));
  }
}

/**
 * Send a one-time code.
 *
 * Always reports the same thing whether or not the number belongs to a member,
 * and takes about the same time either way. The previous lookup returned a real
 * member's name and internal id for any phone number — and matched with
 * `contains`, so a single digit was enough to retrieve someone's profile.
 */
export const requestPhoneCode = defineAction({
  name: 'requestPhoneCode',
  guard: 'public',
  schema: z
    .object({
      phone: phoneSchema,
      channel: z.enum(['sms', 'whatsapp', 'call']).optional(),
    })
    .strict(),
  async handler(input): Promise<{ sent: true; codeVisible: boolean; demoCode?: string }> {
    const startedAt = Date.now();
    const phoneE164 = input.phone;
    const ipHash = await requestIpHash();

    const limit = await consumeAll([
      { policy: POLICIES.otpSendPhone, key: phoneE164 },
      { policy: POLICIES.otpSendPhoneDaily, key: phoneE164 },
      { policy: POLICIES.otpSendIp, key: ipHash ?? 'unknown-ip' },
      { policy: POLICIES.otpSendGlobal, key: 'all' },
    ]);

    if (!limit.allowed) {
      await db.otpRequest.create({
        data: { phoneE164, channel: 'n/a', purpose: 'LOGIN', outcome: 'RATE_LIMITED', ipHash },
      });
      await padTo(startedAt);
      actionError(
        `Too many attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) and try again.`
      );
    }

    // Does this number belong to anyone? The answer never reaches the caller.
    const [users, claimable] = await Promise.all([
      db.user.count({ where: { phoneE164 } }),
      db.member.count({ where: { phoneE164, archivedAt: null, user: { is: null } } }),
    ]);
    const known = users + claimable > 0;

    if (!known) {
      await db.otpRequest.create({
        data: { phoneE164, channel: 'n/a', purpose: 'LOGIN', outcome: 'NO_ACCOUNT', ipHash },
      });
      // Deliberately identical to the success response.
      await padTo(startedAt);
      return { sent: true, codeVisible: false };
    }

    const transport = getTransport();
    const channel = input.channel && transport.channels.includes(input.channel)
      ? input.channel
      : transport.channels[0];

    const result = await transport.start(phoneE164, channel);

    await db.otpRequest.create({
      data: {
        phoneE164,
        channel,
        purpose: 'LOGIN',
        outcome: result.ok ? 'SENT' : 'TRANSPORT_ERROR',
        providerRef: result.ok ? (result.providerRef ?? null) : null,
        ipHash,
      },
    });

    if (!result.ok) {
      await padTo(startedAt);
      actionError('We could not send your code right now. Please try again shortly.');
    }

    const codeVisible = isCodeVisibleOnScreen();
    await padTo(startedAt);
    return {
      sent: true,
      codeVisible,
      demoCode: codeVisible ? lastIssuedCodes.get(phoneE164) : undefined,
    };
  },
});

/**
 * Check a code and issue a sign-in ticket.
 *
 * The candidate accounts are resolved here, server-side, from the number that
 * was just proved — never from anything the caller supplied.
 */
export const verifyPhoneCode = defineAction({
  name: 'verifyPhoneCode',
  guard: 'public',
  schema: z.object({ phone: phoneSchema, code: otpCodeSchema }).strict(),
  async handler(input): Promise<{ ticket: string; candidates: TicketCandidate[] }> {
    const phoneE164 = input.phone;

    const limit = await consume(POLICIES.otpCheckPhone, phoneE164);
    if (!limit.allowed) {
      await writeAudit({
        action: 'LOGIN_FAILED',
        entityType: 'Phone',
        entityId: maskPhone(phoneE164),
        summary: 'Too many code attempts',
        success: false,
        failureReason: 'RATE_LIMITED',
        actor: { label: `phone ${maskPhone(phoneE164)}`, role: 'ANON' },
      });
      actionError(
        `Too many attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) and try again.`
      );
    }

    const result = await getTransport().check(phoneE164, input.code);
    if (!result.ok) {
      await writeAudit({
        action: 'LOGIN_FAILED',
        entityType: 'Phone',
        entityId: maskPhone(phoneE164),
        summary: `Code check failed (${result.reason})`,
        success: false,
        failureReason: result.reason,
        actor: { label: `phone ${maskPhone(phoneE164)}`, role: 'ANON' },
      });
      actionError(
        result.reason === 'expired'
          ? 'That code has expired. Please request a new one.'
          : 'That code is not correct. Please check and try again.'
      );
    }

    // Possession of the number is now proved. Only now do we look up who it
    // belongs to, and only from the verified number.
    const [users, claimable] = await Promise.all([
      db.user.findMany({
        where: { phoneE164 },
        include: { member: { select: { names: true, archivedAt: true } } },
      }),
      db.member.findMany({
        where: { phoneE164, archivedAt: null, user: { is: null } },
        select: { id: true, names: true },
      }),
    ]);

    const candidates: TicketCandidate[] = [
      ...users
        .filter((u) => !u.member?.archivedAt)
        .map((u) => ({
          kind: 'user' as const,
          id: u.id,
          displayName: u.member?.names ?? u.email ?? 'TSA account',
        })),
      ...claimable.map((m) => ({ kind: 'claim' as const, id: m.id, displayName: m.names })),
    ];

    if (candidates.length === 0) {
      actionError('No active TSA account uses this number. Please contact a TSA leader.');
    }

    const ticket = randomToken(32);
    await db.authTicket.create({
      data: {
        tokenHash: sha256(ticket),
        purpose: 'PHONE_LOGIN',
        phoneE164,
        candidates: candidates as unknown as object,
        ipHash: await requestIpHash(),
        expiresAt: new Date(Date.now() + TICKET_TTL_MS),
      },
    });

    return { ticket, candidates };
  },
});
