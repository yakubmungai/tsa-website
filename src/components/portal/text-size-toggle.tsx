'use client';

import { useEffect, useState } from 'react';
import { usePortalStrings } from './use-portal-strings';

const KEY = 'tsa_text_size';

function readSaved(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'large';
  } catch {
    return false;
  }
}

/**
 * "Aa" — larger text, remembered on this device.
 *
 * Portal sizes are in rem, so a single attribute on <html> scales everything.
 */
export function TextSizeToggle() {
  const t = usePortalStrings();
  const [large, setLarge] = useState(false);

  // Apply the saved choice after hydration; the server cannot know it.
  useEffect(() => {
    if (!readSaved()) return;
    document.documentElement.dataset.textSize = 'large';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, which only exists on the client
    setLarge(true);
  }, []);

  function toggle() {
    const next = !large;
    setLarge(next);
    if (next) document.documentElement.dataset.textSize = 'large';
    else delete document.documentElement.dataset.textSize;
    try {
      window.localStorage.setItem(KEY, next ? 'large' : 'normal');
    } catch {
      // Private browsing: works for this visit only.
    }
  }

  const label = large ? t.common.textNormal : t.common.textLarger;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={large}
      title={label}
      className="inline-flex min-h-12 items-center gap-0.5 rounded-xl border border-border bg-card px-4 font-serif font-bold text-foreground transition-colors hover:bg-muted"
    >
      <span className="text-base" aria-hidden>
        A
      </span>
      <span className="text-2xl leading-none" aria-hidden>
        a
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
