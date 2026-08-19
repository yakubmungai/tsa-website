/**
 * Every monetary rule in the association, in one place.
 *
 * Each value cites the article it comes from. The constitution is amended every
 * two years (Art 19.5), so when a figure changes this file is the only place it
 * should need changing — and a reviewer can check each line against the text.
 *
 * All amounts are integer cents.
 */

/** TSA is registered in Houston, so business dates are Central time. */
export const ORG_TIMEZONE = 'America/Chicago';

// ── Joining and standing ────────────────────────────────────────────────────

/** Art 5.3 — kiingilio. Non-refundable. */
export const ENTRY_FEE_CENTS = 10_000;

/** Art 5.3 — akiba tangulizi. Refundable. The float levies draw from. */
export const ADVANCE_REQUIRED_CENTS = 10_000;

/** Art 5.3 / 17.1 — ada, due every April. Non-refundable. */
export const ANNUAL_DUES_CENTS = 2_500;

/**
 * Art 6.2 / 18.9 — the $125 a member must hold to receive full benefits.
 * Advance ($100) plus current-year dues ($25).
 */
export const MIN_STANDING_CENTS = ADVANCE_REQUIRED_CENTS + ANNUAL_DUES_CENTS;

/** Art 6.2 — days to restore the float after it falls below the minimum. */
export const FLOAT_RESTORE_DAYS = 30;

/** Art 5.3 / 17.1 — dues fall due in April. */
export const DUES_MONTH = 4;

// ── Levies ──────────────────────────────────────────────────────────────────

/** Art 17.2 — hardship pool, divided among active members. */
export const HARDSHIP_POOL_CENTS = 300_000;

/** Art 17.3 — death of a member or their child under 21, divided. */
export const DEATH_POOL_CENTS = 1_000_000;

/** Art 17.2 — most a member contributes to hardships in one month. */
export const HARDSHIP_MONTHLY_CAP_CENTS = 10_000;

/** Art 17.3 — most a member contributes to deaths in one month. */
export const DEATH_MONTHLY_CAP_CENTS = 20_000;

/**
 * Art 17.2 / 17.3 — event counts per month.
 *
 * Deliberately separate buckets: a member can legitimately owe $300 in a month,
 * $200 of deaths plus $100 of hardships. Merging them would under-collect.
 */
export const HARDSHIP_EVENTS_PER_MONTH = 5;
export const DEATH_EVENTS_PER_MONTH = 3;

/** Art 17.2 / 17.3 — days to contribute once a case is announced. */
export const CONTRIBUTION_WINDOW_DAYS = 14;

// ── Eligibility ─────────────────────────────────────────────────────────────

/** Art 4.5 / 5.3 — before this, a new member's cases are voluntary (kihiari). */
export const NEW_MEMBER_WAIT_MONTHS = 6;

/** Art 4.4 — a member must report a hardship within this many days. */
export const REPORT_WITHIN_DAYS = 7;

/** Art 4.5 — most hardship events one member may draw on in five years. */
export const HARDSHIP_EVENTS_PER_5_YEARS = 5;

/** Art 4.5 — a further case for the same member waits this long. */
export const REPEAT_CASE_DEFERRAL_MONTHS = 3;

// ── Penalties and incentives ────────────────────────────────────────────────

/** Art 6.2 — 10% of what TSA borrowed because an advance was short. */
export const BORROW_PENALTY_BPS = 1_000;

/** Art 18.3 — 10% to whoever brings in an outside donation. */
export const FINDER_INCENTIVE_BPS = 1_000;

/** Art 18.4 — set aside from each event paid out, managed by the CEO. */
export const MOTISHA_PER_EVENT_CENTS = 20_000;

/** Art 4.3 — toward a memorial. Not handed over; a leader co-manages it. */
export const MEMORIAL_GRANT_CENTS = 30_000;

/** Art 5.4 — a departing member may repay at this rate per month. */
export const EXIT_INSTALMENT_CENTS = 5_000;

// ── Art 17.4 — missed contributions ─────────────────────────────────────────

/**
 * "Mwanachama asipochangia shida/msiba 3 bila taarifa yeyote/isiojitosheleza"
 *
 * First and second missed contributions draw a warning; the third goes to the
 * Board of Trustees, which hears the member and decides.
 *
 * The software flags and records. It never suspends, expels, or withholds
 * benefits on its own — Art 17.4 gives that to the Board.
 */
export const MISSED_CONTRIBUTIONS_WARNING = 2;
export const MISSED_CONTRIBUTIONS_BOARD_REFERRAL = 3;

// ── Art 18.9 — benefit tiers ────────────────────────────────────────────────

export type StandingTier = 'FULL' | 'REDUCED' | 'MINIMAL' | 'VOLUNTARY';

export interface BenefitEntitlement {
  /** Art 18.1 — death of a member or their child under 21. */
  deathMemberCents: number;
  deathFamilyCents: number;
  /** Art 18.2 — hardship for a member or a registered relative. */
  hardshipMemberCents: number;
  hardshipFamilyCents: number;
}

/**
 * Art 18.1, 18.2 and 18.9 read together.
 *
 * NOTE — this table encodes a reading, not a certainty. Art 18.1/18.2 give a
 * three-value ladder ($10,000/$5,000/$2,000 and $3,000/$1,500/$500), while
 * Art 18.9 separately describes "under $125 → member $1,500, family $5,000".
 * The two framings do not compose unambiguously. The Board has been asked to
 * confirm the intended matrix; when it does, only this object changes.
 */
export const BENEFIT_MATRIX: Record<StandingTier, BenefitEntitlement> = {
  // Holds the full $125.
  FULL: {
    deathMemberCents: 1_000_000,
    deathFamilyCents: 0,
    hardshipMemberCents: 300_000,
    hardshipFamilyCents: 0,
  },
  // Some advance, but under $125.
  REDUCED: {
    deathMemberCents: 150_000,
    deathFamilyCents: 500_000,
    hardshipMemberCents: 150_000,
    hardshipFamilyCents: 0,
  },
  // No advance, but the year's dues are paid.
  MINIMAL: {
    deathMemberCents: 200_000,
    deathFamilyCents: 0,
    hardshipMemberCents: 50_000,
    hardshipFamilyCents: 0,
  },
  // Nothing on account — support is voluntary (kihiari) only.
  VOLUNTARY: {
    deathMemberCents: 0,
    deathFamilyCents: 0,
    hardshipMemberCents: 0,
    hardshipFamilyCents: 0,
  },
};

/**
 * Whether a member in arrears still counts in the ÷N divisor.
 *
 * Open question for the Board. Including everyone lowers each share but raises
 * collection risk; excluding them makes the compliant pay more.
 *
 * The beneficiary is excluded regardless — otherwise the pool only ever reaches
 * (N−1)/N of its target and every case lands short.
 */
export const INCLUDE_ARREARS_IN_DIVISOR = true;
