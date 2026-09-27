import { Clock } from 'lucide-react';
import { requirePermission } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { isCardPaymentEnabled } from '@/lib/rollout';
import { formatUSD } from '@/lib/money';
import { orgIsoDate } from '@/lib/finance/dates';
import { paySummary } from '@/features/payments/summary';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { PayPanel } from '@/components/portal/pay-panel';
import { HelpButton } from '@/components/portal/help-button';

export default async function PortalPayPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const ctx = await requirePermission('MAKE_PAYMENTS');
  const { paid } = await searchParams;
  const [t, locale, s] = await Promise.all([getPortalStrings(), getLocale(), paySummary(ctx.memberId)]);
  const fmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', { dateStyle: 'medium', timeZone: 'America/Chicago' });

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ href: '/portal', label: t.common.back }}
        title={s.outstandingCents > 0 ? t.pay.owe(formatUSD(s.outstandingCents)) : t.pay.title}
        subtitle={s.outstandingCents > 0 ? t.pay.subtitle : t.pay.nothingOwed}
        actions={<HelpButton />}
      />
      <div className="space-y-6">
        {s.pending.length > 0 ? (
          <SectionCard title={t.pay.pendingTitle} icon={<Clock className="h-5 w-5 text-warning" />}>
            <ul className="space-y-2 text-lg">
              {s.pending.map((p) => (
                <li key={p.id}>{t.pay.pendingItem(formatUSD(p.amountCents), fmt.format(p.paidOn))}</li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
        <PayPanel
          suggestedCents={s.suggestedCents}
          reference={s.reference}
          cardEnabled={isCardPaymentEnabled()}
          today={orgIsoDate(s.asOf)}
          defaultPayerName={s.names}
          cardJustPaid={paid === '1'}
        />
      </div>
    </PageShell>
  );
}
