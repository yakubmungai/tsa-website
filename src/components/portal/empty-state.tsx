import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {icon ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {body ? <p className="max-w-md text-base text-muted-foreground">{body}</p> : null}
      {action}
    </div>
  );
}
