/**
 * Which answer the dashboard leads with.
 *
 * - owe: there are announced contributions outstanding. Always shown — these
 *   come from cases recorded in the portal, so they are trustworthy even
 *   before the imported roster is confirmed.
 * - low / ok: whether the member holds the $125. Only claimed once
 *   ROSTER_CONFIRMED is on, because it rests on imported opening balances that
 *   have not yet been reconciled (see src/lib/rollout.ts).
 * - neutral: otherwise — the figures, without a verdict.
 */
export type HeroState = 'ok' | 'owe' | 'low' | 'neutral';

export function heroStateFor(input: {
  outstandingCents: number;
  shortfallCents: number;
  showCompliance: boolean;
}): HeroState {
  if (input.outstandingCents > 0) return 'owe';
  if (!input.showCompliance) return 'neutral';
  return input.shortfallCents > 0 ? 'low' : 'ok';
}
