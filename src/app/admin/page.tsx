import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Gavel, Megaphone, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { getAdminCounts } from '@/features/admin/counts';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { ChoiceLink } from '@/components/portal/choice-button';
import { EmptyState } from '@/components/portal/empty-state';
import { StatusBadge } from '@/components/portal/status-badge';

/**
 * "Kazi za leo" — the officers' inbox. Everything waiting for a decision, each
 * one tap from where it is handled, so no one has to hunt through pages.
 */
export default async function AdminTodayPage() {
  await requireAdmin();
  const [t, counts] = await Promise.all([getPortalStrings(), getAdminCounts()]);

  const items = [
    counts.claims > 0 && {
      href: '/admin/claims',
      icon: <ClipboardCheck className="h-6 w-6" />,
      title: t.admin.today.claims(counts.claims),
    },
    counts.payments > 0 && {
      href: '/admin/payments',
      icon: <Wallet className="h-6 w-6" />,
      title: t.admin.today.payments(counts.payments),
    },
    counts.overdue > 0 && {
      href: '/admin/claims',
      icon: <AlertTriangle className="h-6 w-6" />,
      title: t.admin.today.overdue(counts.overdue),
    },
    counts.collecting > 0 && {
      href: '/admin/claims',
      icon: <Megaphone className="h-6 w-6" />,
      title: t.admin.today.collecting(counts.collecting),
    },
    counts.forms > 0 && {
      href: '/admin/forms',
      icon: <FileText className="h-6 w-6" />,
      title: t.admin.today.forms(counts.forms),
    },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; title: string }[];

  const referred = counts.boardReferrals.length
    ? await db.member.findMany({
        where: { id: { in: counts.boardReferrals.map((b) => b.memberId) } },
        select: { id: true, names: true },
      })
    : [];
  const missedOf = new Map(counts.boardReferrals.map((b) => [b.memberId, b.missed]));

  return (
    <AdminShell active="today">
      <PageHeader eyebrow={t.admin.subtitle} title={t.admin.today.title} subtitle={t.admin.today.subtitle} />
      <div className="space-y-8">
        <SectionCard>
          {items.length === 0 && referred.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-success" />}
              title={t.admin.today.allClear}
              body={t.admin.today.allClearBody}
            />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <ChoiceLink key={item.title} href={item.href} icon={item.icon} title={item.title} />
              ))}
            </div>
          )}
        </SectionCard>

        {referred.length > 0 ? (
          <SectionCard
            title={t.adminClaims.boardTitle}
            description={t.adminClaims.boardHelp}
            icon={<Gavel className="h-5 w-5 text-destructive" />}
          >
            <ul className="divide-y divide-border/60">
              {referred.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/admin/members/${m.id}`} className="text-lg font-semibold text-primary hover:underline">
                    {m.names}
                  </Link>
                  <StatusBadge tone="danger">{missedOf.get(m.id)}</StatusBadge>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
      </div>
    </AdminShell>
  );
}
