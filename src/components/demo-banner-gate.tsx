import { isDemoMode } from '@/lib/demo';
import { getClockOffsetMs, now } from '@/lib/clock';
import { orgIsoDate } from '@/lib/finance/dates';
import { DemoBanner } from './demo-banner';

/**
 * Server-side gate, so the banner's markup never reaches the live site.
 * `isDemoMode()` also throws outright if DEMO_MODE is set on the production
 * hostname.
 */
export async function DemoBannerGate() {
  if (!isDemoMode()) return null;
  // Show the test date only when the time machine has moved it.
  const offset = await getClockOffsetMs().catch(() => 0);
  const testDate = offset !== 0 ? orgIsoDate(await now()) : null;
  return <DemoBanner testDate={testDate} />;
}
