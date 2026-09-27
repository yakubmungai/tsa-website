'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { announceClaim } from '@/features/claims/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { formatUSD } from '@/lib/money';

/**
 * Tangaza. Shows roughly what each member will pay before anything is charged,
 * then charges everyone in one step.
 */
export function AnnouncePanel({
  claimId,
  payers,
  approxShareCents,
  notBefore,
}: {
  claimId: string;
  payers: number;
  approxShareCents: number;
  notBefore: string | null;
}) {
  const t = usePortalStrings();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function announce() {
    startTransition(async () => {
      const res = await announceClaim({ claimId });
      if (res.success) {
        toast.success(t.adminClaims.announced(res.data.payers, formatUSD(res.data.totalCents), res.data.deferred));
        router.refresh();
      } else {
        toast.error(res.error);
      }
      setConfirming(false);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-lg">{t.adminClaims.announcePreview(payers, formatUSD(approxShareCents))}</p>
      {notBefore ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-base">{t.adminClaims.notBefore(notBefore)}</p>
      ) : null}
      {confirming ? (
        <div className="space-y-3 rounded-2xl border-2 border-warning/50 bg-warning/10 p-4">
          <p className="text-base font-semibold">{t.adminClaims.announceWarn}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="min-h-12 flex-1 rounded-xl border-2 border-border text-base font-semibold"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={announce}
              disabled={pending}
              className="btn-shimmer min-h-12 flex-1 rounded-xl text-base font-bold text-primary-foreground"
            >
              {pending ? t.common.loading : t.common.confirm}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground"
        >
          <Megaphone className="h-5 w-5" aria-hidden />
          {t.adminClaims.announce}
        </button>
      )}
    </div>
  );
}
