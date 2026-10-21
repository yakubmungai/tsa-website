'use client';

import { useEffect } from 'react';

/**
 * Last resort: the root layout itself failed, so there is no navbar, theme or
 * language provider to lean on. Plain, bilingual, with inline styles, and the
 * TSA phone number — a person to call beats any button.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[global error]', error.digest, error);
  }, [error]);

  return (
    <html lang="sw">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9f8f6',
          color: '#22262b',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <main style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 30, margin: '0 0 4px' }}>Kuna hitilafu</h1>
          <p style={{ fontSize: 20, margin: '0 0 20px', color: '#5b6470' }}>Something went wrong</p>
          <p style={{ fontSize: 17, lineHeight: 1.6, margin: '0 0 24px' }}>
            Samahani, tovuti haijafunguka. Jaribu tena, au tupigie simu.
            <br />
            <span style={{ color: '#5b6470' }}>Sorry, the site did not load. Try again, or call us.</span>
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 52,
              padding: '0 28px',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              background: '#2e9e48',
              border: 0,
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            Jaribu tena / Try again
          </button>
          <p style={{ marginTop: 24, fontSize: 18 }}>
            <a href="tel:+12066020506" style={{ color: '#2e9e48', fontWeight: 700 }}>
              (206) 602-0506
            </a>
          </p>
          {error.digest ? <p style={{ fontSize: 13, color: '#5b6470' }}>Ref: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
