import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/**
 * Phone number handling.
 *
 * Phone is the only identifier TSA holds for every member — the roster has no
 * email column at all — so it becomes the primary way members sign in. That
 * makes normalisation load-bearing: "563-210-1022", "(563) 210 1022" and
 * "+15632101022" must all resolve to one canonical value.
 *
 * Most members are in the USA, but not all: the roster contains Tanzanian
 * (+255) numbers, so we never assume a country.
 */

/** Members are US-registered, so bare 10-digit numbers are treated as US. */
export const DEFAULT_REGION: CountryCode = 'US';

export type PhoneParseResult =
  | { ok: true; e164: string; country: CountryCode | undefined; national: string }
  | { ok: false; reason: 'empty' | 'unparseable' | 'invalid' | 'multiple' };

/**
 * Normalise a phone number to E.164 (e.g. "+15632101022").
 *
 * Deliberately strict. A number we cannot parse confidently is reported as a
 * failure for a human to fix, never guessed at — a wrong guess silently locks a
 * member out of their account, or worse, points at someone else's.
 */
export function parsePhone(input: string | null | undefined): PhoneParseResult {
  if (!input) return { ok: false, reason: 'empty' };

  const raw = input.trim();
  if (raw === '') return { ok: false, reason: 'empty' };

  // Some roster cells hold two numbers ("346-481-7991/832-677-5667"). Refuse to
  // pick one; a person has to decide which is current.
  if (/[/;,]|\bor\b/i.test(raw)) return { ok: false, reason: 'multiple' };

  const parsed = parsePhoneNumberFromString(raw, DEFAULT_REGION);
  if (!parsed) return { ok: false, reason: 'unparseable' };
  if (!parsed.isValid()) return { ok: false, reason: 'invalid' };

  return {
    ok: true,
    e164: parsed.number,
    country: parsed.country,
    national: parsed.formatNational(),
  };
}

/** Convenience wrapper: the E.164 string, or null when it cannot be normalised. */
export function toE164(input: string | null | undefined): string | null {
  const result = parsePhone(input);
  return result.ok ? result.e164 : null;
}

/** Human-readable form for the UI, falling back to the raw input. */
export function formatPhone(input: string | null | undefined): string {
  if (!input) return '';
  const result = parsePhone(input);
  return result.ok ? result.national : input;
}

/**
 * Mask a number for display where the viewer has not yet proved they own it —
 * for example the account chooser shown after a code is verified on a handset
 * shared by two members.
 */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 4) return '•'.repeat(digits.length);
  return `•••${digits.slice(-4)}`;
}

/** Why a number could not be normalised, in words a non-developer can act on. */
export function describeParseFailure(reason: Exclude<PhoneParseResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'empty':
      return 'No phone number on record';
    case 'multiple':
      return 'Contains more than one number — needs a human to pick the current one';
    case 'unparseable':
      return 'Not recognisable as a phone number';
    case 'invalid':
      return 'Wrong number of digits for its country';
  }
}
