'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reverseLedgerEntry } from '@/features/finance/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';

/**
 * "Tengua" — undo an entry. Safe to use: it posts the opposite and keeps both,
 * so an officer who clicks the wrong thing can always put it right.
 */
export function ReverseEntryButton({ entryId, summary }: { entryId: string; summary: string }) {
  const t = usePortalStrings();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await reverseLedgerEntry({ entryId, reason });
      if (res.success) {
        toast.success(t.admin.reverse.done);
        setOpen(false);
        setReason('');
        router.refresh();
      } else {
        toast.error(res.fieldErrors?.reason?.[0] ?? res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
          {t.admin.reverse.button}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t.admin.reverse.title}</DialogTitle>
          <DialogDescription className="text-base">{t.admin.reverse.body}</DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-muted px-4 py-3 text-base font-medium">{summary}</p>
        <div className="space-y-2">
          <Label htmlFor={`reason-${entryId}`} className="text-base">
            {t.common.reason}
          </Label>
          <Input
            id={`reason-${entryId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.admin.reverse.reasonPlaceholder}
            className="h-12 text-base"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-12 rounded-xl border border-border px-5 text-base font-semibold"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || reason.trim().length < 3}
            className="min-h-12 rounded-xl bg-destructive px-5 text-base font-bold text-destructive-foreground disabled:opacity-50"
          >
            {pending ? t.common.loading : t.admin.reverse.submit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
