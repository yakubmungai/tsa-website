import Link from 'next/link';
import { ChevronRight, HandHeart, Plus } from 'lucide-react';
import type { ClaimStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { daysBetween } from '@/lib/finance/dates';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { MoneyAmount } from '@/components/portal/money';
import { StatusBadge } from '@/components/portal/status-badge';
import { ClaimStatusBadge, type ClaimStatusKey } from '@/components/portal/claim-status';

const OPEN: ClaimStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COLLECTING', 'PAID', 'VOLUNTARY'];

/** A report should be picked up within a couple of days of arriving. */
const REVIEW_SLA_DAYS = 2;

export default async function AdminClaimsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const { show } = await searchParams;
  const all = show === 'all';
  const [t, locale, asOf] = await Promise.all([getPortalStrings(), getLocale(), now()]);

  const where: Prisma.ClaimWhereInput = all ? {} : { status: { in: OPEN } };
  const claims = await db.claim.findMany({
    where,
    include: { member: { select: { names: true, memberNumber: true } } },
    orderBy: [{ reportedAt: 'desc' }],
    take: 200,
  });
  const fmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });

  // Needs attention first: waiting for review, then collecting, then the rest.
  const rank: Record<string, number> = { SUBMITTED: 0, UNDER_REVIEW: 1, APPROVED: 2, COLLECTING: 3, PAID: 4, VOLUNTARY: 5 };
  claims.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));

  const tab = (key: 'open' | 'all', label: string) => (
    <Link
      href={key === 'all' ? '/admin/claims?show=all' : '/admin/claims'}
      aria-current={(key === 'all') === all ? 'page' : undefined}
      className={
        (key === 'all') === all
          ? 'inline-flex min-h-12 items-center rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground'
          : 'inline-flex min-h-12 items-center rounded-full border border-border px-5 text-base font-semibold text-muted-foreground hover:bg-muted'
      }
    >
      {label}
    </Link>
  );

  return (
    <AdminShell active="claims">
      <PageHeader
        title={t.adminClaims.title}
        subtitle={t.adminClaims.subtitle}
        actions={
          <Link
            href="/admin/claims/new"
            className="btn-shimmer inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-base font-bold text-primary-foreground"
          >
            <Plus className="h-5 w-5" aria-hidden />
            {t.adminClaims.newCase}
          </Link>
        }
      />
      <div className="mb-4 flex gap-2">
        {tab('open', t.adminClaims.filterOpen)}
        {tab('all', t.adminClaims.filterAll)}
      </div>

      <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
        {claims.length === 0 ? (
          <EmptyState icon={<HandHeart className="h-6 w-6" />} title={t.adminClaims.empty} />
        ) : (
          <ul className="divide-y divide-border/60">
            {claims.map((c) => {
              const waiting = ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status);
              const late = waiting && daysBetween(c.reportedAt, asOf) > REVIEW_SLA_DAYS;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/claims/${c.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 sm:px-6"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-lg font-semibold">
                        {t.claims.types[c.type].title}: {c.subjectName}
                      </p>
                      <p className="text-base text-muted-foreground">
                        {c.member.names} · {c.reference} · {fmt.format(c.reportedAt)}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <ClaimStatusBadge status={c.status as ClaimStatusKey} t={t} />
                        {late ? <StatusBadge tone="danger">{t.adminClaims.reviewOverdue}</StatusBadge> : null}
                        {c.status === 'COLLECTING' && c.dueAt ? (
                          <StatusBadge tone="neutral">{t.adminClaims.collectionDue(fmt.format(c.dueAt))}</StatusBadge>
                        ) : null}
                      </div>
                    </div>
                    {c.benefitCents ? (
                      <MoneyAmount cents={c.benefitCents} className="hidden text-lg font-bold sm:block" />
                    ) : null}
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
