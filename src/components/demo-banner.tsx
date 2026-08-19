'use client';

import { useState } from 'react';
import { FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Marks this deployment as the test system.
 *
 * Anchored to the bottom of the viewport rather than the top: the navbar is
 * `fixed top-0`, so a banner up there covers the navigation, and pushing it
 * down would mean changing the top padding on every page.
 *
 * Collapsible, but never dismissible. Its whole job is to be present at the
 * moment nobody is thinking about which site they are on — and a leader who
 * dismissed it once would never see it again. Collapsed it is a small marker in
 * the corner; it does not disappear.
 */
export function DemoBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center print:hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`pointer-events-auto flex items-center gap-2 border-2 border-b-0 border-amber-600 bg-amber-400 text-amber-950 shadow-lg transition-all hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 ${
          expanded
            ? 'w-full max-w-3xl rounded-t-lg px-5 py-3'
            : 'rounded-t-md px-3 py-1.5'
        }`}
      >
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />

        {expanded ? (
          <span className="flex-1 text-left">
            <span className="block text-sm font-bold">
              MFUMO WA MAJARIBIO — HII SI TAARIFA HALISI
            </span>
            <span className="block text-sm font-medium opacity-80">
              Test system — not real data. Nothing here affects members.
            </span>
          </span>
        ) : (
          <span className="text-xs font-bold tracking-wide">
            MAJARIBIO · TEST
          </span>
        )}

        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  );
}
