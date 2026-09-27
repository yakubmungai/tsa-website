import {
  ANNUAL_DUES_CENTS,
  ORG_TIMEZONE,
  BENEFIT_MATRIX,
  DUES_MONTH,
  ENTRY_FEE_CENTS,
  MIN_STANDING_CENTS,
  MISSED_CONTRIBUTIONS_BOARD_REFERRAL,
  MISSED_CONTRIBUTIONS_WARNING,
  NEW_MEMBER_WAIT_MONTHS,
  type BenefitEntitlement,
  type StandingTier,
} from './constants';

/**
 * A member's financial position, derived from the ledger.
 *
 * Pure — no database, no clock of its own. This is the single source of truth
 * for balances, replacing three separate copies of the same arithmetic that had
 * already begun to diverge.
 */

export interface LedgerEntryLike {
  account: string;
  amountCents: number;
  occurredAt: Date;
  /** Reversed entries are excluded from every total. */
  voidedAt: Date | null;
}

export interface StandingInput {
  entries: LedgerEntryLike[];
  /** Levies charged and not yet covered. */
  outstandingCents?: number;
  /**
   * Contributions the member missed past their deadline, unexcused.
   * Art 17.4 — a member who gave notice is not in breach.
   */
  missedContributions?: number;
  joinedAt: Date | null;
  asOf: Date;
}

export interface MemberStanding {
  /** What the member holds with TSA: everything except payouts to them. */
  netCents: number;
  /**
   * Payouts the member has received — mafao, memorial and milestone grants.
   * Art 5.4 / 17: a departing member repays what they received minus what they
   * contributed, so this is kept apart from what they hold.
   */
  receivedCents: number;
  advanceCents: number;
  entryFeeCents: number;
  duesCents: number;
  duesYear: number;
  entryFeeSettled: boolean;
  duesSettled: boolean;

  /** Advance plus current-year dues, measured against the $125 minimum. */
  standingCents: number;
  tier: StandingTier;
  benefits: BenefitEntitlement;

  /** What it would take to reach the minimum. Zero when already there. */
  shortfallCents: number;
  /** Levies charged and not yet covered. */
  outstandingCents: number;

  /** Art 4.5 — cases before the six-month mark are voluntary. */
  isWithinNewMemberWait: boolean;
  eligibleFrom: Date | null;

  /** Art 17.4 */
  missedContributions: number;
  hasWarning: boolean;
  needsBoardReferral: boolean;
}

/**
 * Calendar year and month as they read in Houston.
 *
 * Never `getMonth()` or `getFullYear()`, which use whatever timezone the
 * process happens to run in — this machine is Central, the host is UTC, and the
 * same payment would otherwise fall in different cycles depending on where the
 * code ran. That is how a levy lands in the wrong monthly cap bucket.
 */
function orgParts(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ORG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month') };
}

/**
 * The dues year runs April to March (Art 5.3 / 17.1), so a payment made in
 * February belongs to the cycle that began the previous April.
 *
 * Evaluated in Houston time: a payment at 8pm Central on 31 March is still
 * March locally, and belongs to the earlier cycle, even though it is already
 * April in UTC.
 */
export function duesYearFor(date: Date): number {
  const { year, month } = orgParts(date);
  return month >= DUES_MONTH ? year : year - 1;
}

/**
 * Money TSA paid out *to* the member. These leave the association, not the
 * member's account, so they must not reduce what the member holds.
 */
export const PAYOUT_ACCOUNTS = new Set(['BENEFIT_PAYOUT', 'MEMORIAL_GRANT', 'MILESTONE_GRANT']);

function sumFor(entries: LedgerEntryLike[], account: string): number {
  return entries
    .filter((e) => e.voidedAt === null)
    .filter((e) => e.account === account)
    .reduce((total, e) => total + e.amountCents, 0);
}

/** Sum for the given dues cycle only. */
function sumForCycle(entries: LedgerEntryLike[], account: string, duesYear: number): number {
  return entries
    .filter((e) => e.voidedAt === null)
    .filter((e) => e.account === account)
    .filter((e) => duesYearFor(e.occurredAt) === duesYear)
    .reduce((total, e) => total + e.amountCents, 0);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Art 18.9, in order. The first matching rule wins.
 *
 * "Ikiwa chini ya $125 ... mwanachama atakabidhiwa $1,500"
 * "Ikiwa ana $0 kwenye akiba tangulizi ila ana $25 ada ya uanachama ..."
 * "Ikiwa hana pesa kwenye account, mwanachama/familia watachangiwa kihiari"
 */
export function tierFor(standingCents: number, advanceCents: number, duesCents: number): StandingTier {
  if (standingCents >= MIN_STANDING_CENTS) return 'FULL';
  if (advanceCents > 0) return 'REDUCED';
  if (duesCents >= ANNUAL_DUES_CENTS) return 'MINIMAL';
  return 'VOLUNTARY';
}

export function computeStanding(input: StandingInput): MemberStanding {
  const { asOf } = input;
  // Only what had happened by `asOf`. Art 18.9 tiers are taken on the date of
  // the event, so a top-up made afterwards must not raise the tier.
  const entries = input.entries.filter((e) => e.occurredAt <= asOf);

  const duesYear = duesYearFor(asOf);

  const advanceCents = sumFor(entries, 'ADVANCE_DEPOSIT');
  const entryFeeCents = sumFor(entries, 'ENTRY_FEE');
  // Dues are per cycle: compare cycles rather than constructing a boundary
  // date, which would need the same timezone care all over again.
  const duesCents = sumForCycle(entries, 'ANNUAL_DUES', duesYear);

  const live = entries.filter((e) => e.voidedAt === null);
  const netCents = live
    .filter((e) => !PAYOUT_ACCOUNTS.has(e.account))
    .reduce((total, e) => total + e.amountCents, 0);
  // Payouts are stored as negative amounts (money out); report them positive.
  const receivedCents = live
    .filter((e) => PAYOUT_ACCOUNTS.has(e.account))
    .reduce((total, e) => total - e.amountCents, 0);

  // Only positive advance counts toward standing — an overdrawn float does not
  // offset paid dues.
  const standingCents = Math.max(0, advanceCents) + Math.max(0, duesCents);
  const tier = tierFor(standingCents, advanceCents, duesCents);

  const eligibleFrom = input.joinedAt
    ? addMonths(input.joinedAt, NEW_MEMBER_WAIT_MONTHS)
    : null;

  const missedContributions = input.missedContributions ?? 0;

  return {
    netCents,
    receivedCents,
    advanceCents,
    entryFeeCents,
    duesCents,
    duesYear,
    entryFeeSettled: entryFeeCents >= ENTRY_FEE_CENTS,
    duesSettled: duesCents >= ANNUAL_DUES_CENTS,

    standingCents,
    tier,
    benefits: BENEFIT_MATRIX[tier],

    shortfallCents: Math.max(0, MIN_STANDING_CENTS - standingCents),
    outstandingCents: input.outstandingCents ?? 0,

    isWithinNewMemberWait: eligibleFrom !== null && asOf < eligibleFrom,
    eligibleFrom,

    missedContributions,
    hasWarning:
      missedContributions >= 1 && missedContributions <= MISSED_CONTRIBUTIONS_WARNING,
    needsBoardReferral: missedContributions >= MISSED_CONTRIBUTIONS_BOARD_REFERRAL,
  };
}

/**
 * How much a levy can take from a member's advance right now.
 *
 * Never overdraws: what the advance cannot cover stays an outstanding
 * contribution against the member, which is what Art 17.4 assumes when it
 * counts missed contributions. TSA does not front the difference.
 */
export function drawableFromAdvance(advanceCents: number, chargeCents: number): number {
  if (advanceCents <= 0 || chargeCents <= 0) return 0;
  return Math.min(advanceCents, chargeCents);
}

/**
 * What to suggest a member tops up.
 *
 * Deliberately more than the bare minimum. A member who restores to exactly
 * $125 is asked again after the next case; one who adds a round $100 covers
 * roughly five. Same protection for the fund, a fraction of the payments.
 */
export function suggestedTopUpCents(standing: MemberStanding): number {
  const toMinimum = standing.shortfallCents + standing.outstandingCents;
  if (toMinimum <= 0) return 0;
  // Round up to the next whole $25, and never suggest less than $25.
  const quarter = 2_500;
  return Math.max(quarter, Math.ceil(toMinimum / quarter) * quarter);
}

/**
 * Tier from the cached balance, for lists of many members.
 *
 * The cache records which dues year its dues figure belongs to; after April
 * rolls over, last year's dues no longer count.
 */
export function tierFromCache(
  cache: { advanceCents: number; duesCents: number; duesYear: number },
  currentDuesYear: number
): { tier: StandingTier; standingCents: number; shortfallCents: number } {
  const dues = cache.duesYear === currentDuesYear ? cache.duesCents : 0;
  const standingCents = Math.max(0, cache.advanceCents) + Math.max(0, dues);
  return {
    tier: tierFor(standingCents, cache.advanceCents, dues),
    standingCents,
    shortfallCents: Math.max(0, MIN_STANDING_CENTS - standingCents),
  };
}
