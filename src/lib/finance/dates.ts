import { ORG_TIMEZONE } from './constants';

/**
 * Calendar dates as TSA's officers mean them: in Houston.
 *
 * A date typed into a form ("2026-09-12") has no time of day. Storing it as
 * midnight UTC would put it on the 11th in Houston. Noon Central is the same
 * calendar day in Houston whatever the season, so that is what it becomes.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** "2026-09-12" → noon Central on that day (18:00 UTC; 12:00 CST or 13:00 CDT). */
export function orgDateFromInput(value: string): Date {
  if (!isIsoDate(value)) throw new Error(`Not a calendar date: ${value}`);
  return new Date(`${value}T18:00:00.000Z`);
}

/** The Houston calendar date of an instant, as "YYYY-MM-DD" for a date input. */
export function orgIsoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Add whole days. Deadlines are in days (Art 17: "ndani ya majuma mawili"). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Whole days from `from` to `to`, rounded down. Negative if `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** "2026-09" for the Houston calendar month of an instant — the Art 17 cap bucket. */
export function orgMonthKey(date: Date): string {
  return orgIsoDate(date).slice(0, 7);
}

/** The month after "2026-09" → "2026-10"; after "2026-12" → "2027-01". */
export function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
