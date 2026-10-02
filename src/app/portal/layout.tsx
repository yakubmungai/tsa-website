import { getEffectiveContext } from '@/lib/session';
import { ActingBanner } from '@/components/acting-banner';
import { SiteFrame } from '@/components/portal/site-frame';

/**
 * Portal pages are always rendered fresh.
 *
 * A helper can switch between accounts within one session, so a cached render
 * could show one member's balance to another. That is the single worst bug this
 * feature could produce, so caching is disabled outright rather than tuned.
 */
export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getEffectiveContext();

  // The frame lives here, not in each page, so it stays put between pages.
  return (
    <SiteFrame>
      {ctx?.isActing && ctx.acting ? <ActingBanner ownerName={ctx.acting.ownerName} /> : null}
      {children}
    </SiteFrame>
  );
}
