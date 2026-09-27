import {
  BENEFIT_MATRIX,
  CHILD_AGE_LIMIT,
  CHILD_MUST_LIVE_IN_USA,
  CLAIM_TYPES,
  CONTRIBUTION_WINDOW_DAYS,
  DEATH_EVENTS_PER_MONTH,
  DEATH_MONTHLY_CAP_CENTS,
  HARDSHIP_EVENTS_PER_MONTH,
  HARDSHIP_MONTHLY_CAP_CENTS,
  INCLUDE_ARREARS_IN_DIVISOR,
  LEVY_SCALES_TO_BENEFIT,
  type ClaimTypeKey,
  type DivisorRule,
  type StandingTier,
} from './constants';
import { splitEvenly } from '../money';
import { addDays, nextMonthKey } from './dates';

/**
 * The arithmetic of a case: what it pays, who contributes, how much each, and
 * in which month. Pure — no database, no clock — so every rule here is tested
 * against the article it comes from.
 */

// ── What the case pays ──────────────────────────────────────────────────────

export interface BenefitSubject {
  type: ClaimTypeKey;
  subjectAge?: number | null;
  subjectLivesInUsa?: boolean | null;
}

/**
 * Which rules the case is paid under.
 *
 * Art 4.5 / 17 give the $10,000 tier to a child "wa chini ya miaka 21 aishio
 * … USA". A child 21 or over, or living abroad, is still a registered relative
 * (Art 4.4), so the case is paid at the relative tier instead.
 */
export function effectiveTypeFor(subject: BenefitSubject): { type: ClaimTypeKey; rerouted: boolean } {
  if (subject.type !== 'CHILD_DEATH') return { type: subject.type, rerouted: false };
  const tooOld = subject.subjectAge != null && subject.subjectAge >= CHILD_AGE_LIMIT;
  const abroad = CHILD_MUST_LIVE_IN_USA && subject.subjectLivesInUsa === false;
  return tooOld || abroad ? { type: 'RELATIVE_DEATH', rerouted: true } : { type: 'CHILD_DEATH', rerouted: false };
}

/** Art 18.9 — the benefit for this kind of case at the member's tier. */
export function benefitFor(type: ClaimTypeKey, tier: StandingTier): number {
  return BENEFIT_MATRIX[tier][CLAIM_TYPES[type].benefit];
}

/** What members are asked to contribute in total for a benefit. */
export function levyPoolFor(type: ClaimTypeKey, benefitCents: number): number {
  if (LEVY_SCALES_TO_BENEFIT) return benefitCents;
  return BENEFIT_MATRIX.FULL[CLAIM_TYPES[type].benefit];
}

// ── Who contributes ─────────────────────────────────────────────────────────

export interface PayerCandidate {
  id: string;
  status: string;
  archived: boolean;
  memberNumber: number | null;
  names: string;
  inArrears?: boolean;
}

/**
 * The members a case's levy is divided among, in a fixed order.
 *
 * Art 17: hardships among active members ("wanachama hai"), deaths among all
 * members. Suspended members still contribute (Art 5.5.2: "kuchanga kama
 * kawaida"). The member the case is for never pays towards it.
 *
 * Sorted by member number, then name, so a re-run gives the same remainder
 * cents to the same people.
 */
export function eligiblePayers(
  candidates: PayerCandidate[],
  rule: DivisorRule,
  claimantId: string
): PayerCandidate[] {
  const allowed = rule === 'ACTIVE_MEMBERS' ? ['ACTIVE'] : ['ACTIVE', 'SUSPENDED'];
  return candidates
    .filter((c) => !c.archived && c.id !== claimantId && allowed.includes(c.status))
    .filter((c) => INCLUDE_ARREARS_IN_DIVISOR || !c.inArrears)
    .sort(
      (a, b) =>
        (a.memberNumber ?? Number.MAX_SAFE_INTEGER) - (b.memberNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.names.localeCompare(b.names) ||
        a.id.localeCompare(b.id)
    );
}

/** Split a pool exactly: the shares always add up to the pool, to the cent. */
export function splitLevy(poolCents: number, payers: { id: string }[]): Map<string, number> {
  const shares = new Map<string, number>();
  if (payers.length === 0 || poolCents <= 0) return shares;
  const amounts = splitEvenly(poolCents, payers.length);
  payers.forEach((p, i) => shares.set(p.id, amounts[i]));
  return shares;
}

// ── Art 17 monthly caps ─────────────────────────────────────────────────────

export type CapBucket = 'HARDSHIP' | 'DEATH';

const CAPS: Record<CapBucket, { cents: number; events: number }> = {
  HARDSHIP: { cents: HARDSHIP_MONTHLY_CAP_CENTS, events: HARDSHIP_EVENTS_PER_MONTH },
  DEATH: { cents: DEATH_MONTHLY_CAP_CENTS, events: DEATH_EVENTS_PER_MONTH },
};

export interface ExistingShare {
  billingMonth: string;
  bucket: CapBucket;
  amountCents: number;
}

/**
 * The first month, from `startMonth`, in which this share fits the member's
 * cap for its bucket.
 *
 * "Ikiwa zaidi ya misiba/shida 5 au $100, mwanachama atachangia misiba mingine
 * mwezi unaofata." The two buckets are separate: a member can owe $200 of
 * deaths and $100 of hardships in the same month.
 *
 * A single share larger than the cap on its own (a small membership dividing a
 * large pool) can never fit, so it takes the first month with no other shares
 * in its bucket rather than being pushed forward forever.
 */
export function assignBillingMonth(
  existing: ExistingShare[],
  bucket: CapBucket,
  amountCents: number,
  startMonth: string
): string {
  const cap = CAPS[bucket];
  let month = startMonth;
  for (let i = 0; i < 120; i++) {
    const inMonth = existing.filter((e) => e.bucket === bucket && e.billingMonth === month);
    const total = inMonth.reduce((s, e) => s + e.amountCents, 0);
    const fits = inMonth.length < cap.events && total + amountCents <= cap.cents;
    const oversizedAlone = inMonth.length === 0 && amountCents > cap.cents;
    if (fits || oversizedAlone) return month;
    month = nextMonthKey(month);
  }
  return month;
}

/** First instant of a Houston month "YYYY-MM" (noon on the 1st, the date convention). */
export function monthStart(key: string): Date {
  return new Date(`${key}-01T18:00:00.000Z`);
}

/**
 * When a share is due. Art 17: within two weeks of the announcement — or, for a
 * share pushed into a later month by the cap, two weeks into that month.
 */
export function shareDueAt(announcedAt: Date, announceMonth: string, billingMonth: string): Date {
  const from = billingMonth === announceMonth ? announcedAt : monthStart(billingMonth);
  return addDays(from, CONTRIBUTION_WINDOW_DAYS);
}

/**
 * When a share is charged. A share in the announcement month is charged at
 * once; one deferred by the cap is charged when its month begins, so it does
 * not appear as owed before then.
 */
export function shareChargedAt(announcedAt: Date, announceMonth: string, billingMonth: string): Date {
  return billingMonth === announceMonth ? announcedAt : monthStart(billingMonth);
}
