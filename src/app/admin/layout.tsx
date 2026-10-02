import { isDemoMode } from '@/lib/demo';
import { getPortalStrings } from '@/lib/i18n';
import { getAdminCounts } from '@/features/admin/counts';
import { SiteFrame } from '@/components/portal/site-frame';
import { AdminNav, type AdminTab } from '@/components/admin/admin-nav';

/**
 * Officer pages are always rendered fresh: they show money and members'
 * details, and counts change with every action.
 */
export const dynamic = 'force-dynamic';

/**
 * The frame and tabs for every officer page. Each page still checks the
 * officer's role itself — a layout is not a guard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [t, counts] = await Promise.all([getPortalStrings(), getAdminCounts()]);
  const tabs: AdminTab[] = [
    { key: 'today', href: '/admin', label: t.admin.nav.today, count: counts.total },
    { key: 'claims', href: '/admin/claims', label: t.admin.nav.claims, count: counts.claims },
    { key: 'payments', href: '/admin/payments', label: t.admin.nav.payments, count: counts.payments },
    { key: 'members', href: '/admin/members', label: t.admin.nav.members },
    { key: 'forms', href: '/admin/forms', label: t.admin.nav.forms, count: counts.forms },
    { key: 'broadcast', href: '/admin/broadcast', label: t.admin.nav.broadcast },
  ];
  if (isDemoMode()) tabs.push({ key: 'demo', href: '/admin/demo', label: t.admin.nav.demo });

  return (
    <SiteFrame>
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-28 sm:px-6">
        <AdminNav tabs={tabs} label={t.admin.title} />
      </div>
      {children}
    </SiteFrame>
  );
}
