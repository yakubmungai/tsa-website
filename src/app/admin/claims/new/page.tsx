import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { orgIsoDate } from '@/lib/finance/dates';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { NewClaimForm, type Prefill } from '@/components/admin/claims/new-claim-form';

/**
 * An officer opens a case: a member's death reported by the family by phone,
 * a member who does not use the portal — or a public funeral notice
 * (?from=<submission id>), whose details are carried across.
 */
export default async function AdminNewClaimPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireAdmin();
  const { from } = await searchParams;
  const [t, asOf] = await Promise.all([getPortalStrings(), now()]);

  const members = await db.member.findMany({
    where: { archivedAt: null, status: { not: 'DECEASED' } },
    select: {
      id: true,
      names: true,
      memberNumber: true,
      phone: true,
      husbandWife: true,
      parents: true,
      children: true,
      siblings: true,
    },
    orderBy: { names: 'asc' },
  });

  let prefill: Prefill | null = null;
  if (from) {
    const submission = await db.formSubmission.findUnique({ where: { id: from } });
    if (submission && submission.formType === 'FUNERAL_ASSISTANCE') {
      const d = (submission.data ?? {}) as Record<string, unknown>;
      const str = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
      const passing = str('dateTimeOfPassing').slice(0, 10);
      prefill = {
        submissionId: submission.id,
        memberId: submission.memberId,
        subjectName: str('deceasedName'),
        relation: str('relation'),
        eventDate: /^\d{4}-\d{2}-\d{2}$/.test(passing) ? passing : '',
        description: [
          str('causeOfDeath') && `Cause: ${str('causeOfDeath')}`,
          str('placeOfPassing') && `Place: ${str('placeOfPassing')}`,
          str('burialLocation') && `Burial: ${str('burialLocation')} ${str('burialDate')}`,
          `Reported by ${str('fullName')} (${submission.reference})`,
        ]
          .filter(Boolean)
          .join('\n'),
        contactPhone: submission.submitterPhone ?? '',
        reporterName: str('fullName'),
      };
    }
  }

  return (
    <AdminShell active="claims">
      <PageHeader
        back={{ href: '/admin/claims', label: t.adminClaims.title }}
        title={t.adminClaims.newCaseTitle}
        subtitle={t.adminClaims.newCaseHelp}
      />
      <SectionCard>
        <NewClaimForm members={members} today={orgIsoDate(asOf)} prefill={prefill} />
      </SectionCard>
    </AdminShell>
  );
}
