import Link from 'next/link';
import { HandHeart, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { requireMember, checkPermission } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { EmptyState } from '@/components/portal/empty-state';
import { MoneyAmount } from '@/components/portal/money';
import { ClaimStatusBadge, ClaimTimeline, type ClaimStatusKey } from '@/components/portal/claim-status';

export default async function MyClaimsPage() {
  const ctx = await requireMember();
  const [t, locale] = await Promise.all([getPortalStrings(), getLocale()]);
  const claims = await db.claim.findMany({
    where: { memberId: ctx.memberId },
    orderBy: { reportedAt: 'desc' },
  });
  const fmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });
  const canSubmit = checkPermission(ctx, 'SUBMIT_FORMS');

  const newButton = canSubmit ? (
    <Link
      href="/portal/claims/new"
      className="btn-shimmer inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-lg font-bold text-primary-foreground"
    >
      <Plus className="h-5 w-5" aria-hidden />
      {t.claims.fileNew}
    </Link>
  ) : null;

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ href: '/portal', label: t.common.back }}
        title={t.claims.title}
        subtitle={t.claims.subtitle}
        actions={newButton}
      />
      {claims.length === 0 ? (
        <SectionCard>
          <EmptyState icon={<HandHeart className="h-6 w-6" />} title={t.claims.empty} action={newButton} />
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {claims.map((c) => (
            <SectionCard
              key={c.id}
              title={`${t.claims.types[c.type].title}: ${c.subjectName}`}
              description={`${c.reference} · ${t.claims.eventOn} ${fmt.format(c.eventDate)}`}
              actions={<ClaimStatusBadge status={c.status as ClaimStatusKey} t={t} />}
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <ClaimTimeline status={c.status as ClaimStatusKey} dates={c} t={t} formatDate={(d) => fmt.format(d)} />
                <div className="space-y-3">
                  {c.benefitCents ? (
                    <div className="rounded-2xl bg-muted/60 p-4">
                      <p className="text-base text-muted-foreground">{t.claims.benefit}</p>
                      <MoneyAmount cents={c.benefitCents} className="text-2xl font-bold" />
                    </div>
                  ) : null}
                  {c.decisionNote && ['REJECTED', 'VOLUNTARY'].includes(c.status) ? (
                    <div className="rounded-2xl border border-border/60 p-4">
                      <p className="text-sm font-semibold text-muted-foreground">{t.claims.decisionNote}</p>
                      <p className="text-base">{c.decisionNote}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
