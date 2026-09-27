'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { postLedgerEntry } from '@/features/finance/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { cn } from '@/lib/utils';

type Account = 'ADVANCE_DEPOSIT' | 'ENTRY_FEE' | 'ANNUAL_DUES' | 'ADJUSTMENT';

const SUGGESTED: Record<Account, string> = {
  ADVANCE_DEPOSIT: '100',
  ENTRY_FEE: '100',
  ANNUAL_DUES: '25',
  ADJUSTMENT: '',
};

/**
 * Record money a member paid. The common case — money received for savings,
 * the joining fee or dues — is the default and needs three taps.
 */
export function PostEntryForm({ memberId, today }: { memberId: string; today: string }) {
  const t = usePortalStrings();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [account, setAccount] = useState<Account>('ADVANCE_DEPOSIT');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState(SUGGESTED.ADVANCE_DEPOSIT);
  const [paidOn, setPaidOn] = useState(today);
  const [memo, setMemo] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function choose(next: Account) {
    setAccount(next);
    setAmount(SUGGESTED[next]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await postLedgerEntry({ memberId, account, direction, amount, paidOn, memo });
      if (res.success) {
        toast.success(t.admin.post.posted);
        setMemo('');
        setErrors({});
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.fieldErrors?.memo ? t.admin.post.memoRequired : res.error);
      }
    });
  }

  const accounts: Account[] = ['ADVANCE_DEPOSIT', 'ANNUAL_DUES', 'ENTRY_FEE', 'ADJUSTMENT'];

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-base font-semibold">{t.admin.post.what}</legend>
        <div className="grid grid-cols-2 gap-2">
          {accounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => choose(a)}
              aria-pressed={account === a}
              className={cn(
                'min-h-12 rounded-xl border-2 px-3 py-2 text-left text-base font-semibold transition-colors',
                account === a
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/70 bg-card text-muted-foreground hover:border-primary/60'
              )}
            >
              {t.admin.post[a]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-base font-semibold">{t.admin.post.direction}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['IN', 'OUT'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              aria-pressed={direction === d}
              className={cn(
                'min-h-12 rounded-xl border-2 px-3 text-base font-semibold transition-colors',
                direction === d
                  ? d === 'IN'
                    ? 'border-success bg-success/10 text-foreground'
                    : 'border-destructive bg-destructive/10 text-foreground'
                  : 'border-border/70 bg-card text-muted-foreground'
              )}
            >
              {d === 'IN' ? t.admin.post.moneyIn : t.admin.post.moneyOut}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-base">
            {t.common.amount} ($)
          </Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-lg"
            aria-invalid={Boolean(errors.amount)}
            required
          />
          {errors.amount ? <p className="text-sm text-destructive">{errors.amount[0]}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidOn" className="text-base">
            {t.admin.post.paidOn}
          </Label>
          <Input
            id="paidOn"
            type="date"
            value={paidOn}
            max={today}
            onChange={(e) => setPaidOn(e.target.value)}
            className="h-12 text-lg"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo" className="text-base">
          {t.admin.post.memo}
          {direction === 'IN' ? <span className="text-muted-foreground"> ({t.common.optional})</span> : null}
        </Label>
        <Input
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={t.admin.post.memoPlaceholder}
          className="h-12 text-base"
          aria-invalid={Boolean(errors.memo)}
        />
        {errors.memo ? <p className="text-sm text-destructive">{t.admin.post.memoRequired}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-shimmer inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold text-primary-foreground disabled:opacity-60"
      >
        <PlusCircle className="h-5 w-5" aria-hidden />
        {pending ? t.common.loading : t.admin.post.submit}
      </button>
    </form>
  );
}
