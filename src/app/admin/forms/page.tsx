import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { AdminSubmissionsList } from '@/components/admin-submissions-list';

export default async function AdminFormsPage() {
  await requireAdmin();
  const t = await getPortalStrings();

  // Fetch all form submissions
  const submissionsRaw = await db.formSubmission.findMany({
    // Testers' notes from the demo live on the demo page, not in the queue.
    where: { formType: { not: 'DEMO_FEEDBACK' } },
    include: {
      member: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const submissions = submissionsRaw.map((s) => ({
    id: s.id,
    memberId: s.memberId,
    formType: s.formType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: s.status as any,
    data: s.data,
    createdAt: s.createdAt,
    memberNames: s.member?.names,
  }));

  return (
    <AdminShell active="forms">
      <PageHeader title={t.adminForms.title} subtitle={t.adminForms.subtitle} />
      <AdminSubmissionsList initialSubmissions={submissions} />
    </AdminShell>
  );
}
