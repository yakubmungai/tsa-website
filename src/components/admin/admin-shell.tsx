import Link from 'next/link';
import {
  CalendarCheck,
  FileText,
  FlaskConical,
  HandHeart,
  MessageCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { isDemoMode } from '@/lib/demo';
import { getPortalStrings } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/portal/page-shell';
import { getAdminCounts, type AdminCounts } from '@/features/admin/counts';

export type AdminSection = 'today' | 'claims' | 'payments' | 'members' | 'forms' | 'broadcast' | 'demo';

/**
 * Every officer page sits in this: the site frame plus one row of tabs, each
 * with a count of what is waiting. Leaders run TSA from their phones, so the
 * tabs scroll sideways rather than wrapping into a wall of buttons.
 */
export async function AdminShell({
  active,
  children,
}: {
  active: AdminSection;
  children: React.ReactNode;
}) {
  const t = await getPortalStrings();
  const counts: AdminCounts = await getAdminCounts();

  const tabs: { key: AdminSection; href: string; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'today', href: '/admin', label: t.admin.nav.today, icon: <CalendarCheck className="h-5 w-5" />, count: counts.total },
    { key: 'claims', href: '/admin/claims', label: t.admin.nav.claims, icon: <HandHeart className="h-5 w-5" />, count: counts.claims },
    { key: 'payments', href: '/admin/payments', label: t.admin.nav.payments, icon: <Wallet className="h-5 w-5" />, count: counts.payments },
    { key: 'members', href: '/admin/members', label: t.admin.nav.members, icon: <Users className="h-5 w-5" /> },
    { key: 'forms', href: '/admin/forms', label: t.admin.nav.forms, icon: <FileText className="h-5 w-5" />, count: counts.forms },
    { key: 'broadcast', href: '/admin/broadcast', label: t.admin.nav.broadcast, icon: <MessageCircle className="h-5 w-5" /> },
  ];
  if (isDemoMode()) {
    tabs.push({ key: 'demo', href: '/admin/demo', label: t.admin.nav.demo, icon: <FlaskConical className="h-5 w-5" /> });
  }

  return (
    <PageShell>
      <nav aria-label={t.admin.title} className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-2 rounded-2xl border border-border/60 bg-card p-1.5 shadow-sm">
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count ? (
                    <span
                      className={cn(
                        'min-w-6 rounded-full px-2 py-0.5 text-center text-sm font-bold',
                        isActive ? 'bg-primary-foreground/20' : 'bg-warning/15 text-warning'
                      )}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </PageShell>
  );
}
