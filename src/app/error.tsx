'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, RotateCcw, Home } from 'lucide-react';

/**
 * Something failed while rendering a page.
 *
 * Gives a member a way forward rather than a blank screen — including the TSA
 * phone number, because for this membership a person to call is more useful
 * than any retry button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page error]', error.digest, error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Kuna hitilafu</h1>
        <p className="text-xl text-slate-600">Something went wrong</p>
      </div>

      <p className="max-w-md text-base leading-relaxed text-slate-600">
        Samahani, ukurasa huu haujafunguka. Jaribu tena, au tupigie simu.
        <span className="mt-1 block text-slate-500">
          Sorry, this page did not load. Try again, or call us.
        </span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={reset}
          className="h-12 gap-2 bg-emerald-600 px-6 text-base font-semibold text-white hover:bg-emerald-700"
        >
          <RotateCcw className="h-4 w-4" />
          Jaribu tena / Try again
        </Button>
        <Button asChild variant="outline" className="h-12 gap-2 px-6 text-base font-semibold">
          <a href="/">
            <Home className="h-4 w-4" />
            Nyumbani / Home
          </a>
        </Button>
      </div>

      <a
        href="tel:+12066020506"
        className="flex items-center gap-2 text-lg font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <Phone className="h-5 w-5" />
        (206) 602-0506
      </a>

      {error.digest ? (
        <p className="font-mono text-xs text-slate-400">Reference: {error.digest}</p>
      ) : null}
    </main>
  );
}
