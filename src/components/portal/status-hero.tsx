import Link from 'next/link';
import { AlertCircle, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { HeroState } from '@/lib/finance/hero';
export type { HeroState };

const STYLES: Record<HeroState, { box: string; icon: React.ReactNode }> = {
  ok: {
    box: 'border-success/40 bg-success/10',
    icon: <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />,
  },
  owe: {
    box: 'border-warning/50 bg-warning/10',
    icon: <AlertTriangle className="h-10 w-10 text-warning" aria-hidden />,
  },
  low: {
    box: 'border-destructive/40 bg-destructive/10',
    icon: <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />,
  },
  neutral: {
    box: 'border-border/60 bg-card',
    icon: <Wallet className="h-10 w-10 text-primary" aria-hidden />,
  },
};

/**
 * The one answer at the top of the dashboard: am I all right, or what do I
 * need to do? Green, amber or red — always with a headline, an icon and a
 * sentence, so it reads the same to someone who cannot tell the colours apart.
 */
export function StatusHero({
  state,
  headline,
  body,
  detail,
  action,
}: {
  state: HeroState;
  headline: React.ReactNode;
  body?: React.ReactNode;
  detail?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  const style = STYLES[state];
  return (
    <section aria-live="polite" className={cn('rounded-3xl border-2 p-6 shadow-sm sm:p-8', style.box)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="mt-1 shrink-0">{style.icon}</span>
          <div className="space-y-1">
            <p className="font-serif text-2xl font-bold text-foreground sm:text-3xl">{headline}</p>
            {body ? <p className="text-lg text-foreground/80">{body}</p> : null}
            {detail ? <p className="text-base text-muted-foreground">{detail}</p> : null}
          </div>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="btn-shimmer inline-flex min-h-14 shrink-0 items-center justify-center rounded-2xl px-8 text-lg font-bold text-primary-foreground"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
