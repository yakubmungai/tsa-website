'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      toast.error('Could not switch account. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Users className="h-5 w-5 text-emerald-700" aria-hidden />
        Ninawasaidia
        <span className="text-base font-normal text-slate-500">People I help</span>
      </h2>
      <p className="mt-1 text-base text-slate-600">
        Unaweza kuangalia akaunti zao na kuwasaidia.
        <span className="ml-1 text-slate-500">You can view and help with their accounts.</span>
      </p>

      <div className="mt-4 grid gap-2">
        {accounts.map((account) => (
          <Button
            key={account.delegationId}
            variant="outline"
            disabled={loading !== null}
            onClick={() => handleSwitch(account)}
            className="h-auto w-full justify-start px-4 py-3 text-left"
          >
            <span className="text-base font-semibold text-slate-900">
              {loading === account.delegationId ? 'Inafungua...' : account.names}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
