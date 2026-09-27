import type { Metadata } from 'next';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import Link from 'next/link';
import { LinkIcon } from 'lucide-react';
import { getPortalStrings } from '@/lib/i18n';
import { isCardPaymentEnabled } from '@/lib/rollout';
import { consume, POLICIES } from '@/lib/rate-limit';
import { formatUSD } from '@/lib/money';
import { orgIsoDate } from '@/lib/finance/dates';
import { resolvePayLink } from '@/features/payments/service';
import { paySummary } from '@/features/payments/summary';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { EmptyState } from '@/components/portal/empty-state';
import { PayPanel } from '@/components/portal/pay-panel';
import { HelpButton } from '@/components/portal/help-button';
import { TextSizeToggle } from '@/components/portal/text-size-toggle';

// A personal page: never indexed, never cached.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * "Lipa" — opened from a WhatsApp reminder. No sign-in: older members pay from
 * the message in one tap. The link is a secret token that expires after 30
 * days and shows only a first name and what is owed.
 */
export default async function PayLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ token }, { paid }, t] = await Promise.all([params, searchParams, getPortalStrings()]);

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
  const limit = await consume(
    POLICIES.payLinkIp,
    createHash('sha256').update(`${process.env.AUDIT_IP_PEPPER ?? ''}:${ip}`).digest('hex').slice(0, 32)
  );
  const link = limit.allowed ? await resolvePayLink(token) : null;

  if (!link) {
    return (
      <PageShell width="narrow">
        <SectionCard>
          <EmptyState
            icon={<LinkIcon className="h-6 w-6" />}
            title={t.pay.expired}
            action={
              <Link href="/login" className="text-lg font-semibold text-primary hover:underline">
                {t.pay.signInInstead}
              </Link>
            }
          />
        </SectionCard>
      </PageShell>
    );
  }

  const s = await paySummary(link.member.id);
  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow={t.pay.greeting(s.firstName)}
        title={s.outstandingCents > 0 ? t.pay.owe(formatUSD(s.outstandingCents)) : t.pay.title}
        subtitle={s.outstandingCents > 0 ? t.pay.subtitle : t.pay.nothingOwed}
        actions={
          <>
            <TextSizeToggle />
            <HelpButton />
          </>
        }
      />
      <PayPanel
        token={token}
        suggestedCents={s.suggestedCents}
        reference={s.reference}
        cardEnabled={isCardPaymentEnabled()}
        today={orgIsoDate(s.asOf)}
        defaultPayerName=""
        cardJustPaid={paid === '1'}
      />
      <p className="mt-6 text-center text-base text-muted-foreground">{t.pay.privacy}</p>
    </PageShell>
  );
}
