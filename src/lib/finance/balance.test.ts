import { describe, it, expect } from 'vitest';
import {
  computeStanding,
  drawableFromAdvance,
  duesYearFor,
  suggestedTopUpCents,
  type LedgerEntryLike,
} from './balance';
import { MIN_STANDING_CENTS } from './constants';

const APRIL_2026 = new Date('2026-04-15T12:00:00Z');
const NOW = new Date('2026-09-01T12:00:00Z');

function entry(
  account: string,
  dollars: number,
  occurredAt = APRIL_2026,
  voided = false
): LedgerEntryLike {
  return {
    account,
    amountCents: Math.round(dollars * 100),
    occurredAt,
    voidedAt: voided ? new Date() : null,
  };
}

const fullyPaid: LedgerEntryLike[] = [
  entry('ADVANCE_DEPOSIT', 100),
  entry('ENTRY_FEE', 100),
  entry('ANNUAL_DUES', 25),
];

describe('duesYearFor', () => {
  it('runs the cycle April to March, as Art 5.3 sets out', () => {
    expect(duesYearFor(new Date('2026-04-15T12:00:00Z'))).toBe(2026);
    expect(duesYearFor(new Date('2026-12-31T12:00:00Z'))).toBe(2026);
    // March belongs to the cycle that began the previous April.
    expect(duesYearFor(new Date('2026-03-15T12:00:00Z'))).toBe(2025);
  });

  it('is evaluated in Houston time, not the server’s', () => {
    // Midnight UTC on 1 April is still 31 March in Houston, so this payment
    // belongs to the earlier cycle. Without an explicit timezone the answer
    // would change between a Central laptop and a UTC host.
    expect(duesYearFor(new Date('2026-04-01T00:00:00Z'))).toBe(2025);
    // Seven in the morning Houston time on 1 April is unambiguously April.
    expect(duesYearFor(new Date('2026-04-01T12:00:00Z'))).toBe(2026);
  });
});

describe('computeStanding — Art 18.9 tiers', () => {
  it('FULL when the member holds the $125 minimum', () => {
    const s = computeStanding({ entries: fullyPaid, joinedAt: null, asOf: NOW });
    expect(s.standingCents).toBe(MIN_STANDING_CENTS);
    expect(s.tier).toBe('FULL');
    expect(s.benefits.deathMemberCents).toBe(1_000_000);
    expect(s.benefits.hardshipMemberCents).toBe(300_000);
    expect(s.shortfallCents).toBe(0);
  });

  it('REDUCED when there is some advance but under $125', () => {
    const s = computeStanding({
      entries: [entry('ADVANCE_DEPOSIT', 60), entry('ANNUAL_DUES', 25)],
      joinedAt: null,
      asOf: NOW,
    });
    expect(s.tier).toBe('REDUCED');
    expect(s.benefits.deathMemberCents).toBe(150_000);
    expect(s.benefits.deathFamilyCents).toBe(500_000);
    expect(s.shortfallCents).toBe(4_000); // $40 to reach $125
  });

  it('MINIMAL when dues are paid but there is no advance', () => {
    const s = computeStanding({
      entries: [entry('ANNUAL_DUES', 25)],
      joinedAt: null,
      asOf: NOW,
    });
    expect(s.tier).toBe('MINIMAL');
    expect(s.benefits.deathMemberCents).toBe(200_000);
    expect(s.benefits.hardshipMemberCents).toBe(50_000);
  });

  it('VOLUNTARY when there is nothing on account — kihiari only', () => {
    const s = computeStanding({ entries: [], joinedAt: null, asOf: NOW });
    expect(s.tier).toBe('VOLUNTARY');
    expect(s.benefits.deathMemberCents).toBe(0);
    expect(s.shortfallCents).toBe(MIN_STANDING_CENTS);
  });

  it('does not let an overdrawn advance offset paid dues', () => {
    const s = computeStanding({
      entries: [entry('ADVANCE_DEPOSIT', -45), entry('ANNUAL_DUES', 25)],
      joinedAt: null,
      asOf: NOW,
    });
    // Standing counts only the dues, so the member is not credited for a debt.
    expect(s.standingCents).toBe(2_500);
    expect(s.tier).toBe('MINIMAL');
  });
});

describe('computeStanding — dues cycle', () => {
  it('ignores dues paid for a previous cycle', () => {
    const lastYear = computeStanding({
      entries: [entry('ANNUAL_DUES', 25, new Date('2025-04-10T00:00:00Z'))],
      joinedAt: null,
      asOf: NOW,
    });
    expect(lastYear.duesSettled).toBe(false);
    expect(lastYear.duesCents).toBe(0);
  });

  it('counts dues paid in the current cycle', () => {
    const s = computeStanding({
      entries: [entry('ANNUAL_DUES', 25, new Date('2026-04-10T00:00:00Z'))],
      joinedAt: null,
      asOf: NOW,
    });
    expect(s.duesSettled).toBe(true);
  });
});

describe('computeStanding — reversals', () => {
  it('excludes voided entries from every total', () => {
    const s = computeStanding({
      entries: [...fullyPaid, entry('ADVANCE_DEPOSIT', 500, APRIL_2026, true)],
      joinedAt: null,
      asOf: NOW,
    });
    expect(s.advanceCents).toBe(10_000);
    expect(s.tier).toBe('FULL');
  });
});

describe('computeStanding — Art 4.5 new members', () => {
  it('treats a member inside six months as still waiting', () => {
    const s = computeStanding({
      entries: fullyPaid,
      joinedAt: new Date('2026-07-01T00:00:00Z'),
      asOf: NOW,
    });
    expect(s.isWithinNewMemberWait).toBe(true);
  });

  it('treats a member past six months as eligible', () => {
    const s = computeStanding({
      entries: fullyPaid,
      joinedAt: new Date('2025-01-01T00:00:00Z'),
      asOf: NOW,
    });
    expect(s.isWithinNewMemberWait).toBe(false);
  });
});

describe('computeStanding — Art 17.4 missed contributions', () => {
  it('warns on the first and second', () => {
    for (const missed of [1, 2]) {
      const s = computeStanding({
        entries: fullyPaid,
        missedContributions: missed,
        joinedAt: null,
        asOf: NOW,
      });
      expect(s.hasWarning).toBe(true);
      expect(s.needsBoardReferral).toBe(false);
    }
  });

  it('refers to the Board on the third', () => {
    const s = computeStanding({
      entries: fullyPaid,
      missedContributions: 3,
      joinedAt: null,
      asOf: NOW,
    });
    expect(s.needsBoardReferral).toBe(true);
  });

  it('clears once the member has paid everything they missed', () => {
    const s = computeStanding({
      entries: fullyPaid,
      missedContributions: 0,
      joinedAt: null,
      asOf: NOW,
    });
    expect(s.hasWarning).toBe(false);
    expect(s.needsBoardReferral).toBe(false);
  });
});

describe('drawableFromAdvance', () => {
  it('takes the whole charge when the advance covers it', () => {
    expect(drawableFromAdvance(10_000, 1_948)).toBe(1_948);
  });

  it('takes only what is there, never overdrawing', () => {
    // The remainder stays an outstanding contribution against the member —
    // Art 17.4 assumes members can fall behind; TSA does not front it.
    expect(drawableFromAdvance(1_000, 1_948)).toBe(1_000);
  });

  it('takes nothing from an empty or negative advance', () => {
    expect(drawableFromAdvance(0, 1_948)).toBe(0);
    expect(drawableFromAdvance(-4_500, 1_948)).toBe(0);
  });
});

describe('suggestedTopUpCents', () => {
  it('suggests nothing when the member is already at the minimum', () => {
    const s = computeStanding({ entries: fullyPaid, joinedAt: null, asOf: NOW });
    expect(suggestedTopUpCents(s)).toBe(0);
  });

  it('rounds up to a whole $25 so members top up less often', () => {
    const s = computeStanding({
      entries: [entry('ADVANCE_DEPOSIT', 80), entry('ANNUAL_DUES', 25)],
      joinedAt: null,
      asOf: NOW,
    });
    // $20 short — suggest $25 rather than the bare $20.
    expect(suggestedTopUpCents(s)).toBe(2_500);
  });

  it('includes anything still outstanding, not just the shortfall', () => {
    const s = computeStanding({
      entries: [entry('ANNUAL_DUES', 25)],
      outstandingCents: 1_948,
      joinedAt: null,
      asOf: NOW,
    });
    // $100 shortfall + $19.48 outstanding = $119.48, rounded up to $125.
    expect(suggestedTopUpCents(s)).toBe(12_500);
  });
});
