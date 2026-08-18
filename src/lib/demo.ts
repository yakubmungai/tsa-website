/**
 * Leaders' test environment.
 *
 * TSA's board needs to exercise the portal — balances, exports, posting money —
 * before it is opened to members. That has to happen against fake data, on a
 * separate database, with no way for it to bleed into the real site.
 *
 * This replaces the previous "Demo Member / Demo Admin" buttons, which shipped a
 * shared password inside the client bundle on what would have become the live
 * login page. Nothing here puts a credential in front of the browser: demo
 * sign-in names a persona, and the server resolves it.
 */

/**
 * Hosts that serve real members. DEMO_MODE is refused on these outright.
 *
 * The check is by hostname rather than NODE_ENV, because Vercel preview
 * deployments also run with NODE_ENV=production — so NODE_ENV cannot tell a
 * staging deployment apart from the real one.
 */
const PRODUCTION_HOSTS = ['tansha.org', 'www.tansha.org'];

function siteHost(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isProductionHost(): boolean {
  const host = siteHost();
  return host !== null && PRODUCTION_HOSTS.includes(host);
}

/**
 * Refuse to run demo features against the real site.
 *
 * Called at module load by everything demo-related, so a misconfigured
 * deployment fails immediately and loudly rather than quietly serving demo
 * sign-in buttons to members.
 */
export function assertDemoModeIsSafe(): void {
  if (process.env.DEMO_MODE !== 'true') return;
  if (isProductionHost()) {
    throw new Error(
      `DEMO_MODE is enabled on production host "${siteHost()}". ` +
        'Demo sign-in and demo data must never be reachable on the live site. ' +
        'Unset DEMO_MODE for this environment.'
    );
  }
}

/** True when demo sign-in, the test banner and demo data are enabled. */
export function isDemoMode(): boolean {
  assertDemoModeIsSafe();
  return process.env.DEMO_MODE === 'true';
}

/**
 * The personas leaders sign in as. Each maps to a seeded account.
 *
 * `email` is an identifier the server looks up — it is never a credential.
 * Demo users are seeded with no password hash at all, so the only way into one
 * is this provider, which does not exist unless DEMO_MODE is on.
 */
export const DEMO_PERSONAS = {
  admin: {
    email: 'demo.admin@tsa.test',
    labelEn: 'Administrator',
    labelSw: 'Msimamizi',
    descriptionEn: 'Full access: members, ledger, exports, forms queue',
    descriptionSw: 'Ruhusa kamili: wanachama, hesabu, ripoti, fomu',
    landing: '/admin/members',
  },
  member: {
    email: 'demo.member@tsa.test',
    labelEn: 'Member in good standing',
    labelSw: 'Mwanachama aliyetimiza',
    descriptionEn: 'Holds the full $125 — sees full benefit entitlement',
    descriptionSw: 'Ana $125 kamili — anaona mafao kamili',
    landing: '/portal',
  },
  arrears: {
    email: 'demo.arrears@tsa.test',
    labelEn: 'Member behind on contributions',
    labelSw: 'Mwanachama mwenye deni',
    descriptionEn: 'Owes money — sees the shortfall and catch-up view',
    descriptionSw: 'Ana deni — anaona upungufu wake',
    landing: '/portal',
  },
  helper: {
    email: 'demo.helper@tsa.test',
    labelEn: 'Member who helps a relative',
    labelSw: 'Mwanachama anayemsaidia ndugu',
    descriptionEn: 'For testing delegated access once it ships',
    descriptionSw: 'Kwa kujaribu msaidizi wa akaunti',
    landing: '/portal',
  },
} as const;

export type DemoPersona = keyof typeof DEMO_PERSONAS;

export function isDemoPersona(value: unknown): value is DemoPersona {
  return typeof value === 'string' && value in DEMO_PERSONAS;
}

/** Every seeded demo account, so the reset action knows what it owns. */
export const DEMO_ACCOUNT_EMAILS = Object.values(DEMO_PERSONAS).map((p) => p.email);

// Fail fast on a misconfigured deployment.
assertDemoModeIsSafe();
