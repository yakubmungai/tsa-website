'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, HandCoins, PlayCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approveClaim, markClaimVoluntary, rejectClaim, startClaimReview } from '@/features/claims/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { formatUSD } from '@/lib/money';
import { cn } from '@/lib/utils';

type ClaimType = 'MEMBER_DEATH' | 'CHILD_DEATH' | 'RELATIVE_DEATH' | 'HARDSHIP';

/**
 * Kagua / Idhinisha. The amount is pre-filled from the rules; the officer
 * changes it only with a reason. Kihiari and reject are one step away, each
 * asking for the reason the member will see.
 */
export function DecisionPanel({
  claimId,
  status,
  suggestedType,
  suggestedCents,
  suggestVoluntary,
  benefitsByType,
}: {
  claimId: string;
  status: string;
  suggestedType: ClaimType;
  suggestedCents: number;
  suggestVoluntary: boolean;
  /** What each type pays at this member's tier on the event date. */
  benefitsByType: Record<ClaimType, number>;
}) {
  const t = usePortalStrings();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<ClaimType>(suggestedType);
  const [amount, setAmount] = useState(suggestedCents > 0 ? (suggestedCents / 100).toFixed(2) : '');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'approve' | 'voluntary' | 'reject'>(suggestVoluntary ? 'voluntary' : 'approve');

  const amountCents = Math.round(Number(amount.replace(/[$,]/g, '')) * 100);
  const overridden = type !== suggestedType || amountCents !== suggestedCents;

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (res.success) router.refresh();
      else toast.error(res.error);
    });
  }

  if (status === 'SUBMITTED') {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => startClaimReview({ claimId }))}
        className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground"
      >
        <PlayCircle className="h-5 w-5" aria-hidden />
        {t.adminClaims.startReview}
      </button>
    );
  }

  const modes: { key: typeof mode; label: string; icon: React.ReactNode }[] = [
    { key: 'approve', label: t.adminClaims.approve, icon: <CheckCircle2 className="h-5 w-5" aria-hidden /> },
    { key: 'voluntary', label: t.adminClaims.markVoluntary, icon: <HandCoins className="h-5 w-5" aria-hidden /> },
    { key: 'reject', label: t.adminClaims.reject, icon: <XCircle className="h-5 w-5" aria-hidden /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist">
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-semibold',
              mode === m.key ? 'border-primary bg-primary/10' : 'border-border/70 text-muted-foreground'
            )}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'approve' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">{t.adminClaims.payAs}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(benefitsByType) as ClaimType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={type === k}
                  onClick={() => {
                    setType(k);
                    setAmount((benefitsByType[k] / 100).toFixed(2));
                  }}
                  className={cn(
                    'min-h-12 rounded-xl border-2 px-3 py-2 text-left text-base',
                    type === k ? 'border-primary bg-primary/10 font-semibold' : 'border-border/70 text-muted-foreground'
                  )}
                >
                  {t.claims.types[k].title} · {formatUSD(benefitsByType[k])}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="benefit" className="text-base">
              {t.adminClaims.benefitAmount} ($)
            </Label>
            <Input id="benefit" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note" className="text-base">
              {t.adminClaims.note}
            </Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 text-base" />
            {overridden ? <p className="text-base text-warning">{t.adminClaims.overrideNote}</p> : null}
          </div>
          <button
            type="button"
            disabled={pending || !(amountCents > 0) || (overridden && note.trim().length < 3)}
            onClick={() => run(() => approveClaim({ claimId, effectiveType: type, benefit: amount, note }))}
            className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {t.adminClaims.approve}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base">
              {mode === 'reject' ? t.adminClaims.rejectReason : t.adminClaims.note}
            </Label>
            <Textarea id="reason" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 text-base" />
          </div>
          <button
            type="button"
            disabled={pending || note.trim().length < 3}
            onClick={() =>
              run(() => (mode === 'reject' ? rejectClaim({ claimId, note }) : markClaimVoluntary({ claimId, note })))
            }
            className={cn(
              'inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold disabled:opacity-50',
              mode === 'reject' ? 'bg-destructive text-destructive-foreground' : 'btn-shimmer text-primary-foreground'
            )}
          >
            {mode === 'reject' ? t.adminClaims.reject : t.adminClaims.markVoluntary}
          </button>
        </div>
      )}
    </div>
  );
}
