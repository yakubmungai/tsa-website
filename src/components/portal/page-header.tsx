import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Serif title and subtitle, matching the section headings on the public site. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-8 space-y-3', className)}>
      {back ? (
        <Link
          href={back.href}
          className="inline-flex min-h-12 items-center gap-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
            {title}
          </h1>
          {subtitle ? <p className="text-lg text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
