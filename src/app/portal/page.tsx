import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarCheck, EyeOff, FileText, HandHeart, History, Shield, User, Users, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { getEffectiveContext, checkPermission } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { showComplianceStatus } from '@/lib/rollout';
import { getMemberStanding } from '@/lib/finance/ledger';
import { heroStateFor } from '@/lib/finance/hero';
import { suggestedTopUpCents } from '@/lib/finance/balance';
import { formatUSD } from '@/lib/money';
import { AccountSwitcher } from '@/components/account-switcher';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { StatusHero } from '@/components/portal/status-hero';
import { StatCard } from '@/components/portal/stat-card';
import { SectionCard } from '@/components/portal/section-card';
import { StatusBadge } from '@/components/portal/status-badge';
import { MoneyAmount } from '@/components/portal/money';
import { LedgerHistory } from '@/components/portal/ledger-history';
import { ChoiceLink } from '@/components/portal/choice-button';
import { EmptyState } from '@/components/portal/empty-state';
import { TextSizeToggle } from '@/components/portal/text-size-toggle';
import { HelpButton } from '@/components/portal/help-button';

export default async function PortalPage() {
  const ctx = await getEffectiveContext();
  if (!ctx) redirect('/login');

  // Pure admins have no member profile of their own.
  if (ctx.actor.role === 'ADMIN' && !ctx.memberId) redirect('/admin');

  const [t, locale] = await Promise.all([getPortalStrings(), getLocale()]);
  const showStatus = showComplianceStatus();

  // Accounts this user can act for, so a helper can switch between them.
  const switchable = ctx.isActing
    ? []
    : (
        await db.delegation.findMany({
          where: { delegateUserId: ctx.actor.id, status: 'ACTIVE' },
          include: { ownerMember: { select: { id: true, names: true } } },
          orderBy: { createdAt: 'asc' },
        })
      ).map((d) => ({
        delegationId: d.id,
        memberId: d.ownerMember.id,
        names: d.ownerMember.names,
      }));

  const memberId = ctx.memberId;
  if (!memberId) {
    return (
      <PageShell width="narrow">
        <SectionCard>
          <EmptyState
            icon={<User className="h-6 w-6" />}
            title={t.dashboard.accountPendingTitle}
            body={t.dashboard.accountPendingBody}
            action={
              <Link href="/" className="text-base font-semibold text-primary hover:underline">
                {t.dashboard.goHome}
              </Link>
            }
          />
        </SectionCard>
      </PageShell>
    );
  }

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { id: true, names: true, phone: true, address: true, husbandWife: true },
  });
  if (!member) redirect('/login');

  // A helper sees money only if the member agreed to it.
  const canSeeFinances = checkPermission(ctx, 'VIEW_FINANCES');
  const canSubmit = checkPermission(ctx, 'SUBMIT_FORMS');
  const firstName = member.names.split(' ')[0];

  const header = (
    <PageHeader
      eyebrow={t.dashboard.subtitle}
      title={t.dashboard.greeting(ctx.isActing ? member.names : firstName)}
      subtitle={ctx.isActing ? t.dashboard.actingFor(member.names) : undefined}
      actions={
        <>
          <TextSizeToggle />
          <HelpButton />
        </>
      }
    />
  );

  const quickLinks = (
    <SectionCard title={t.dashboard.quickLinks}>
      <div className="grid gap-3">
        {canSubmit ? (
          <ChoiceLink
            href="/portal/forms"
            icon={<HandHeart className="h-6 w-6" />}
            title={t.dashboard.fileClaim}
          />
        ) : null}
        {!ctx.isActing ? (
          <ChoiceLink href="/portal/access" icon={<Users className="h-6 w-6" />} title={t.dashboard.helpers} />
        ) : null}
        <ChoiceLink href="/portal/forms" icon={<FileText className="h-6 w-6" />} title={t.dashboard.forms} />
      </div>
    </SectionCard>
  );

  if (!canSeeFinances) {
    return (
      <PageShell>
        {header}
        <div className="space-y-6">
          <SectionCard>
            <EmptyState icon={<EyeOff className="h-6 w-6" />} title={t.dashboard.hiddenFinances} />
          </SectionCard>
          {quickLinks}
        </div>
      </PageShell>
    );
  }

  const [standing, entries] = await Promise.all([
    getMemberStanding(memberId),
    db.ledgerEntry.findMany({
      where: { memberId },
      orderBy: [{ occurredAt: 'desc' }, { postedAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        account: true,
        entryKind: true,
        amountCents: true,
        description: true,
        descriptionSw: true,
        occurredAt: true,
        voidedAt: true,
      },
    }),
  ]);

  const state = heroStateFor({
    outstandingCents: standing.outstandingCents,
    shortfallCents: standing.shortfallCents,
    showCompliance: showStatus,
  });
  const topUp = suggestedTopUpCents(standing);
  const dateFmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'long',
    timeZone: 'America/Chicago',
  });

  const hero = {
    ok: { headline: t.status.ok, body: t.status.okBody },
    owe: {
      headline: t.status.owe(formatUSD(standing.outstandingCents)),
      body: t.status.oweBody,
      action: { href: '/portal', label: t.status.payNow },
    },
    low: {
      headline: t.status.low,
      body: t.status.lowBody(formatUSD(topUp || standing.shortfallCents)),
      action: { href: '/portal', label: t.status.topUp },
    },
    neutral: { headline: t.status.neutral, body: t.status.neutralBody },
  }[state];

  const duesYearLabel = `${standing.duesYear}/${String(standing.duesYear + 1).slice(2)}`;
  const paidBadge = (settled: boolean) =>
    showStatus ? (
      settled ? (
        <StatusBadge tone="success">{t.dashboard.paid}</StatusBadge>
      ) : (
        <StatusBadge tone="danger">{t.dashboard.notPaid}</StatusBadge>
      )
    ) : null;

  return (
    <PageShell>
      {header}

      <div className="space-y-8">
        <StatusHero state={state} {...hero} />

        {standing.isWithinNewMemberWait && standing.eligibleFrom ? (
          <SectionCard>
            <p className="flex items-start gap-3 text-lg">
              <CalendarCheck className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
              {t.dashboard.newMemberWait(dateFmt.format(standing.eligibleFrom))}
            </p>
          </SectionCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label={t.dashboard.advance}
            value={<MoneyAmount cents={standing.advanceCents} />}
            help={t.dashboard.advanceHelp}
            icon={<Wallet className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label={t.dashboard.dues}
            value={<MoneyAmount cents={standing.duesCents} />}
            help={t.dashboard.duesHelp(duesYearLabel)}
            icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
            badge={paidBadge(standing.duesSettled)}
          />
          <StatCard
            label={t.dashboard.entryFee}
            value={<MoneyAmount cents={standing.entryFeeCents} />}
            help={t.dashboard.entryFeeHelp}
            icon={<Shield className="h-5 w-5" aria-hidden />}
            badge={paidBadge(standing.entryFeeSettled)}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {showStatus ? (
              <SectionCard title={t.dashboard.benefitsTitle} icon={<HandHeart className="h-5 w-5 text-primary" />}>
                {standing.tier === 'VOLUNTARY' ? (
                  <p className="text-lg">{t.dashboard.benefitsVoluntary}</p>
                ) : (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted/60 p-4">
                      <dt className="text-base text-muted-foreground">{t.dashboard.benefitsMajor}</dt>
                      <dd className="mt-1 text-2xl font-bold">
                        <MoneyAmount cents={standing.benefits.majorDeathCents} />
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-muted/60 p-4">
                      <dt className="text-base text-muted-foreground">{t.dashboard.benefitsRelative}</dt>
                      <dd className="mt-1 text-2xl font-bold">
                        <MoneyAmount cents={standing.benefits.relativeOrHardshipCents} />
                      </dd>
                    </div>
                  </dl>
                )}
              </SectionCard>
            ) : null}

            <SectionCard title={t.dashboard.historyTitle} icon={<History className="h-5 w-5 text-primary" />}>
              <LedgerHistory entries={entries} t={t} locale={locale} />
            </SectionCard>
          </div>

          <div className="space-y-8">
            {switchable.length > 0 ? <AccountSwitcher accounts={switchable} /> : null}
            {quickLinks}
            <SectionCard title={t.dashboard.profileTitle} icon={<User className="h-5 w-5 text-primary" />}>
              <dl className="space-y-4 text-base">
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground">{t.dashboard.phone}</dt>
                  <dd className="font-medium">{member.phone || t.dashboard.notRecorded}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground">{t.dashboard.address}</dt>
                  <dd className="font-medium">{member.address || t.dashboard.notRecorded}</dd>
                </div>
                {member.husbandWife ? (
                  <div>
                    <dt className="text-sm font-semibold text-muted-foreground">{t.dashboard.spouse}</dt>
                    <dd className="font-medium">{member.husbandWife}</dd>
                  </div>
                ) : null}
              </dl>
            </SectionCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
