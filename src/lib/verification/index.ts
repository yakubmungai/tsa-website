import 'server-only';
import { isDemoMode, isProductionHost } from '../demo';
import { demoTransport } from './demo';
import { twilioTransport, isTwilioConfigured } from './twilio';
import type { VerificationTransport } from './types';

export type { VerificationChannel, CheckResult, StartResult } from './types';
export { lastIssuedCodes } from './demo';

/**
 * Choose how one-time codes are delivered.
 *
 * Twilio when it is configured. Otherwise the demo transport, which shows the
 * code on screen instead of sending it — but never on the live site: serving
 * codes to whoever asks for them would be an open door to every account.
 */
export function getTransport(): VerificationTransport {
  if (isTwilioConfigured()) return twilioTransport;

  if (isProductionHost()) {
    throw new Error(
      'No verification transport is configured. Set TWILIO_ACCOUNT_SID, ' +
        'TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID before enabling phone sign-in.'
    );
  }

  return demoTransport;
}

/**
 * True when codes are shown on screen rather than delivered.
 *
 * The sign-in page uses this to display the code and say plainly that no
 * message was sent, so nobody waits for an SMS that is not coming.
 */
export function isCodeVisibleOnScreen(): boolean {
  return !isTwilioConfigured() && (isDemoMode() || !isProductionHost());
}
