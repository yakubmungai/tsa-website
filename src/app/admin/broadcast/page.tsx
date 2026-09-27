import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { BroadcastComposer } from '@/components/broadcast-composer';

/**
 * Compose a WhatsApp announcement for the TSA group.
 *
 * WhatsApp is where the association actually communicates, so this meets
 * leaders where they already are: it produces the message and they paste it.
 * No Meta account, no per-message cost, nothing to approve.
 */
export default async function AdminBroadcastPage() {
  await requireAdmin();
  const t = await getPortalStrings();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tansha.org';

  return (
    <AdminShell active="broadcast">
      <PageHeader title={t.broadcast.title} subtitle={t.broadcast.subtitle} />
      <BroadcastComposer siteUrl={siteUrl} />
    </AdminShell>
  );
}
