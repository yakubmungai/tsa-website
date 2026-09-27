import { describe, it, expect } from 'vitest';
import { heroStateFor } from './hero';

describe('heroStateFor', () => {
  it('leads with what is owed, even before the roster is confirmed', () => {
    expect(heroStateFor({ outstandingCents: 1948, shortfallCents: 0, showCompliance: false })).toBe('owe');
  });

  it('makes no claim about the $125 until the roster is confirmed', () => {
    expect(heroStateFor({ outstandingCents: 0, shortfallCents: 5000, showCompliance: false })).toBe('neutral');
  });

  it('is red below $125 and green at or above it once confirmed', () => {
    expect(heroStateFor({ outstandingCents: 0, shortfallCents: 5000, showCompliance: true })).toBe('low');
    expect(heroStateFor({ outstandingCents: 0, shortfallCents: 0, showCompliance: true })).toBe('ok');
  });
});
