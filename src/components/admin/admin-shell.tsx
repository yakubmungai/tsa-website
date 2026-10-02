import { PageShell } from '@/components/portal/page-shell';

export type AdminSection = 'today' | 'claims' | 'payments' | 'members' | 'forms' | 'broadcast' | 'demo';

/**
 * An officer page's content area, under the tabs that src/app/admin/layout.tsx
 * draws. `active` is kept for readability at the call site; the tabs work out
 * the active one from the URL.
 */
export function AdminShell({ children }: { active?: AdminSection; children: React.ReactNode }) {
  return <PageShell belowNav>{children}</PageShell>;
}
