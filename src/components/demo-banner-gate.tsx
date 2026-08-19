import { isDemoMode } from '@/lib/demo';
import { DemoBanner } from './demo-banner';

/**
 * Server-side gate, so the banner's markup never reaches the live site.
 * `isDemoMode()` also throws outright if DEMO_MODE is set on the production
 * hostname.
 */
export function DemoBannerGate() {
  if (!isDemoMode()) return null;
  return <DemoBanner />;
}
