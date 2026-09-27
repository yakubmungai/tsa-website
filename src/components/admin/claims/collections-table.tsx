'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, BadgeCheck, CircleDollarSign, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { excuseShare, recordSharePayment } from '@/features/claims/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { MoneyAmount } from '@/components/portal/money';
import { StatusBadge, type Tone } from '@/components/portal/status-badge';
import { cn } from '@/lib/utils';
import { WhatsAppButton, withPayLink } from './whatsapp-button';

export interface CollectionRow {
  id: string;
  memberId: string;
  names: string;
  phoneE164: string | null;
  amountCents: number;
  outstandingCents: number;
  fromAdvanceCents: number;
  state: 'UPCOMING' | 'OPEN' | 'OVERDUE' | 'PAID' | 'EXCUSED';
  excuseNote: string | null;
  reminder: string;
}

const TONE: Record<CollectionRow['state'], Tone> = {
  UPCOMING: 'neutral',
  OPEN: 'warning',
  OVERDUE: 'danger',
  PAID: 'success',
  EXCUSED: 'neutral',
};

/** Kusanya — who has paid, who has not, and one tap to remind or record. */
export function CollectionsTable({ rows, today, demo }: { rows: CollectionRow[]; today: string; demo: boolean }) {
  const t = usePortalStrings();
  const [query, setQuery] = useState('');
  const [onlyOwing, setOnlyOwing] = useState(true);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!onlyOwing || r.outstandingCents > 0) &&
          (!query.trim() || r.names.toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [rows, query, onlyOwing]
  );
  const owing = rows.filter((r) => r.outstandingCents > 0 && r.state !== 'EXCUSED' && r.state !== 'UPCOMING');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.admin.members.search}
            className="h-12 rounded-xl pl-12 text-base"
          />
        </div>
        <button
          type="button"
          aria-pressed={onlyOwing}
          onClick={() => setOnlyOwing((v) => !v)}
          className={cn(
            'min-h-12 rounded-xl border-2 px-4 text-base font-semibold',
            onlyOwing ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground'
          )}
        >
          {t.adminClaims.outstanding}
        </button>
        {owing.length > 0 ? <RemindAll rows={owing} demo={demo} /> : null}
      </div>

      <ul className="divide-y divide-border/60 rounded-2xl border border-border/60">
        {visible.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{r.names}</p>
              <p className="text-sm text-muted-foreground">
                <MoneyAmount cents={r.amountCents} />
                {r.fromAdvanceCents > 0 ? (
                  <>
                    {' · '}
                    {t.adminClaims.fromAdvance} <MoneyAmount cents={r.fromAdvanceCents} />
                  </>
                ) : null}
                {r.excuseNote ? ` · ${r.excuseNote}` : ''}
              </p>
            </div>
            <StatusBadge tone={TONE[r.state]}>{t.adminClaims.shareStates[r.state]}</StatusBadge>
            {r.outstandingCents > 0 ? (
              <span className="w-20 text-right text-base font-bold">
                <MoneyAmount cents={r.outstandingCents} />
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {r.outstandingCents > 0 && r.state !== 'UPCOMING' ? (
                <>
                  <RecordPaymentDialog row={r} today={today} />
                  <WhatsAppButton message={r.reminder} phoneE164={r.phoneE164} label={t.adminClaims.remind} demo={demo} payLinkFor={r.memberId} />
                </>
              ) : null}
              {r.state === 'OVERDUE' || r.state === 'EXCUSED' ? <ExcuseDialog row={r} /> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecordPaymentDialog({ row, today }: { row: CollectionRow; today: string }) {
  const t = usePortalStrings();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((row.outstandingCents / 100).toFixed(2));
  const [paidOn, setPaidOn] = useState(today);
  const [memo, setMemo] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await recordSharePayment({ assessmentId: row.id, amount, paidOn, memo });
      if (res.success) {
        toast.success(t.admin.post.posted);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.fieldErrors?.amount?.[0] ?? res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
        >
          <CircleDollarSign className="h-4 w-4" aria-hidden />
          {t.adminClaims.recordPayment}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t.adminClaims.recordPayment}</DialogTitle>
          <DialogDescription className="text-base">{row.names}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`amt-${row.id}`} className="text-base">
              {t.common.amount} ($)
            </Label>
            <Input id={`amt-${row.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`on-${row.id}`} className="text-base">
              {t.admin.post.paidOn}
            </Label>
            <Input id={`on-${row.id}`} type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`memo-${row.id}`} className="text-base">
              {t.admin.post.memo}
            </Label>
            <Input id={`memo-${row.id}`} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t.admin.post.memoPlaceholder} className="h-12 text-base" />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="btn-shimmer min-h-12 w-full rounded-xl text-lg font-bold text-primary-foreground disabled:opacity-50"
          >
            {pending ? t.common.loading : t.admin.post.submit}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExcuseDialog({ row }: { row: CollectionRow }) {
  const t = usePortalStrings();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const excused = row.state === 'EXCUSED';

  function submit() {
    startTransition(async () => {
      const res = await excuseShare({ assessmentId: row.id, note: excused ? null : note });
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.fieldErrors?.note?.[0] ?? res.error);
      }
    });
  }

  if (excused) {
    return (
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
      >
        {t.adminClaims.unexcuse}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
        >
          <BadgeCheck className="h-4 w-4" aria-hidden />
          {t.adminClaims.excuse}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t.adminClaims.excuse}</DialogTitle>
          <DialogDescription className="text-base">{row.names}</DialogDescription>
        </DialogHeader>
        <Label htmlFor={`ex-${row.id}`} className="text-base">
          {t.adminClaims.excuseNote}
        </Label>
        <Input id={`ex-${row.id}`} value={note} onChange={(e) => setNote(e.target.value)} className="h-12 text-base" />
        <button
          type="button"
          onClick={submit}
          disabled={pending || note.trim().length < 3}
          className="btn-shimmer min-h-12 w-full rounded-xl text-lg font-bold text-primary-foreground disabled:opacity-50"
        >
          {t.adminClaims.excuse}
        </button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Kumbusha wote" — steps through everyone who owes, one personal WhatsApp at
 * a time. Free: it uses the officer's own WhatsApp, no messaging service.
 */
function RemindAll({ rows, demo }: { rows: CollectionRow[]; demo: boolean }) {
  const t = usePortalStrings();
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const row = rows[Math.min(i, rows.length - 1)];
  const url = row.phoneE164 ? `https://wa.me/${row.phoneE164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}` : null;

  // Each member's message gets their own pay link as it comes up.
  async function show(n: number) {
    setI(n);
    setText('…');
    setText(await withPayLink(rows[n].reminder, rows[n].memberId));
  }

  return (
    <Dialog onOpenChange={(o) => o && show(0)}>
      <DialogTrigger asChild>
        <button type="button" className="btn-shimmer min-h-12 rounded-xl px-4 text-base font-bold text-primary-foreground">
          {t.adminClaims.remindAll} ({rows.length})
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{row.names}</DialogTitle>
          <DialogDescription className="text-base">{t.adminClaims.remindingOf(i + 1, rows.length)}</DialogDescription>
        </DialogHeader>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 font-sans text-base">{text}</pre>
        {!demo && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (i < rows.length - 1) void show(i + 1);
            }}
            className="btn-shimmer inline-flex min-h-12 items-center justify-center rounded-xl text-lg font-bold text-primary-foreground"
          >
            {t.adminClaims.openWhatsapp}
          </a>
        ) : null}
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => void show(Math.max(0, i - 1))}
            disabled={i === 0}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-4 text-base font-semibold disabled:opacity-40"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            {t.common.back}
          </button>
          <button
            type="button"
            onClick={() => void show(Math.min(rows.length - 1, i + 1))}
            disabled={i >= rows.length - 1}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-4 text-base font-semibold disabled:opacity-40"
          >
            {t.common.next}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
