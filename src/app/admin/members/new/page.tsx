import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { NewMemberForm } from './new-member-form';

export default async function NewMemberPage() {
  await requireAdmin();
  const t = await getPortalStrings();

  return (
    <AdminShell active="members">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          back={{ href: '/admin/members', label: t.admin.member.back }}
          title={t.memberForm.newTitle}
          subtitle={t.memberForm.newSubtitle}
        />
        <NewMemberForm />
      </div>
    </AdminShell>
  );
}
