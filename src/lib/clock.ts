import 'server-only';
import { cache } from 'react';
import { db } from './db';
import { isDemoMode } from './demo';

/**
 * The time, as far as TSA's rules are concerned.
 *
 * Every deadline in the constitution is measured in days — 14 to contribute to a
 * case, 30 to restore the advance, six months before a new member's cases are
 * mandatory. Leaders testing the portal cannot wait two weeks to see a missed
 * contribution, so the test environment has a time machine: an offset added to
 * the real clock.
 *
 * On the live site this is always the real time. The offset is only read when
 * DEMO_MODE is on, and `isDemoMode()` refuses to run on tansha.org.
 */

export const CLOCK_OFFSET_KEY = 'clockOffsetMs';

export async function getClockOffsetMs(): Promise<number> {
  if (!isDemoMode()) return 0;
  const row = await db.demoSetting.findUnique({ where: { key: CLOCK_OFFSET_KEY } });
  const value = typeof row?.value === 'number' ? row.value : 0;
  return Number.isFinite(value) ? value : 0;
}

/** Cached per request, so one page sees one consistent "now". */
export const now = cache(async (): Promise<Date> => {
  const offset = await getClockOffsetMs();
  return new Date(Date.now() + offset);
});
