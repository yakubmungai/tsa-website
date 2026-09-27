import { cn } from '@/lib/utils';

/**
 * The card used across the portal and admin: the public site's rounded,
 * softly bordered card, with an optional serif heading.
 */
export function SectionCard({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-border/60 bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
              {icon}
              {title}
            </h2>
            {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
    </section>
  );
}
