import { ShieldCheck, UserRound } from 'lucide-react';
import { db } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { formatPhone } from '@/lib/phone';
import { AddHelperForm } from '@/components/add-helper-form';
import { RevokeHelperButton } from '@/components/revoke-helper-button';
import { PageShell } from '@/components/portal/page-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { StatusBadge } from '@/components/portal/status-badge';
import { EmptyState } from '@/components/portal/empty-state';
import { HelpButton } from '@/components/portal/help-button';

export default async function PortalAccessPage() {
  const ctx = await requireMember();
  const t = await getPortalStrings();

  const delegations = await db.delegation.findMany({
    where: { ownerMemberId: ctx.memberId, status: { in: ['ACTIVE', 'PENDING_OWNER_APPROVAL'] } },
    orderBy: { createdAt: 'desc' },
  });

  const permissionLabel = (p: string) =>
    t.helpers.permissions[p as keyof typeof t.helpers.permissions] ?? p;

  return (
    <PageShell width="narrow">
      <PageHeader
        back={{ href: '/portal', label: t.common.back }}
        title={t.helpers.title}
        subtitle={t.helpers.subtitle}
        actions={<HelpButton />}
      />

      <div className="space-y-6">
        <SectionCard
          title={t.helpers.whoTitle}
          description={t.helpers.whoBody}
          icon={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden />}
        >
          {delegations.length === 0 ? (
            <EmptyState
              icon={<UserRound className="h-6 w-6" aria-hidden />}
              title={t.helpers.none}
              body={t.helpers.noneBody}
              className="py-6"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {delegations.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="break-words text-lg font-semibold text-foreground">
                      {d.delegateName}
                      {d.relationship ? (
                        <span className="ml-2 text-base font-normal text-muted-foreground">
                          ({d.relationship})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-base text-muted-foreground">{formatPhone(d.delegatePhoneE164)}</p>
                    <p className="text-base text-foreground">
                      {d.permissions.map(permissionLabel).join(' · ')}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {d.status === 'PENDING_OWNER_APPROVAL' ? (
                        <StatusBadge tone="warning">{t.helpers.pending}</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">{t.helpers.active}</StatusBadge>
                      )}
                      {d.origin === 'ADMIN_PROVISIONED' ? (
                        <StatusBadge tone="neutral">{t.helpers.byOffice}</StatusBadge>
                      ) : null}
                    </div>
                  </div>
                  <RevokeHelperButton delegationId={d.id} name={d.delegateName} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <AddHelperForm />
      </div>
    </PageShell>
  );
}
