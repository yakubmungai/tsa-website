'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarClock, ChevronDown, ChevronUp, FlaskConical, MessageSquarePlus } from 'lucide-react';
import { submitDemoFeedback } from '@/features/demo/tools';
import { usePortalStrings } from '@/components/portal/use-portal-strings';

/**
 * Marks this deployment as the test system, and collects testers' notes.
 *
 * A small pill in the bottom-left corner, clear of the page's buttons.
 * Collapsible but never dismissible: its job is to be present at the moment
 * nobody is thinking about which site they are on. Opened, it says so in both
 * languages, shows the test date when the time machine has moved it, and
 * takes a note ("Toa maoni") that lands on the demo page with the page and
 * sign-in it came from.
 */
export function DemoBanner({ testDate }: { testDate: string | null }) {
  const t = usePortalStrings().demo.banner;
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  function send() {
    startTransition(async () => {
      const res = await submitDemoFeedback({ page: pathname, comment });
      if (res.success) {
        setSent(true);
        setComment('');
      }
    });
  }

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[60] max-w-[calc(100vw-1.5rem)] print:hidden">
      {expanded ? (
        <div className="pointer-events-auto w-[22rem] max-w-full space-y-3 rounded-2xl border-2 border-accent bg-card p-4 shadow-xl">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-expanded
            className="flex w-full items-start justify-between gap-2 text-left"
          >
            <span className="flex items-start gap-2">
              <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" aria-hidden />
              <span>
                <span className="block text-sm font-bold">{t.title}</span>
                <span className="block text-sm text-muted-foreground">{t.body}</span>
              </span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />
          </button>
          {testDate ? (
            <p className="flex items-center gap-2 rounded-xl bg-accent/30 px-3 py-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" aria-hidden />
              {t.testDate(testDate)}
            </p>
          ) : null}
          {sent ? (
            <p className="rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
              {t.thanks}
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor="demo-feedback" className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquarePlus className="h-4 w-4" aria-hidden />
                {t.feedbackLabel}
              </label>
              <textarea
                id="demo-feedback"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.placeholder}
                className="min-h-20 w-full rounded-xl border border-input bg-background p-2 text-sm"
              />
              <button
                type="button"
                onClick={send}
                disabled={pending || comment.trim().length < 3}
                className="btn-shimmer min-h-10 w-full rounded-xl text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {pending ? '…' : t.send}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            setSent(false);
          }}
          aria-expanded={false}
          className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-accent-foreground/20 bg-accent px-3 py-1.5 text-xs font-bold tracking-wide text-accent-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FlaskConical className="h-4 w-4" aria-hidden />
          {t.pill}
          {testDate ? <span className="font-semibold">· {testDate}</span> : null}
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
