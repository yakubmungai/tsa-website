import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE =
  'flex w-full min-h-16 items-center gap-4 rounded-2xl border-2 border-border/70 bg-card px-5 py-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

interface ChoiceContent {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}

function Content({ icon, title, description }: ChoiceContent) {
  return (
    <>
      {icon ? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
      ) : null}
      <span className="flex-1 space-y-0.5">
        <span className="block text-lg font-semibold text-foreground">{title}</span>
        {description ? (
          <span className="block text-base text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
}

/** A large, whole-row choice: one tap, hard to miss. */
export function ChoiceLink({ href, ...rest }: ChoiceContent & { href: string }) {
  return (
    <Link href={href} className={BASE}>
      <Content {...rest} />
    </Link>
  );
}

export function ChoiceButton({
  onClick,
  disabled,
  selected,
  ...rest
}: ChoiceContent & { onClick: () => void; disabled?: boolean; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(BASE, selected && 'border-primary bg-primary/10')}
    >
      <Content {...rest} />
    </button>
  );
}
