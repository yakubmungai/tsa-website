'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePortalStrings } from './use-portal-strings';
import { HelpButton } from './help-button';

/**
 * One question per screen. Shows where the member is ("Hatua 2 kati ya 5"),
 * with big Back / Continue buttons and help on every step, so nobody is ever
 * stuck on a screen with no way forward.
 */
export function WizardShell({
  step,
  total,
  title,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  busy,
  helpContext,
}: {
  step: number;
  total: number;
  title: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  helpContext?: string;
}) {
  const t = usePortalStrings();
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-8">
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-primary">{t.claims.stepOf(step, total)}</p>
          <HelpButton context={helpContext} />
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>

      <div className="space-y-5">{children}</div>

      {onBack || onNext ? (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-border px-6 text-lg font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
              {t.common.back}
            </button>
          ) : (
            <span />
          )}
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || busy}
              className="btn-shimmer inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-8 text-lg font-bold text-primary-foreground disabled:opacity-50"
            >
              {nextLabel ?? t.common.next}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
