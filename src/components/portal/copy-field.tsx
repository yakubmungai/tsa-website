'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalStrings } from './use-portal-strings';

/** A value to copy into another app — the Zelle number, a memo reference. */
export function CopyField({
  label,
  value,
  emphasis,
  className,
}: {
  label: React.ReactNode;
  value: string;
  /** Show the value large, for the memo reference members must type exactly. */
  emphasis?: boolean;
  className?: string;
}) {
  const t = usePortalStrings();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the value is on screen to copy by hand.
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p
          className={cn(
            'break-all font-semibold text-foreground',
            emphasis ? 'font-mono text-2xl tracking-wide' : 'text-lg'
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 text-base font-semibold text-foreground transition-colors hover:bg-muted"
      >
        {copied ? (
          <Check className="h-5 w-5 text-success" aria-hidden />
        ) : (
          <Copy className="h-5 w-5" aria-hidden />
        )}
        {copied ? t.common.copied : t.common.copy}
      </button>
    </div>
  );
}
