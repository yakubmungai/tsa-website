import 'server-only';
import type { CheckResult, StartResult, VerificationChannel, VerificationTransport } from './types';

/**
 * Twilio Verify, over plain fetch.
 *
 * The `twilio` npm package is a large CommonJS SDK; this needs exactly two HTTP
 * calls, so it is not worth the serverless bundle.
 *
 * Two properties of Verify shape the login flow:
 *
 *  1. Twilio Verify is exempt from US A2P 10DLC brand registration when used
 *     only for verification, which avoids weeks of paperwork before members can
 *     sign in.
 *  2. A successful check **consumes** the verification — it cannot be checked
 *     twice. That is why the account chooser for shared handsets runs off a
 *     server-minted ticket rather than re-verifying.
 *
 * Login and consent codes use separate Verify Services, because Twilio permits
 * only one pending verification per (service, phone): a member approving a
 * delegation while signing in would otherwise collide.
 */

const API_ROOT = 'https://verify.twilio.com/v2/Services';

function credentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) return null;
  return {
    serviceSid,
    header: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
  };
}

export function isTwilioConfigured(): boolean {
  return credentials() !== null;
}

async function post(
  path: string,
  body: Record<string, string>
): Promise<{ status: number; json: Record<string, unknown> }> {
  const creds = credentials();
  if (!creds) throw new Error('Twilio is not configured');

  const res = await fetch(`${API_ROOT}/${creds.serviceSid}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: creds.header,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
    // Never let a slow provider hold a request open indefinitely.
    signal: AbortSignal.timeout(10_000),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON error bodies are possible; status alone is enough.
  }
  return { status: res.status, json };
}

export const twilioTransport: VerificationTransport = {
  name: 'twilio',

  get channels(): readonly VerificationChannel[] {
    // WhatsApp needs a Meta-approved sender, which takes weeks to obtain, so it
    // is opt-in. Ordered best-first: WhatsApp is where this membership already
    // talks to each other, SMS is the fallback that always works.
    return process.env.TWILIO_WHATSAPP_ENABLED === 'true'
      ? (['whatsapp', 'sms', 'call'] as const)
      : (['sms', 'call'] as const);
  },

  async start(phoneE164: string, channel: VerificationChannel): Promise<StartResult> {
    if (!this.channels.includes(channel)) {
      return { ok: false, reason: 'unsupported_channel' };
    }
    try {
      const { status, json } = await post('Verifications', { To: phoneE164, Channel: channel });
      if (status >= 200 && status < 300) {
        return { ok: true, channel, providerRef: String(json.sid ?? '') };
      }
      // 60200 invalid parameter, 60033 invalid To number.
      const code = Number(json.code ?? 0);
      if (code === 60200 || code === 60033) return { ok: false, reason: 'invalid_number' };
      return { ok: false, reason: 'transport_error', detail: String(json.message ?? status) };
    } catch (err) {
      return {
        ok: false,
        reason: 'transport_error',
        detail: err instanceof Error ? err.message : 'unknown',
      };
    }
  },

  async check(phoneE164: string, code: string): Promise<CheckResult> {
    try {
      const { status, json } = await post('VerificationCheck', { To: phoneE164, Code: code });

      // 404 means no pending verification: expired, or already consumed.
      if (status === 404) return { ok: false, reason: 'expired' };
      if (status < 200 || status >= 300) {
        const twilioCode = Number(json.code ?? 0);
        if (twilioCode === 60202) return { ok: false, reason: 'max_attempts' };
        return { ok: false, reason: 'transport_error' };
      }

      return json.status === 'approved' ? { ok: true } : { ok: false, reason: 'invalid_code' };
    } catch {
      return { ok: false, reason: 'transport_error' };
    }
  },
};
