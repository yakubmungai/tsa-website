'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { UserCog } from 'lucide-react';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { stopActingAs } from '@/features/delegation/actions';

/**
 * Shown continuously while someone is using another member's account.
 *
 * Not dismissible. A helper looking at a relative's balance must never be in
 * any doubt about whose account is on screen, and the member's record shows
 * that every action was taken by someone else.
 */
export function ActingBanner({ ownerName }: { ownerName: string }) {
  const t = usePortalStrings();
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopActingAs({});
      await update({ actingSessionId: null });
      router.push('/portal');
      router.refresh();
    } catch {
      toast.error(t.helpers.switchBackFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-[90] w-full border-b-2 border-warning bg-accent text-accent-foreground"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-center">
        <p className="flex items-center gap-2 text-base font-bold">
          <UserCog className="h-5 w-5 shrink-0" aria-hidden />
          {t.helpers.actingAs(ownerName)}
        </p>
        <button
          type="button"
          onClick={handleStop}
          disabled={loading}
          className="inline-flex min-h-12 items-center rounded-xl bg-foreground px-4 text-base font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t.common.loading : t.helpers.backToMine}
        </button>
      </div>
    </div>
  );
}
