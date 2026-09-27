'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { recordMemberPayment } from '@/features/payments/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { cn } from '@/lib/utils';

type Method = 'ZELLE' | 'CASHAPP' | 'BANK_TRANSFER' | 'CHECK' | 'CASH';

/** Money in hand — cash at a meeting, a check: recorded and confirmed together. */
export function RecordPaymentForm({ members, today }: { members: { id: string; names: string }[]; today: string }) {
  const t = usePortalStrings();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [member, setMember] = useState<{ id: string; names: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<Method>('CASH');
  const [toSavings, setToSavings] = useState(false);

  const matches = query.trim()
    ? members.filter((m) => m.names.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  function submit() {
    if (!member) return;
    startTransition(async () => {
      const res = await recordMemberPayment({
        memberId: member.id,
        amount,
        paidOn,
        method,
        payerName: member.names,
        memo: '',
        preference: toSavings ? 'ADVANCE' : 'AUTO',
      });
      if (res.success) {
        toast.success(t.admin.post.posted);
        setAmount('');
        setMember(null);
        setQuery('');
        router.refresh();
      } else toast.error(res.fieldErrors?.amount?.[0] ?? res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base">{t.adminPayments.member}</Label>
        {member ? (
          <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-primary/10 px-4 py-3">
            <span className="text-lg font-semibold">{member.names}</span>
            <button type="button" onClick={() => setMember(null)} className="text-base font-semibold text-primary">
              {t.common.cancel}
            </button>
          </div>
        ) : (
          <>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.admin.members.search} className="h-12 text-base" />
            {matches.length > 0 ? (
              <ul className="rounded-xl border border-border/60">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setMember(m)} className="min-h-12 w-full px-3 text-left text-base hover:bg-muted">
                      {m.names}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="recAmount" className="text-base">
            {t.common.amount} ($)
          </Label>
          <Input id="recAmount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recOn" className="text-base">
            {t.admin.post.paidOn}
          </Label>
          <Input id="recOn" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="h-12 text-lg" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['CASH', 'CHECK', 'ZELLE'] as Method[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={method === m}
            onClick={() => setMethod(m)}
            className={cn('min-h-12 rounded-xl border-2 text-base font-semibold', method === m ? 'border-primary bg-primary/10' : 'border-border/70 text-muted-foreground')}
          >
            {t.pay.methods[m]}
          </button>
        ))}
      </div>
      <label className="flex min-h-12 items-center gap-3 text-base">
        <input type="checkbox" checked={toSavings} onChange={(e) => setToSavings(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
        {t.pay.toSavings}
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !member || !(Number(amount) > 0)}
        className="btn-shimmer min-h-12 w-full rounded-xl text-lg font-bold text-primary-foreground disabled:opacity-50"
      >
        {pending ? t.common.loading : t.admin.post.submit}
      </button>
    </div>
  );
}
