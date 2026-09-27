'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CheckCheck, Landmark, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  assignBankRow,
  confirmAllMatched,
  confirmPayment,
  ignoreBankRow,
  rejectPayment,
} from '@/features/payments/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { MoneyAmount } from '@/components/portal/money';
import { EmptyState } from '@/components/portal/empty-state';
import { cn } from '@/lib/utils';

export interface QueuePayment {
  id: string;
  memberName: string;
  amountCents: number;
  method: string;
  paidOn: string;
  payerName: string | null;
  source: string;
  bankLine: { description: string; postedOn: string } | null;
}

export interface QueueBankRow {
  id: string;
  postedOn: string;
  amountCents: number;
  description: string;
  suggested: { id: string; names: string } | null;
}

export function PaymentQueue({
  matched,
  reported,
  unmatched,
  members,
}: {
  matched: QueuePayment[];
  reported: QueuePayment[];
  unmatched: QueueBankRow[];
  members: { id: string; names: string }[];
}) {
  const t = usePortalStrings();
  const router = useRouter();
  const [tab, setTab] = useState<'matched' | 'reported' | 'unmatched'>(
    matched.length ? 'matched' : unmatched.length ? 'unmatched' : 'reported'
  );
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: string }>, done?: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        if (done) toast.success(done);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const tabs = [
    { key: 'matched' as const, label: t.adminPayments.tabs.matched, n: matched.length },
    { key: 'reported' as const, label: t.adminPayments.tabs.reported, n: reported.length },
    { key: 'unmatched' as const, label: t.adminPayments.tabs.unmatched, n: unmatched.length },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-border/60 p-4" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className={cn(
              'inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-semibold',
              tab === x.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {x.label}
            <span className={cn('rounded-full px-2 text-sm', tab === x.key ? 'bg-primary-foreground/20' : 'bg-muted')}>{x.n}</span>
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {tab === 'matched' ? (
          matched.length === 0 ? (
            <EmptyState title={t.adminPayments.emptyMatched} />
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => confirmAllMatched({}), t.adminPayments.confirmedAll(matched.length))}
                className="btn-shimmer inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground"
              >
                <CheckCheck className="h-5 w-5" aria-hidden />
                {t.adminPayments.confirmAll} ({matched.length})
              </button>
              <ul className="divide-y divide-border/60">
                {matched.map((p) => (
                  <PaymentRow key={p.id} p={p} pending={pending} onConfirm={() => run(() => confirmPayment({ paymentId: p.id }))} />
                ))}
              </ul>
            </div>
          )
        ) : null}

        {tab === 'reported' ? (
          reported.length === 0 ? (
            <EmptyState title={t.adminPayments.emptyReported} />
          ) : (
            <ul className="divide-y divide-border/60">
              {reported.map((p) => (
                <PaymentRow
                  key={p.id}
                  p={p}
                  pending={pending}
                  onConfirm={() => run(() => confirmPayment({ paymentId: p.id }))}
                  onReject={(reason) => run(() => rejectPayment({ paymentId: p.id, reason }))}
                />
              ))}
            </ul>
          )
        ) : null}

        {tab === 'unmatched' ? (
          unmatched.length === 0 ? (
            <EmptyState title={t.adminPayments.emptyUnmatched} />
          ) : (
            <ul className="divide-y divide-border/60">
              {unmatched.map((row) => (
                <BankRow
                  key={row.id}
                  row={row}
                  members={members}
                  pending={pending}
                  onAssign={(memberId) => run(() => assignBankRow({ bankId: row.id, memberId }))}
                  onIgnore={(reason) => run(() => ignoreBankRow({ bankId: row.id, reason }))}
                />
              ))}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
}

function PaymentRow({
  p,
  pending,
  onConfirm,
  onReject,
}: {
  p: QueuePayment;
  pending: boolean;
  onConfirm: () => void;
  onReject?: (reason: string) => void;
}) {
  const t = usePortalStrings();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-semibold">{p.memberName}</p>
          <p className="text-base text-muted-foreground">
            {t.adminPayments.reportedBy(p.method, p.paidOn)}
            {p.payerName && p.payerName !== p.memberName ? ` · ${p.payerName}` : ''}
          </p>
          {p.bankLine ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              {p.bankLine.postedOn} · {p.bankLine.description}
            </p>
          ) : null}
        </div>
        <MoneyAmount cents={p.amountCents} className="text-xl font-bold" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="btn-shimmer inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-base font-bold text-primary-foreground"
        >
          <Check className="h-5 w-5" aria-hidden />
          {t.adminPayments.confirm}
        </button>
        {onReject ? (
          rejecting ? (
            <div className="flex flex-1 flex-wrap gap-2">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.adminPayments.rejectReason}
                className="h-12 min-w-48 flex-1 text-base"
              />
              <button
                type="button"
                disabled={pending || reason.trim().length < 3}
                onClick={() => onReject(reason)}
                className="min-h-12 rounded-xl bg-destructive px-4 text-base font-bold text-destructive-foreground disabled:opacity-50"
              >
                {t.adminPayments.reject}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-4 text-base font-semibold"
            >
              <X className="h-5 w-5" aria-hidden />
              {t.adminPayments.reject}
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

function BankRow({
  row,
  members,
  pending,
  onAssign,
  onIgnore,
}: {
  row: QueueBankRow;
  members: { id: string; names: string }[];
  pending: boolean;
  onAssign: (memberId: string) => void;
  onIgnore: (reason: string) => void;
}) {
  const t = usePortalStrings();
  const [query, setQuery] = useState('');
  const [ignoring, setIgnoring] = useState(false);
  const [reason, setReason] = useState('');
  const matches = query.trim()
    ? members.filter((m) => m.names.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
    : [];
  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">{row.description}</p>
          <p className="text-sm text-muted-foreground">
            {t.adminPayments.bankLine} · {row.postedOn}
          </p>
        </div>
        <MoneyAmount cents={row.amountCents} className="text-xl font-bold" />
      </div>
      {row.suggested ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => onAssign(row.suggested!.id)}
          className="btn-shimmer inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-base font-bold text-primary-foreground"
        >
          <Check className="h-5 w-5" aria-hidden />
          {t.adminPayments.assignTo(row.suggested.names)}
        </button>
      ) : null}
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-56 flex-1 space-y-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.adminPayments.assign}
            className="h-12 text-base"
          />
          {matches.length > 0 ? (
            <ul className="rounded-xl border border-border/60">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAssign(m.id)}
                    className="min-h-12 w-full px-3 text-left text-base hover:bg-muted"
                  >
                    {t.adminPayments.assignTo(m.names)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {ignoring ? (
          <div className="flex flex-wrap gap-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.adminPayments.ignoreReason} className="h-12 text-base" />
            <button
              type="button"
              disabled={pending || reason.trim().length < 3}
              onClick={() => onIgnore(reason)}
              className="min-h-12 rounded-xl border-2 border-border px-4 text-base font-semibold disabled:opacity-50"
            >
              {t.common.confirm}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIgnoring(true)}
            className="min-h-12 rounded-xl border-2 border-border px-4 text-base font-semibold text-muted-foreground"
          >
            {t.adminPayments.ignore}
          </button>
        )}
      </div>
    </li>
  );
}
