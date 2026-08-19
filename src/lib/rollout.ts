import 'server-only';

/**
 * Rollout switches for things that depend on data being trustworthy.
 *
 * The member roster has not yet been confirmed by TSA's leaders, and the
 * imported ledger did not reconcile with the treasurer's spreadsheet — $14,965
 * against $15,035, and 156 member rows against 154.
 *
 * Until that is settled, the portal shows members what has been recorded but
 * makes no claim about whether they are up to date. Telling roughly two thirds
 * of the membership they are short, on figures that may be wrong, would be
 * worse than saying nothing.
 */

/**
 * Whether to show compliance status: PAID/NOT PAID badges, shortfalls against
 * the $125 minimum, and benefit entitlement.
 *
 * Turn on by setting ROSTER_CONFIRMED=true once leaders have signed off the
 * roster and the opening balances reconcile.
 */
export function showComplianceStatus(): boolean {
  return process.env.ROSTER_CONFIRMED === 'true';
}
