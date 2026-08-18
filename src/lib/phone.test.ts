import { describe, it, expect } from 'vitest';
import { parsePhone, toE164, formatPhone, maskPhone } from './phone';

describe('parsePhone', () => {
  it('normalises the formats found in the member roster', () => {
    // Real formats from "Database for web.xlsx"
    expect(toE164('563-210-1022')).toBe('+15632101022');
    expect(toE164('832-332-5054')).toBe('+18323325054');
    expect(toE164('(713) 585-6038')).toBe('+17135856038');
    expect(toE164('206.372.1693')).toBe('+12063721693');
    expect(toE164('  919 908 4200  ')).toBe('+19199084200');
    expect(toE164('+1 346 400 7329')).toBe('+13464007329');
  });

  it('treats the same number written differently as one identity', () => {
    const variants = ['832-884-4222', '(832) 884-4222', '8328844222', '+18328844222'];
    const normalised = new Set(variants.map(toE164));
    expect(normalised.size).toBe(1);
    expect([...normalised][0]).toBe('+18328844222');
  });

  it('handles the Tanzanian numbers in the roster', () => {
    // The roster is not all-US, so a US assumption would silently corrupt these.
    const result = parsePhone('+255 743 511 862');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe('+255743511862');
      expect(result.country).toBe('TZ');
    }
  });

  it('refuses to guess when a cell holds two numbers', () => {
    // "Yakub J. J. Mungai" has "346-481-7991/832-677-5667" on record.
    const result = parsePhone('346-481-7991/832-677-5667');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('multiple');
  });

  it('reports unrecoverable numbers instead of guessing', () => {
    // A wrong guess locks a member out, or points at another member's account.
    expect(parsePhone('349-460-602').ok).toBe(false); // 9 digits
    expect(parsePhone('1 412 923 83662').ok).toBe(false); // stray digit
    expect(parsePhone('not a phone').ok).toBe(false);
    expect(parsePhone('').ok).toBe(false);
    expect(parsePhone(null).ok).toBe(false);
    expect(parsePhone(undefined).ok).toBe(false);
  });

  it('distinguishes empty from invalid, so reports can be actioned differently', () => {
    const empty = parsePhone('');
    const invalid = parsePhone('349-460-602');
    expect(empty.ok || invalid.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe('empty');
    if (!invalid.ok) expect(invalid.reason).not.toBe('empty');
  });
});

describe('formatPhone', () => {
  it('renders a readable national format', () => {
    expect(formatPhone('+15632101022')).toBe('(563) 210-1022');
  });

  it('falls back to the raw value rather than showing nothing', () => {
    expect(formatPhone('349-460-602')).toBe('349-460-602');
    expect(formatPhone('')).toBe('');
  });
});

describe('maskPhone', () => {
  it('reveals only the last four digits', () => {
    // Used in the account chooser for handsets shared between spouses, where
    // the viewer has proved possession of the phone but not which account.
    expect(maskPhone('+18328844222')).toBe('•••4222');
  });
});
