import { cn } from '@/lib/utils';
import type { Tone } from './status-badge';

const ICON_TONE: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-secondary/10 text-secondary',
  neutral: 'bg-primary/10 text-primary',
};

/** A single figure with its label and a one-line explanation. */
export function StatCard({
  label,
  value,
  help,
  icon,
  tone = 'neutral',
  badge,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  help?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-3xl border border-border/60 bg-card p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              ICON_TONE[tone]
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
      {badge ? <div className="mt-2">{badge}</div> : null}
      {help ? <p className="mt-2 text-base text-muted-foreground">{help}</p> : null}
    </div>
  );
}
