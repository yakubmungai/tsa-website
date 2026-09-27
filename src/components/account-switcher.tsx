'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { UserRound, Users } from 'lucide-react';
import { SectionCard } from '@/components/portal/section-card';
import { ChoiceButton } from '@/components/portal/choice-button';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { startActingAs } from '@/features/delegation/actions';

export interface SwitchableAccount {
  delegationId: string;
  memberId: string;
  names: string;
}

/**
 * Lets a helper move between their own account and those they assist.
 *
 * The switch writes an acting-session id into the token, but nothing trusts
 * that value: it is re-checked against the database on the server for every
 * request, so revoking access takes effect immediately.
 */
export function AccountSwitcher({ accounts }: { accounts: SwitchableAccount[] }) {
  const t = usePortalStrings();
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  if (accounts.length === 0) return null;

  const handleSwitch = async (account: SwitchableAccount) => {
    setLoading(account.delegationId);
    try {
      const res = await startActingAs({ delegationId: account.delegationId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await update({ actingSessionId: res.data.actingSessionId });
      router.push('/portal');
      router.refresh();
    } catch {
      toast.error(t.helpers.switchFailed);
    } finally {
      setLoading(null);
    }
  };

  return (
    <SectionCard
      title={t.helpers.switcherTitle}
      description={t.helpers.switcherBody}
      icon={<Users className="h-5 w-5 text-primary" aria-hidden />}
    >
      <div className="grid gap-3">
        {accounts.map((account) => (
          <ChoiceButton
            key={account.delegationId}
            disabled={loading !== null}
            onClick={() => handleSwitch(account)}
            icon={<UserRound className="h-6 w-6" aria-hidden />}
            title={loading === account.delegationId ? t.helpers.opening : account.names}
          />
        ))}
      </div>
    </SectionCard>
  );
}
