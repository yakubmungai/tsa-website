import { db } from '@/lib/db';
import { requirePermission } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { getMemberStanding } from '@/lib/finance/ledger';
import { orgIsoDate } from '@/lib/finance/dates';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { ClaimWizard } from '@/components/portal/claim-wizard';

export default async function NewClaimPage() {
  const ctx = await requirePermission('SUBMIT_FORMS');
  const [t, asOf] = await Promise.all([getPortalStrings(), now()]);
  const member = await db.member.findUniqueOrThrow({
    where: { id: ctx.memberId },
    select: { id: true, names: true, phone: true, husbandWife: true, parents: true, children: true, siblings: true },
  });

  // An estimate from today's standing. The reviewer fixes the real figure from
  // the standing on the event date (Art 18.9); the wizard says so.
  const standing = await getMemberStanding(member.id, { asOf });

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ href: '/portal', label: t.common.back }}
        title={t.claims.newTitle}
        subtitle={t.claims.newSubtitle}
      />
      <ClaimWizard
        memberId={member.id}
        memberName={member.names}
        isActing={ctx.isActing}
        relatives={{
          spouse: member.husbandWife,
          parents: member.parents,
          children: member.children,
          siblings: member.siblings,
        }}
        defaultPhone={member.phone ?? ''}
        today={orgIsoDate(asOf)}
        estimate={{
          majorDeathCents: standing.benefits.majorDeathCents,
          relativeOrHardshipCents: standing.benefits.relativeOrHardshipCents,
          voluntary: standing.tier === 'VOLUNTARY' || standing.isWithinNewMemberWait,
        }}
      />
    </PageShell>
  );
}
