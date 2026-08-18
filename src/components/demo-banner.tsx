import { isDemoMode } from '@/lib/demo';
import { FlaskConical } from 'lucide-react';

/**
 * Persistent, non-dismissible marker that this is not the live site.
 *
 * Leaders will be looking at balances and member names that behave exactly like
 * the real thing. Nobody should ever have to wonder which site they are on, so
 * this cannot be closed and sits above everything else.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] w-full bg-amber-400 text-amber-950 border-b-2 border-amber-600"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center">
        <FlaskConical className="h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm font-bold sm:text-base">
          MFUMO WA MAJARIBIO — HII SI TAARIFA HALISI
          <span className="mx-2 font-normal opacity-70">|</span>
          TEST SYSTEM — NOT REAL DATA
        </p>
      </div>
    </div>
  );
}
