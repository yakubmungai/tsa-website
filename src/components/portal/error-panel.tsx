'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw, SearchX } from 'lucide-react';
import { PageShell } from './page-shell';
import { HelpButton } from './help-button';
import { usePortalStrings } from './use-portal-strings';

/**
 * What a member or officer sees when a portal or admin page fails, or does not
 * exist: what happened, a way back, and a person to contact — never a blank
 * screen. Rendered inside the section's layout, so the navbar stays.
 */
export function ErrorPanel({
  kind,
  home,
  retry,
  digest,
}: {
  kind: 'error' | 'notFound';
  home: '/portal' | '/admin';
  retry?: () => void;
  digest?: string;
}) {
  const t = usePortalStrings();
  const Icon = kind === 'error' ? AlertTriangle : SearchX;
  return (
    <PageShell width="narrow" belowNav={home === '/admin'}>
      <section className="space-y-6 rounded-3xl border border-border/60 bg-card p-6 text-center shadow-sm sm:p-10">
        <Icon className="mx-auto h-14 w-14 text-primary" aria-hidden />
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            {kind === 'error' ? t.errors.title : t.errors.notFoundTitle}
          </h1>
          <p className="text-lg text-muted-foreground">{kind === 'error' ? t.errors.body : t.errors.notFoundBody}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {retry ? (
            <button
              type="button"
              onClick={() => retry()}
              className="btn-shimmer inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-bold text-primary-foreground"
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
              {t.errors.retry}
            </button>
          ) : null}
          <Link
            href={home}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-primary px-6 text-lg font-bold text-primary hover:bg-primary/5"
          >
            {home === '/admin' ? t.errors.toAdmin : t.errors.toPortal}
          </Link>
        </div>
        <div className="flex justify-center">
          <HelpButton context={digest ? t.errors.reference(digest) : undefined} />
        </div>
        {digest ? <p className="text-sm text-muted-foreground">{t.errors.reference(digest)}</p> : null}
      </section>
    </PageShell>
  );
}
