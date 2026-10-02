import { cn } from '@/lib/utils';

/**
 * The content area of a portal or admin page. The navbar and footer come from
 * the section's layout (SiteFrame), so they stay put while pages change.
 *
 * `belowNav` is for pages under the admin tabs, which already clear the fixed
 * navbar.
 */
export function PageShell({
  children,
  width = 'wide',
  belowNav = false,
  className,
}: {
  children: React.ReactNode;
  width?: 'narrow' | 'wide';
  belowNav?: boolean;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'mx-auto w-full flex-grow px-4 pb-16 sm:px-6',
        belowNav ? 'pt-2' : 'pt-28',
        width === 'narrow' ? 'max-w-2xl' : 'max-w-6xl',
        className
      )}
    >
      {children}
    </main>
  );
}

/** A pulsing block, for loading skeletons. */
function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-3xl bg-muted', className)} />;
}

/**
 * Shown the instant a link is tapped, while the page's data loads — so a tap
 * always does something visible, even on a slow connection.
 */
export function PageSkeleton({ belowNav = false }: { belowNav?: boolean }) {
  return (
    <PageShell belowNav={belowNav}>
      <div role="status" aria-label="Inapakia… / Loading…" className="space-y-8">
        <div className="space-y-3">
          <Bone className="h-4 w-40 rounded-full" />
          <Bone className="h-10 w-72 max-w-full rounded-2xl" />
          <Bone className="h-5 w-96 max-w-full rounded-full" />
        </div>
        <Bone className="h-28" />
        <div className="grid gap-4 md:grid-cols-3">
          <Bone className="h-36" />
          <Bone className="h-36" />
          <Bone className="h-36" />
        </div>
        <Bone className="h-64" />
      </div>
    </PageShell>
  );
}
