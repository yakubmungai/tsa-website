import { cn } from '@/lib/utils';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  success: 'border-success/30 bg-success/15 text-success',
  warning: 'border-warning/30 bg-warning/15 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-secondary/30 bg-secondary/15 text-secondary',
  neutral: 'border-border bg-muted text-muted-foreground',
};

/** A status pill. Always carries words (and usually an icon), never colour alone. */
export function StatusBadge({
  tone,
  icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
        TONES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
