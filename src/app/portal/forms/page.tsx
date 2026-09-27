import { CheckCircle2, Clock, FileText, HandHeart, ShieldCheck, XCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { requireMember, checkPermission } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { ChoiceLink } from '@/components/portal/choice-button';
import { StatusBadge, type Tone } from '@/components/portal/status-badge';
import { EmptyState } from '@/components/portal/empty-state';

const STATUS_TONE: Record<string, { tone: Tone; icon: React.ReactNode }> = {
  PENDING: { tone: 'warning', icon: <Clock className="h-4 w-4" aria-hidden /> },
  PROCESSING: { tone: 'info', icon: <Clock className="h-4 w-4" aria-hidden /> },
  APPROVED: { tone: 'success', icon: <CheckCircle2 className="h-4 w-4" aria-hidden /> },
  REJECTED: { tone: 'danger', icon: <XCircle className="h-4 w-4" aria-hidden /> },
};

export default async function PortalFormsPage() {
  const ctx = await requireMember();
  const [t, locale] = await Promise.all([getPortalStrings(), getLocale()]);
  const canSubmit = checkPermission(ctx, 'SUBMIT_FORMS');

  const submissions = await db.formSubmission.findMany({
    where: { memberId: ctx.memberId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, reference: true, formType: true, status: true, createdAt: true },
  });
  const dateFmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ href: '/portal', label: t.common.back }}
        title={t.portalForms.title}
        subtitle={t.portalForms.subtitle}
      />
      <div className="space-y-8">
        <div className="grid gap-3">
          {canSubmit ? (
            <ChoiceLink
              href="/portal/claims/new"
              icon={<HandHeart className="h-6 w-6" />}
              title={t.portalForms.claim.title}
              description={t.portalForms.claim.description}
            />
          ) : null}
          <ChoiceLink
            href="/constitution"
            icon={<ShieldCheck className="h-6 w-6" />}
            title={t.portalForms.constitution.title}
            description={t.portalForms.constitution.description}
          />
          <ChoiceLink
            href="/membership"
            icon={<FileText className="h-6 w-6" />}
            title={t.portalForms.renewal.title}
            description={t.portalForms.renewal.description}
          />
        </div>

        <SectionCard title={t.portalForms.submissionsTitle}>
          {submissions.length === 0 ? (
            <EmptyState title={t.portalForms.submissionsEmpty} />
          ) : (
            <ul className="divide-y divide-border/60">
              {submissions.map((s) => {
                const st = STATUS_TONE[s.status] ?? STATUS_TONE.PENDING;
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-lg font-semibold">
                        {t.portalForms.formTypes[s.formType as keyof typeof t.portalForms.formTypes] ?? s.formType}
                      </p>
                      <p className="text-base text-muted-foreground">
                        {s.reference} · {dateFmt.format(s.createdAt)}
                      </p>
                    </div>
                    <StatusBadge tone={st.tone} icon={st.icon}>
                      {t.portalForms.submissionStatus[s.status as keyof typeof t.portalForms.submissionStatus] ?? s.status}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
