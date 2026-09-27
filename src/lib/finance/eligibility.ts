import {
  HARDSHIP_EVENTS_PER_5_YEARS,
  HARDSHIP_EVENTS_WINDOW_YEARS,
  NEW_MEMBER_WAIT_MONTHS,
  REPEAT_CASE_DEFERRAL_MONTHS,
  REPORT_WITHIN_DAYS,
  type ClaimTypeKey,
  type StandingTier,
} from './constants';
import { benefitFor, effectiveTypeFor, levyPoolFor } from './levy';
import { daysBetween } from './dates';

/**
 * What the reviewer should know about a case before deciding.
 *
 * These are flags, never decisions. The constitution gives the decision to the
 * Katibu/Muhakiki (Art 12.3) and, for the hard cases, the Board. The software
 * points at the rule and the evidence; a person decides.
 */

export type FlagCode =
  | 'LATE_REPORT'
  | 'NEW_MEMBER_WAIT'
  | 'EVENT_LIMIT'
  | 'REPEAT_WITHIN_3_MONTHS'
  | 'RELATIVE_NOT_REGISTERED'
  | 'CHILD_REROUTED'
  | 'MEMBER_ONLY_CATEGORY'
  | 'ILLNESS_SCOPE'
  | 'VOLUNTARY_TIER'
  | 'BELOW_MINIMUM'
  | 'JOIN_DATE_ESTIMATED';

export interface EligibilityFlag {
  code: FlagCode;
  /** warning: the reviewer should look closely. info: context only. */
  severity: 'warning' | 'info';
  article: string;
  /** Values the message needs, e.g. how many days late. */
  params?: Record<string, string | number>;
}

export interface EligibilityInput {
  type: ClaimTypeKey;
  relationship: 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT_GUARDIAN' | 'SIBLING';
  subjectName: string;
  subjectAge?: number | null;
  subjectLivesInUsa?: boolean | null;
  hardshipCategory?: 'ILLNESS_CRITICAL' | 'IMMIGRATION_DETENTION' | 'FIRE' | null;
  eventDate: Date;
  reportedAt: Date;
  member: {
    joinedAt: Date | null;
    joinedAtEstimated: boolean;
    husbandWife: string | null;
    parents: string[];
    children: string[];
    siblings: string[];
  };
  /** The member's standing on the event date (Art 18.9). */
  tierAtEvent: StandingTier;
  shortfallAtEventCents: number;
  /** Other cases for the same member that were approved or paid. */
  priorCases: { eventDate: Date }[];
}

export interface EligibilityResult {
  flags: EligibilityFlag[];
  effectiveType: ClaimTypeKey;
  /** The benefit the rules suggest. The reviewer can change it, with a note. */
  suggestedBenefitCents: number;
  suggestedLevyPoolCents: number;
  /** The rules point to kihiari (voluntary) support rather than a levy. */
  suggestVoluntary: boolean;
  /** Art 4.5 — announce no earlier than this, when a recent case defers it. */
  announceNotBefore: Date | null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Loose name match: case, accents, punctuation and word order ignored. */
export function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);
  const wa = norm(a);
  const wb = norm(b);
  if (wa.length === 0 || wb.length === 0) return false;
  // Every word of the shorter name appears in the longer one.
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return short.every((w) => long.includes(w));
}

function registeredList(input: EligibilityInput): string[] {
  const m = input.member;
  switch (input.relationship) {
    case 'SPOUSE':
      return m.husbandWife ? [m.husbandWife] : [];
    case 'CHILD':
      return m.children;
    case 'PARENT_GUARDIAN':
      return m.parents;
    case 'SIBLING':
      return m.siblings;
    default:
      return [];
  }
}

export function assessEligibility(input: EligibilityInput): EligibilityResult {
  const flags: EligibilityFlag[] = [];

  // Art 4.3 — "Mwanachama atatakiwa kutoa taarifa za shida/msiba ndani ya siku 7."
  const daysToReport = daysBetween(input.eventDate, input.reportedAt);
  if (daysToReport > REPORT_WITHIN_DAYS) {
    flags.push({ code: 'LATE_REPORT', severity: 'warning', article: 'Art 4.3', params: { days: daysToReport } });
  }

  // Art 4.5 — a new member's cases are voluntary until six months.
  let withinWait = false;
  if (input.member.joinedAt) {
    const eligibleFrom = addMonths(input.member.joinedAt, NEW_MEMBER_WAIT_MONTHS);
    if (input.eventDate < eligibleFrom) {
      withinWait = true;
      flags.push({ code: 'NEW_MEMBER_WAIT', severity: 'warning', article: 'Art 4.5' });
    }
    if (input.member.joinedAtEstimated) {
      flags.push({ code: 'JOIN_DATE_ESTIMATED', severity: 'info', article: 'Art 4.5' });
    }
  } else {
    flags.push({ code: 'JOIN_DATE_ESTIMATED', severity: 'info', article: 'Art 4.5' });
  }

  // Art 4.5 — five cases in five years, and a second within three months waits.
  const windowStart = addMonths(input.eventDate, -12 * HARDSHIP_EVENTS_WINDOW_YEARS);
  const inWindow = input.priorCases.filter((c) => c.eventDate >= windowStart && c.eventDate <= input.eventDate);
  if (inWindow.length >= HARDSHIP_EVENTS_PER_5_YEARS) {
    flags.push({ code: 'EVENT_LIMIT', severity: 'warning', article: 'Art 4.5', params: { count: inWindow.length } });
  }
  const recent = input.priorCases
    .filter((c) => c.eventDate <= input.eventDate && c.eventDate > addMonths(input.eventDate, -REPEAT_CASE_DEFERRAL_MONTHS))
    .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())[0];
  const announceNotBefore = recent ? addMonths(recent.eventDate, REPEAT_CASE_DEFERRAL_MONTHS) : null;
  if (recent) {
    flags.push({ code: 'REPEAT_WITHIN_3_MONTHS', severity: 'warning', article: 'Art 4.5' });
  }

  // Art 4.4 — the relative must be on the member's contract.
  if (input.relationship !== 'SELF') {
    const list = registeredList(input);
    if (!list.some((name) => namesMatch(name, input.subjectName))) {
      flags.push({ code: 'RELATIVE_NOT_REGISTERED', severity: 'warning', article: 'Art 4.4' });
    }
  }

  // Art 4.3 — who each hardship covers.
  if (input.type === 'HARDSHIP') {
    const memberOnly = input.hardshipCategory === 'IMMIGRATION_DETENTION' || input.hardshipCategory === 'FIRE';
    if (memberOnly && input.relationship !== 'SELF') {
      flags.push({ code: 'MEMBER_ONLY_CATEGORY', severity: 'warning', article: 'Art 4.3' });
    }
    const illnessCovered = ['SELF', 'SPOUSE', 'CHILD'];
    if (input.hardshipCategory === 'ILLNESS_CRITICAL' && !illnessCovered.includes(input.relationship)) {
      flags.push({ code: 'ILLNESS_SCOPE', severity: 'warning', article: 'Art 4.3' });
    }
  }

  const { type: effectiveType, rerouted } = effectiveTypeFor(input);
  if (rerouted) {
    flags.push({ code: 'CHILD_REROUTED', severity: 'info', article: 'Art 4.5, 17' });
  }

  if (input.tierAtEvent === 'VOLUNTARY') {
    flags.push({ code: 'VOLUNTARY_TIER', severity: 'warning', article: 'Art 18.9' });
  } else if (input.shortfallAtEventCents > 0) {
    flags.push({
      code: 'BELOW_MINIMUM',
      severity: 'info',
      article: 'Art 6.2, 18.9',
      params: { shortfallCents: input.shortfallAtEventCents },
    });
  }

  const suggestVoluntary = withinWait || input.tierAtEvent === 'VOLUNTARY';
  const suggestedBenefitCents = suggestVoluntary ? 0 : benefitFor(effectiveType, input.tierAtEvent);

  return {
    flags,
    effectiveType,
    suggestedBenefitCents,
    suggestedLevyPoolCents: suggestVoluntary ? 0 : levyPoolFor(effectiveType, suggestedBenefitCents),
    suggestVoluntary,
    announceNotBefore,
  };
}
