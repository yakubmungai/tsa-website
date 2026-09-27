'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { HandCoins, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { closeClaim, recordPayout } from '@/features/claims/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { MoneyAmount } from '@/components/portal/money';
import { cn } from '@/lib/utils';

/**
 * Lipa / Funga. The benefit can only be recorded once every Art 18.9 condition
 * is ticked; part-payments are allowed (e.g. the funeral home first).
 */
export function PayoutPanel({
  claimId,
  status,
  benefitCents,
  paidOutCents,
  conditionsMet,
  defaultPaidTo,
  memorialRequested,
  today,
}: {
  claimId: string;
  status: string;
  benefitCents: number;
  paidOutCents: number;
  conditionsMet: boolean;
  defaultPaidTo: string;
  memorialRequested: boolean;
  today: string;
}) {
  const t = usePortalStrings();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const remaining = Math.max(0, benefitCents - paidOutCents);
  const [kind, setKind] = useState<'BENEFIT_PAYOUT' | 'MEMORIAL_GRANT'>('BENEFIT_PAYOUT');
  const [amount, setAmount] = useState(remaining > 0 ? (remaining / 100).toFixed(2) : '');
  const [paidOn, setPaidOn] = useState(today);
  const [paidTo, setPaidTo] = useState(defaultPaidTo);

  function pay() {
    startTransition(async () => {
      const res = await recordPayout({ claimId, kind, amount, paidOn, paidTo });
      if (res.success) {
        toast.success(t.admin.post.posted);
        router.refresh();
      } else {
        toast.error(res.fieldErrors?.amount?.[0] ?? res.error);
      }
    });
  }

  function close() {
    startTransition(async () => {
      const res = await closeClaim({ claimId });
      if (res.success) {
        toast.success(t.adminClaims.closed);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const blocked = kind === 'BENEFIT_PAYOUT' && !conditionsMet;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="text-sm text-muted-foreground">{t.claims.benefit}</dt>
          <dd className="text-lg font-bold">
            <MoneyAmount cents={benefitCents} />
          </dd>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="text-sm text-muted-foreground">{t.adminClaims.paidOut}</dt>
          <dd className="text-lg font-bold">
            <MoneyAmount cents={paidOutCents} />
          </dd>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="text-sm text-muted-foreground">{t.adminClaims.remaining}</dt>
          <dd className="text-lg font-bold">
            <MoneyAmount cents={remaining} />
          </dd>
        </div>
      </dl>

      {status !== 'CLOSED' ? (
        <div className="space-y-4">
          {memorialRequested ? (
            <div className="grid grid-cols-2 gap-2">
              {(['BENEFIT_PAYOUT', 'MEMORIAL_GRANT'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setAmount(k === 'MEMORIAL_GRANT' ? '300.00' : (remaining / 100).toFixed(2));
                  }}
                  className={cn(
                    'min-h-12 rounded-xl border-2 px-3 text-base font-semibold',
                    kind === k ? 'border-primary bg-primary/10' : 'border-border/70 text-muted-foreground'
                  )}
                >
                  {t.adminClaims.kinds[k]}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payAmount" className="text-base">
                {t.adminClaims.payoutAmount} ($)
              </Label>
              <Input id="payAmount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payOn" className="text-base">
                {t.adminClaims.paidOn}
              </Label>
              <Input id="payOn" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="h-12 text-lg" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payTo" className="text-base">
              {t.adminClaims.paidTo}
            </Label>
            <Input id="payTo" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} className="h-12 text-base" />
          </div>
          {blocked ? (
            <p className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-base">
              <Lock className="h-5 w-5 text-warning" aria-hidden />
              {t.adminClaims.conditionsFirst}
            </p>
          ) : null}
          <button
            type="button"
            onClick={pay}
            disabled={pending || blocked || !(Number(amount) > 0) || paidTo.trim().length < 2}
            className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground disabled:opacity-50"
          >
            <HandCoins className="h-5 w-5" aria-hidden />
            {t.adminClaims.recordPayout}
          </button>
          {status === 'PAID' || status === 'VOLUNTARY' ? (
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="min-h-12 w-full rounded-xl border-2 border-border text-base font-semibold hover:bg-muted"
            >
              {t.adminClaims.close}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
