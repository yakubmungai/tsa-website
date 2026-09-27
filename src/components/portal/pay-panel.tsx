'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reportPayment, reportPaymentViaLink, startCardCheckout } from '@/features/payments/actions';
import { PAYMENT_CHANNELS } from '@/lib/finance/constants';
import { formatUSD } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CopyField } from './copy-field';
import { usePortalStrings } from './use-portal-strings';

type Method = 'ZELLE' | 'CASHAPP' | 'BANK_TRANSFER' | 'CHECK' | 'CASH';

/**
 * How to pay, in the order members actually use: Zelle first (free), then
 * CashApp, the bank details, and — only once switched on — card. Below it,
 * "Nimelipa": tell the Treasurer you sent it, instead of a screenshot in the
 * WhatsApp group.
 */
export function PayPanel({
  token,
  suggestedCents,
  reference,
  cardEnabled,
  today,
  defaultPayerName,
  cardJustPaid,
}: {
  /** Set on a pay link (no sign-in); absent in the portal. */
  token?: string;
  suggestedCents: number;
  reference: string | null;
  cardEnabled: boolean;
  today: string;
  defaultPayerName: string;
  cardJustPaid?: boolean;
}) {
  const t = usePortalStrings();
  const [amount, setAmount] = useState(suggestedCents > 0 ? (suggestedCents / 100).toFixed(2) : '');
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<Method>('ZELLE');
  const [payerName, setPayerName] = useState(defaultPayerName);
  const [toSavings, setToSavings] = useState(suggestedCents === 0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cardPending, startCard] = useTransition();

  const cashAppAmount = suggestedCents > 0 ? (suggestedCents / 100).toFixed(2) : '';
  const cashAppUrl = `https://cash.app/${PAYMENT_CHANNELS.cashAppTag}${cashAppAmount ? `/${cashAppAmount}` : ''}`;

  function submit() {
    setError(null);
    startTransition(async () => {
      const fields = { amount, paidOn, method, payerName, memo: reference ?? '', preference: toSavings ? 'ADVANCE' : 'AUTO' };
      const res = token ? await reportPaymentViaLink({ ...fields, token }) : await reportPayment(fields);
      if (res.success) setSent(true);
      else setError(res.fieldErrors?.amount?.[0] ?? res.error);
    });
  }

  function payByCard() {
    setError(null);
    startCard(async () => {
      const res = await startCardCheckout({ amount, preference: toSavings ? 'ADVANCE' : 'AUTO', token });
      if (res.success) window.location.href = res.data.url;
      else setError(res.error);
    });
  }

  if (sent || cardJustPaid) {
    return (
      <section className="space-y-4 rounded-3xl border-2 border-success/40 bg-success/10 p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden />
        <h2 className="font-serif text-3xl font-bold">{cardJustPaid ? t.pay.cardPaid : t.pay.sent}</h2>
        {!cardJustPaid ? <p className="text-lg">{t.pay.sentBody}</p> : null}
      </section>
    );
  }

  const methods: Method[] = ['ZELLE', 'CASHAPP', 'BANK_TRANSFER', 'CHECK', 'CASH'];

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-2xl font-bold">{t.pay.step1}</h2>

        <div className="space-y-3 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Smartphone className="h-5 w-5 text-primary" aria-hidden />
            {t.pay.zelleTitle}
          </p>
          <p className="text-base text-muted-foreground">{t.pay.zelleHelp}</p>
          <CopyField label={t.pay.zelleTo} value={PAYMENT_CHANNELS.zellePhone} />
          <p className="text-base">
            <span className="text-muted-foreground">{t.pay.zelleName}: </span>
            <span className="font-semibold">{PAYMENT_CHANNELS.zelleName}</span>
          </p>
          {reference ? (
            <>
              <CopyField label={t.pay.memoLabel} value={reference} emphasis />
              <p className="text-base text-muted-foreground">{t.pay.memoHelp}</p>
            </>
          ) : null}
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 p-4">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Wallet className="h-5 w-5 text-primary" aria-hidden />
            {t.pay.cashappTitle}
          </p>
          <a
            href={cashAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-primary text-lg font-bold text-primary hover:bg-primary/5"
          >
            {t.pay.cashappOpen(cashAppAmount ? formatUSD(suggestedCents) : PAYMENT_CHANNELS.cashAppTag)}
          </a>
        </div>

        <details className="rounded-2xl border border-border/70 p-4">
          <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-lg font-bold">
            <Landmark className="h-5 w-5 text-primary" aria-hidden />
            {t.pay.bankTitle}
          </summary>
          <div className="mt-3 space-y-3">
            <CopyField label={PAYMENT_CHANNELS.accountName} value={PAYMENT_CHANNELS.accountNumber} />
          </div>
        </details>

        {cardEnabled ? (
          <div className="space-y-3 rounded-2xl border border-border/70 p-4">
            <p className="flex items-center gap-2 text-lg font-bold">
              <CreditCard className="h-5 w-5 text-primary" aria-hidden />
              {t.pay.cardTitle}
            </p>
            <p className="text-base text-muted-foreground">{t.pay.cardHelp}</p>
            <button
              type="button"
              onClick={payByCard}
              disabled={cardPending || !(Number(amount) >= 1)}
              className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground disabled:opacity-50"
            >
              <CreditCard className="h-5 w-5" aria-hidden />
              {cardPending ? t.pay.cardOpening : t.pay.cardButton(amount ? `$${amount}` : '')}
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-5 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="font-serif text-2xl font-bold">{t.pay.step2}</h2>
          <p className="text-base text-muted-foreground">{t.pay.reportHelp}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payAmount" className="text-lg">
              {t.pay.amount}
            </Label>
            <Input id="payAmount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payDate" className="text-lg">
              {t.pay.paidOn}
            </Label>
            <Input id="payDate" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="h-14 text-lg" />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-lg font-semibold">{t.pay.method}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={cn(
                  'min-h-12 rounded-xl border-2 text-lg font-semibold',
                  method === m ? 'border-primary bg-primary/10' : 'border-border/70 text-muted-foreground'
                )}
              >
                {t.pay.methods[m]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="payerName" className="text-lg">
            {t.pay.payerName}
          </Label>
          <Input id="payerName" value={payerName} onChange={(e) => setPayerName(e.target.value)} className="h-14 text-lg" />
          <p className="text-base text-muted-foreground">{t.pay.payerNameHelp}</p>
        </div>
        <label className="flex min-h-12 items-start gap-3 rounded-2xl bg-muted/50 p-4 text-lg">
          <input
            type="checkbox"
            checked={toSavings}
            onChange={(e) => setToSavings(e.target.checked)}
            className="mt-1 h-6 w-6 accent-[hsl(var(--primary))]"
          />
          <span>
            {t.pay.toSavings}
            <span className="block text-base text-muted-foreground">{t.pay.toSavingsHelp}</span>
          </span>
        </label>
        {error ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-base text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !(Number(amount) > 0)}
          className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground disabled:opacity-50"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {pending ? t.common.loading : t.pay.submit}
        </button>
      </section>
    </div>
  );
}
