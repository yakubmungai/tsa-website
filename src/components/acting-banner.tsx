'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { UserCog } from 'lucide-react';
import { stopActingAs } from '@/features/delegation/actions';

/**
 * Shown continuously while someone is using another member's account.
 *
 * Not dismissible. A helper looking at a relative's balance must never be in
 * any doubt about whose account is on screen, and the member's record shows
 * that every action was taken by someone else.
 */
export function ActingBanner({ ownerName }: { ownerName: string }) {
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
      toast.error('Could not switch back. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-[90] w-full border-b-2 border-amber-600 bg-amber-400 text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
        <UserCog className="h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm font-bold sm:text-base">
          Unatumia akaunti ya <strong>{ownerName}</strong>
          <span className="mx-2 font-normal opacity-70">|</span>
          You are using {ownerName}&rsquo;s account
        </p>
        <button
          type="button"
          onClick={handleStop}
          disabled={loading}
          className="rounded-md bg-amber-950 px-3 py-1 text-sm font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-60"
        >
          {loading ? '...' : 'Rudi kwangu / Back to mine'}
        </button>
      </div>
    </div>
  );
}
