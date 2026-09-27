import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ClipboardCheck, FileText, HandCoins, Info, Megaphone, User, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { isDemoMode } from '@/lib/demo';
import { formatUSD } from '@/lib/money';
import { orgIsoDate } from '@/lib/finance/dates';
import { CLAIM_TYPES, type ClaimTypeKey, type StandingTier } from '@/lib/finance/constants';
import { benefitFor, eligiblePayers, splitLevy } from '@/lib/finance/levy';
import type { EligibilityResult } from '@/lib/finance/eligibility';
import { collectedCents, effectiveType, loadShares, paidOutCents, reviewClaim } from '@/features/claims/service';
import { announcementMessage, reminderMessage } from '@/features/claims/messages';
import { AdminShell } from '@/components/admin/admin-shell';
import { Stepper } from '@/components/admin/claims/stepper';
import { ClaimChecklist } from '@/components/admin/claims/checklist';
import { DecisionPanel } from '@/components/admin/claims/decision-panel';
import { AnnouncePanel } from '@/components/admin/claims/announce-panel';
import { CollectionsTable, type CollectionRow } from '@/components/admin/claims/collections-table';
import { PayoutPanel } from '@/components/admin/claims/payout-panel';
import { PAY_LINK_PLACEHOLDER, WhatsAppButton } from '@/components/admin/claims/whatsapp-button';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { StatusBadge } from '@/components/portal/status-badge';
import { MoneyAmount } from '@/components/portal/money';
import { ClaimStatusBadge, type ClaimStatusKey } from '@/components/portal/claim-status';

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tansha.org').replace(/\/$/, '');
}

export default async function AdminClaimPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [t, locale, asOf] = await Promise.all([getPortalStrings(), getLocale(), now()]);
  const demo = isDemoMode();

  const claim = await db.claim.findUnique({
    where: { id },
    include: { member: true },
  });
  if (!claim) notFound();

  const fmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });
  const decided = claim.tierAtEvent !== null;

  // Before a decision: compute fresh. After: show what the reviewer saw.
  let tier: StandingTier;
  let eligibility: EligibilityResult;
  let standingAtEventCents: number;
  if (decided && claim.eligibility) {
    tier = claim.tierAtEvent as StandingTier;
    eligibility = claim.eligibility as unknown as EligibilityResult;
    standingAtEventCents = claim.standingAtEventCents ?? 0;
  } else {
    const review = await reviewClaim(claim.id);
    tier = review.tierAtEvent;
    eligibility = review.eligibility;
    standingAtEventCents = review.standingAtEventCents;
  }
  const benefitsByType = Object.fromEntries(
    (Object.keys(CLAIM_TYPES) as ClaimTypeKey[]).map((k) => [k, benefitFor(k, tier)])
  ) as Record<ClaimTypeKey, number>;

  const typeKey = effectiveType(claim);
  const status = claim.status as ClaimStatusKey;

  // Announce preview: who would pay, and roughly how much each.
  let payersCount = 0;
  let approxShare = 0;
  if (status === 'APPROVED' && claim.levyPoolCents) {
    const candidates = await db.member.findMany({
      select: { id: true, status: true, archivedAt: true, memberNumber: true, names: true },
    });
    const payers = eligiblePayers(
      candidates.map((c) => ({ ...c, archived: c.archivedAt !== null })),
      CLAIM_TYPES[typeKey].divisor,
      claim.memberId
    );
    payersCount = payers.length;
    approxShare = splitLevy(claim.levyPoolCents, payers).values().next().value ?? 0;
  }

  // Collections.
  const shares = ['COLLECTING', 'PAID', 'CLOSED'].includes(status) ? await loadShares({ claimId: claim.id }, asOf) : [];
  const shareMembers = shares.length
    ? await db.member.findMany({
        where: { id: { in: shares.map((s) => s.memberId) } },
        select: { id: true, names: true, phoneE164: true },
      })
    : [];
  const memberById = new Map(shareMembers.map((m) => [m.id, m]));
  const link = `${siteUrl()}/portal`;
  const rows: CollectionRow[] = shares.map((s) => {
    const m = memberById.get(s.memberId);
    return {
      id: s.id,
      memberId: s.memberId,
      names: m?.names ?? '',
      phoneE164: m?.phoneE164 ?? null,
      amountCents: s.amountCents,
      outstandingCents: s.outstandingCents,
      fromAdvanceCents: s.fromAdvanceCents,
      state: s.state,
      excuseNote: s.excuseNote,
      reminder: reminderMessage({
        firstName: (m?.names ?? '').split(' ')[0],
        reference: claim.reference,
        subjectName: claim.subjectName,
        amount: formatUSD(s.outstandingCents),
        deadline: fmt.format(s.dueAt),
        overdue: s.state === 'OVERDUE',
        // Replaced with the member's own pay link when the officer opens it.
        link: PAY_LINK_PLACEHOLDER,
      }),
    };
  });
  const [collected, paidOut] = await Promise.all([collectedCents(claim.id), paidOutCents(claim.id)]);
  const outstanding = shares.reduce((s, x) => s + (x.state === 'EXCUSED' ? 0 : x.outstandingCents), 0);
  const paidCount = shares.filter((s) => s.state === 'PAID').length;

  const counts = new Map<number, number>();
  for (const s of shares) counts.set(s.amountCents, (counts.get(s.amountCents) ?? 0) + 1);
  const typical = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? approxShare;
  const announcement =
    status === 'COLLECTING' || status === 'VOLUNTARY' || status === 'PAID'
      ? announcementMessage({
          type: typeKey,
          reference: claim.reference,
          memberName: claim.member.names,
          subjectName: claim.subjectName,
          share: formatUSD(typical),
          deadline: claim.dueAt ? fmt.format(claim.dueAt) : '',
          voluntary: status === 'VOLUNTARY',
          link,
        })
      : null;

  const docs = claim.documentsChecklist as Record<string, boolean>;
  const conditions = claim.payoutConditions as Record<string, boolean>;
  const conditionsMet = ['muhasibuChecked', 'muhakikiApproved', 'idSeen', 'receiptSigned'].every((k) => conditions[k]);
  const today = orgIsoDate(asOf);

  return (
    <AdminShell active="claims">
      <PageHeader
        back={{ href: '/admin/claims', label: t.adminClaims.title }}
        eyebrow={claim.reference}
        title={`${t.claims.types[claim.type].title}: ${claim.subjectName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <ClaimStatusBadge status={status} t={t} />
            <Link href={`/admin/members/${claim.memberId}`} className="text-base font-semibold text-primary hover:underline">
              {claim.member.names}
            </Link>
          </span>
        }
      />

      <div className="space-y-8">
        <SectionCard>
          <Stepper status={status} t={t} />
        </SectionCard>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">
            {/* What happens next, first. */}
            {status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? (
              <SectionCard title={t.adminClaims.approveTitle} icon={<ClipboardCheck className="h-5 w-5 text-primary" />}>
                <DecisionPanel
                  claimId={claim.id}
                  status={status}
                  suggestedType={eligibility.effectiveType}
                  suggestedCents={eligibility.suggestedBenefitCents}
                  suggestVoluntary={eligibility.suggestVoluntary}
                  benefitsByType={benefitsByType}
                />
              </SectionCard>
            ) : null}

            {status === 'APPROVED' ? (
              <SectionCard title={t.adminClaims.announceTitle} icon={<Megaphone className="h-5 w-5 text-primary" />}>
                <AnnouncePanel
                  claimId={claim.id}
                  payers={payersCount}
                  approxShareCents={approxShare}
                  notBefore={
                    eligibility.announceNotBefore && new Date(eligibility.announceNotBefore) > asOf
                      ? fmt.format(new Date(eligibility.announceNotBefore))
                      : null
                  }
                />
              </SectionCard>
            ) : null}

            {announcement ? (
              <SectionCard
                title={t.adminClaims.message}
                icon={<Megaphone className="h-5 w-5 text-primary" />}
                actions={<WhatsAppButton message={announcement} label={t.adminClaims.openWhatsapp} demo={demo} variant="primary" />}
              >
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 font-sans text-base">
                  {announcement}
                </pre>
              </SectionCard>
            ) : null}

            {shares.length > 0 ? (
              <SectionCard
                title={t.adminClaims.collectionTitle}
                description={t.adminClaims.paidCount(paidCount, shares.length)}
                icon={<Users className="h-5 w-5 text-primary" />}
              >
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-success/10 p-3">
                    <p className="text-sm text-muted-foreground">{t.adminClaims.collected}</p>
                    <MoneyAmount cents={collected} className="text-xl font-bold" />
                  </div>
                  <div className="rounded-2xl bg-warning/10 p-3">
                    <p className="text-sm text-muted-foreground">{t.adminClaims.outstanding}</p>
                    <MoneyAmount cents={outstanding} className="text-xl font-bold" />
                  </div>
                  <div className="rounded-2xl bg-muted/60 p-3">
                    <p className="text-sm text-muted-foreground">{t.claims.benefit}</p>
                    <MoneyAmount cents={claim.benefitCents ?? 0} className="text-xl font-bold" />
                  </div>
                </div>
                <CollectionsTable rows={rows} today={today} demo={demo} />
              </SectionCard>
            ) : null}

            {['COLLECTING', 'PAID', 'CLOSED', 'VOLUNTARY'].includes(status) ? (
              <SectionCard title={t.adminClaims.payoutTitle} icon={<HandCoins className="h-5 w-5 text-primary" />}>
                <div className="space-y-6">
                  {status !== 'VOLUNTARY' ? (
                    <div className="space-y-3">
                      <p className="text-base font-semibold">{t.adminClaims.conditionsTitle}</p>
                      <ClaimChecklist
                        claimId={claim.id}
                        field="payoutConditions"
                        values={conditions}
                        disabled={status === 'CLOSED'}
                        items={(['muhasibuChecked', 'muhakikiApproved', 'idSeen', 'receiptSigned'] as const).map((k) => ({
                          key: k,
                          label: t.adminClaims.conditions[k],
                        }))}
                      />
                    </div>
                  ) : null}
                  <PayoutPanel
                    claimId={claim.id}
                    status={status}
                    benefitCents={claim.benefitCents ?? 0}
                    paidOutCents={paidOut}
                    conditionsMet={conditionsMet}
                    defaultPaidTo={claim.recipientName ?? claim.member.names}
                    memorialRequested={claim.memorialRequested}
                    today={today}
                  />
                </div>
              </SectionCard>
            ) : null}

            {claim.decisionNote ? (
              <SectionCard title={t.adminClaims.decision}>
                <p className="text-base">{claim.decisionNote}</p>
              </SectionCard>
            ) : null}
          </div>

          <div className="space-y-8 lg:col-span-2">
            <SectionCard title={t.adminClaims.details} icon={<FileText className="h-5 w-5 text-primary" />}>
              <dl className="space-y-3 text-base">
                <Item label={t.adminClaims.subject} value={claim.subjectName} />
                <Item label={t.adminClaims.relationship} value={t.claims.relationships[claim.relationship]} />
                {claim.hardshipCategory ? (
                  <Item label={t.claims.whichKind} value={t.claims.hardship[claim.hardshipCategory].title} />
                ) : null}
                {claim.subjectAge !== null ? <Item label={t.adminClaims.age} value={String(claim.subjectAge)} /> : null}
                {claim.subjectLivesInUsa !== null ? (
                  <Item label={t.adminClaims.livesInUsa} value={claim.subjectLivesInUsa ? t.common.yes : t.common.no} />
                ) : null}
                <Item label={t.adminClaims.eventDate} value={fmt.format(claim.eventDate)} />
                <Item label={t.adminClaims.reportedAt} value={fmt.format(claim.reportedAt)} />
                {claim.contactPhone ? <Item label={t.adminClaims.contact} value={claim.contactPhone} /> : null}
                {claim.recipientName ? (
                  <Item
                    label={t.adminClaims.recipient}
                    value={[claim.recipientName, claim.recipientRelationship, claim.recipientPhone].filter(Boolean).join(' · ')}
                  />
                ) : null}
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground">{t.claims.detailsQuestion}</dt>
                  <dd className="whitespace-pre-wrap">{claim.description}</dd>
                </div>
                {claim.memorialRequested ? (
                  <p className="rounded-xl bg-accent/20 p-3">
                    {t.adminClaims.memorialRequested}
                    {claim.memorialDate ? ` — ${fmt.format(claim.memorialDate)}` : ''}
                  </p>
                ) : null}
              </dl>
            </SectionCard>

            <SectionCard
              title={t.adminClaims.standingTitle}
              description={t.adminClaims.standingHelp}
              icon={<User className="h-5 w-5 text-primary" />}
            >
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/60 p-3">
                  <dt className="text-sm text-muted-foreground">{t.adminClaims.tier}</dt>
                  <dd className="text-base font-bold">{t.tiers[tier]}</dd>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3">
                  <dt className="text-sm text-muted-foreground">{t.adminClaims.held}</dt>
                  <dd className="text-base font-bold">
                    <MoneyAmount cents={standingAtEventCents} />
                  </dd>
                </div>
                <div className="col-span-2 rounded-2xl bg-primary/10 p-3">
                  <dt className="text-sm text-muted-foreground">{t.adminClaims.suggested}</dt>
                  <dd className="text-xl font-bold">
                    {eligibility.suggestVoluntary ? t.tiers.VOLUNTARY : <MoneyAmount cents={eligibility.suggestedBenefitCents} />}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title={t.adminClaims.flagsTitle} icon={<AlertTriangle className="h-5 w-5 text-warning" />}>
              {eligibility.flags.length === 0 ? (
                <p className="text-base text-muted-foreground">{t.adminClaims.flagsNone}</p>
              ) : (
                <ul className="space-y-3">
                  {eligibility.flags.map((f) => (
                    <li
                      key={f.code}
                      className={
                        f.severity === 'warning'
                          ? 'flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3'
                          : 'flex gap-3 rounded-xl border border-border/60 bg-muted/40 p-3'
                      }
                    >
                      {f.severity === 'warning' ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                      ) : (
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
                      )}
                      <div>
                        <p className="text-base">{t.adminClaims.flags[f.code](f.params ?? {})}</p>
                        <StatusBadge tone="neutral" className="mt-1 text-xs">
                          {f.article}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title={t.adminClaims.documentsTitle} icon={<ClipboardCheck className="h-5 w-5 text-primary" />}>
              <ClaimChecklist
                claimId={claim.id}
                field="documentsChecklist"
                values={docs}
                disabled={status === 'CLOSED'}
                items={(Object.keys(t.adminClaims.documents) as (keyof typeof t.adminClaims.documents)[]).map((k) => ({
                  key: k,
                  label: t.adminClaims.documents[k],
                }))}
              />
            </SectionCard>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
