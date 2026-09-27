import { CheckCircle2, FileText } from 'lucide-react';
import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { getAdminCounts } from '@/features/admin/counts';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { ChoiceLink } from '@/components/portal/choice-button';
import { EmptyState } from '@/components/portal/empty-state';

/**
 * "Kazi za leo" — the officers' inbox. Everything waiting for a decision, each
 * one tap from where it is handled, so no one has to hunt through pages.
 */
export default async function AdminTodayPage() {
  await requireAdmin();
  const [t, counts] = await Promise.all([getPortalStrings(), getAdminCounts()]);

  const items = [
    counts.forms > 0 && {
      href: '/admin/forms',
      icon: <FileText className="h-6 w-6" />,
      title: t.admin.today.forms(counts.forms),
    },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; title: string }[];

  return (
    <AdminShell active="today">
      <PageHeader eyebrow={t.admin.subtitle} title={t.admin.today.title} subtitle={t.admin.today.subtitle} />
      <SectionCard>
        {items.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6 text-success" />}
            title={t.admin.today.allClear}
            body={t.admin.today.allClearBody}
          />
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <ChoiceLink key={item.href + item.title} href={item.href} icon={item.icon} title={item.title} />
            ))}
          </div>
        )}
      </SectionCard>
    </AdminShell>
  );
}
