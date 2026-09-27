import { AlertTriangle, HandCoins, Users, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { duesYearFor, tierFromCache } from '@/lib/finance/balance';
import { refreshStaleBalances } from '@/lib/finance/ledger';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminMembersList, type DirectoryMember } from '@/components/admin-members-list';
import { PageHeader } from '@/components/portal/page-header';
import { StatCard } from '@/components/portal/stat-card';
import { MoneyAmount } from '@/components/portal/money';

export default async function AdminMembersPage() {
  await requireAdmin();
  // Shares deferred into this month become owed without any write; catch up.
  await refreshStaleBalances();
  const [t, asOf] = await Promise.all([getPortalStrings(), now()]);
  const currentDuesYear = duesYearFor(asOf);

  // One row per member from the cached balance — never every ledger entry for
  // every member, which is what made this page slow as the levies grow.
  const rows = await db.member.findMany({
    where: { archivedAt: null },
    include: { balance: true },
    orderBy: { names: 'asc' },
  });

  const members: DirectoryMember[] = rows.map((m) => {
    const cache = m.balance ?? { advanceCents: 0, duesCents: 0, duesYear: currentDuesYear, netCents: 0, outstandingCents: 0 };
    const { tier } = tierFromCache(cache, currentDuesYear);
    return {
      id: m.id,
      names: m.names,
      memberNumber: m.memberNumber,
      phone: m.phone,
      address: m.address,
      husbandWife: m.husbandWife,
      spousePhone: m.spousePhone,
      parents: m.parents,
      children: m.children,
      siblings: m.siblings,
      witnesses: m.witnesses,
      nextOfKin: m.nextOfKin,
      advanceCents: cache.advanceCents,
      outstandingCents: cache.outstandingCents,
      netCents: cache.netCents,
      tier,
    };
  });

  const advanceHeld = members.reduce((s, m) => s + Math.max(0, m.advanceCents), 0);
  const owing = members.filter((m) => m.outstandingCents > 0);
  const outstanding = owing.reduce((s, m) => s + m.outstandingCents, 0);
  const below = members.filter((m) => m.tier !== 'FULL').length;

  return (
    <AdminShell active="members">
      <PageHeader title={t.admin.members.title} subtitle={t.admin.members.subtitle} />

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t.admin.members.total}
            value={members.length}
            help={t.admin.members.totalHelp}
            icon={<Users className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label={t.admin.members.advanceHeld}
            value={<MoneyAmount cents={advanceHeld} />}
            help={t.admin.members.advanceHeldHelp}
            icon={<Wallet className="h-5 w-5" aria-hidden />}
            tone="success"
          />
          <StatCard
            label={t.admin.members.outstanding}
            value={<MoneyAmount cents={outstanding} />}
            help={t.admin.members.outstandingHelp(owing.length)}
            icon={<HandCoins className="h-5 w-5" aria-hidden />}
            tone={outstanding > 0 ? 'warning' : 'neutral'}
          />
          <StatCard
            label={t.admin.members.belowMinimum}
            value={below}
            help={t.admin.members.belowMinimumHelp}
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            tone={below > 0 ? 'danger' : 'neutral'}
          />
        </div>

        <AdminMembersList members={members} />
      </div>
    </AdminShell>
  );
}
