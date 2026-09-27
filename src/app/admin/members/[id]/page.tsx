import { notFound } from 'next/navigation';
import { AlertTriangle, CalendarCheck, HandCoins, History, MapPin, Phone, PlusCircle, Shield, Users, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { getMemberStanding } from '@/lib/finance/ledger';
import { orgIsoDate } from '@/lib/finance/dates';
import { formatUSD } from '@/lib/money';
import { AdminShell } from '@/components/admin/admin-shell';
import { PostEntryForm } from '@/components/admin/post-entry-form';
import { ReverseEntryButton } from '@/components/admin/reverse-entry-button';
import { AdminEditMember } from '@/components/admin-edit-member';
import { AdminDeleteMember } from '@/components/admin-delete-member';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { StatCard } from '@/components/portal/stat-card';
import { StatusBadge } from '@/components/portal/status-badge';
import { MoneyAmount } from '@/components/portal/money';
import { LedgerHistory } from '@/components/portal/ledger-history';
import { OweList, type OweItem } from '@/components/portal/owe-list';
import { loadShares } from '@/features/claims/service';

function contacts(value: unknown): { name: string; phone?: string }[] {
  return Array.isArray(value)
    ? value.filter((v): v is { name: string; phone?: string } => typeof v?.name === 'string')
    : [];
}

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [t, locale, today] = await Promise.all([getPortalStrings(), getLocale(), now()]);

  const member = await db.member.findUnique({ where: { id } });
  if (!member) notFound();

  const [standing, entries] = await Promise.all([
    getMemberStanding(member.id),
    db.ledgerEntry.findMany({
      where: { memberId: member.id },
      orderBy: [{ occurredAt: 'desc' }, { postedAt: 'desc' }],
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

  const [shares, shareClaims] = await Promise.all([
    loadShares({ memberId: member.id }, today),
    db.assessment.findMany({
      where: { memberId: member.id },
      select: { id: true, claim: { select: { reference: true, subjectName: true } } },
    }),
  ]);
  const claimOf = new Map(shareClaims.map((s) => [s.id, s.claim]));
  const shareItems: OweItem[] = shares
    .map((s) => ({
      id: s.id,
      reference: claimOf.get(s.id)?.reference ?? '',
      subjectName: claimOf.get(s.id)?.subjectName ?? '',
      amountCents: s.amountCents,
      outstandingCents: s.outstandingCents,
      fromAdvanceCents: s.fromAdvanceCents,
      dueAt: s.dueAt,
      state: s.state,
    }))
    .reverse();
  const fmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });

  const family: { label: string; values: string[] }[] = [
    { label: t.dashboard.spouse, values: member.husbandWife ? [member.husbandWife] : [] },
    { label: t.admin.member.parents, values: member.parents },
    { label: t.admin.member.children, values: member.children },
    { label: t.admin.member.siblings, values: member.siblings },
    {
      label: t.admin.member.witnesses,
      values: contacts(member.witnesses).map((w) => (w.phone ? `${w.name} (${w.phone})` : w.name)),
    },
    {
      label: t.admin.member.nextOfKin,
      values: contacts(member.nextOfKin).map((w) => (w.phone ? `${w.name} (${w.phone})` : w.name)),
    },
  ];

  return (
    <AdminShell active="members">
      <PageHeader
        back={{ href: '/admin/members', label: t.admin.member.back }}
        eyebrow={member.memberNumber ? `TSA-${member.memberNumber}` : undefined}
        title={member.names}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={standing.tier === 'FULL' ? 'success' : standing.tier === 'VOLUNTARY' ? 'danger' : 'warning'}>
              {t.tiers[standing.tier]}
            </StatusBadge>
            {member.archivedAt ? <StatusBadge tone="neutral">{t.admin.member.archived}</StatusBadge> : null}
          </span>
        }
        actions={
          <>
            <AdminEditMember member={member} />
            <AdminDeleteMember memberId={member.id} memberNames={member.names} />
          </>
        }
      />

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t.dashboard.advance}
            value={<MoneyAmount cents={standing.advanceCents} />}
            icon={<Wallet className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label={t.dashboard.dues}
            value={<MoneyAmount cents={standing.duesCents} />}
            icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
            badge={
              standing.duesSettled ? (
                <StatusBadge tone="success">{t.dashboard.paid}</StatusBadge>
              ) : (
                <StatusBadge tone="danger">{t.dashboard.notPaid}</StatusBadge>
              )
            }
          />
          <StatCard
            label={t.dashboard.entryFee}
            value={<MoneyAmount cents={standing.entryFeeCents} />}
            icon={<Shield className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label={t.admin.members.owes}
            value={<MoneyAmount cents={standing.outstandingCents} />}
            tone={standing.outstandingCents > 0 ? 'warning' : 'neutral'}
            help={standing.receivedCents > 0 ? `${t.admin.member.received}: ${formatUSD(standing.receivedCents)}` : undefined}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {standing.missedContributions > 0 ? (
              <p
                role="alert"
                className="flex items-start gap-3 rounded-3xl border-2 border-destructive/40 bg-destructive/10 p-5 text-lg"
              >
                <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-destructive" aria-hidden />
                {standing.needsBoardReferral ? t.adminClaims.boardHelp : t.owe.missedWarning(standing.missedContributions)}
              </p>
            ) : null}

            {shareItems.length > 0 ? (
              <SectionCard title={t.adminClaims.collectionTitle} icon={<HandCoins className="h-5 w-5 text-primary" />}>
                <OweList items={shareItems} t={t} formatDate={(d) => fmt.format(d)} />
              </SectionCard>
            ) : null}

            <SectionCard
              title={t.admin.member.history}
              description={t.admin.member.historyHelp}
              icon={<History className="h-5 w-5 text-primary" />}
            >
              <LedgerHistory
                entries={entries}
                t={t}
                locale={locale}
                renderAction={(e) => (
                  <ReverseEntryButton
                    entryId={e.id}
                    summary={`${t.accounts[e.account as keyof typeof t.accounts] ?? e.account} · ${formatUSD(e.amountCents, { sign: 'always' })}`}
                  />
                )}
              />
            </SectionCard>
          </div>

          <div className="space-y-8">
            {!member.archivedAt ? (
              <SectionCard
                title={t.admin.post.title}
                description={t.admin.post.subtitle}
                icon={<PlusCircle className="h-5 w-5 text-primary" />}
              >
                <PostEntryForm memberId={member.id} today={orgIsoDate(today)} />
              </SectionCard>
            ) : null}

            <SectionCard title={t.dashboard.profileTitle}>
              <dl className="space-y-3 text-base">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
                  <dd>{member.phone || t.dashboard.notRecorded}</dd>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
                  <dd>{member.address || t.dashboard.notRecorded}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title={t.admin.member.family} icon={<Users className="h-5 w-5 text-primary" />}>
              <dl className="space-y-4">
                {family.map((f) => (
                  <div key={f.label}>
                    <dt className="text-sm font-semibold text-muted-foreground">{f.label}</dt>
                    <dd className="text-base">{f.values.length ? f.values.join(', ') : t.common.none}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
