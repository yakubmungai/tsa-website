'use client';

import { useActionState, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { uploadBankStatement } from '@/features/payments/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { cn } from '@/lib/utils';

/**
 * Drop the bank's CSV here. It is read on the server; only deposits are kept,
 * and a file uploaded twice counts nothing twice.
 */
export function BankUpload() {
  const t = usePortalStrings();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [state, action, pending] = useActionState(uploadBankStatement, null);

  function submitFile(files: FileList | null) {
    if (!files?.length || !inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(files[0]);
    inputRef.current.files = dt.files;
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          submitFile(e.dataTransfer.files);
        }}
        className={cn(
          'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
          dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60 hover:bg-muted/40'
        )}
      >
        <FileUp className="h-8 w-8 text-primary" aria-hidden />
        <span className="text-lg font-semibold">{pending ? t.adminPayments.uploading : t.adminPayments.upload}</span>
        <span className="max-w-md text-base text-muted-foreground">{t.adminPayments.uploadHelp}</span>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
      {state?.ok === false ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-base text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <div role="status" className="space-y-1 rounded-xl border border-success/40 bg-success/10 p-3 text-base">
          <p className="font-semibold">
            {t.adminPayments.summary(state.summary.matched, state.summary.suggested, state.summary.unmatched)}
          </p>
          {state.summary.duplicates > 0 ? <p>{t.adminPayments.duplicates(state.summary.duplicates)}</p> : null}
          {state.summary.errors.length > 0 ? <p>{t.adminPayments.unreadable(state.summary.errors.length)}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
