/**
 * Delivery of one-time codes.
 *
 * Abstracted behind a transport so the login flow can be built, tested and
 * demonstrated before a Twilio account exists, and so the channel can change
 * (SMS today, WhatsApp once Meta approves a sender) without touching the flow.
 */

export type VerificationChannel = 'sms' | 'whatsapp' | 'call' | 'demo';

export type StartResult =
  | { ok: true; channel: VerificationChannel; providerRef?: string }
  | { ok: false; reason: 'unsupported_channel' | 'invalid_number' | 'transport_error'; detail?: string };

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_code' | 'expired' | 'max_attempts' | 'transport_error' };

export interface VerificationTransport {
  readonly name: string;
  /** Channels this transport can actually deliver on, best first. */
  readonly channels: readonly VerificationChannel[];
  start(phoneE164: string, channel: VerificationChannel): Promise<StartResult>;
  check(phoneE164: string, code: string): Promise<CheckResult>;
}
