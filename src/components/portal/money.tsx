import { formatUSD } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * An amount of money. The single place cents become "$1,234.56".
 *
 * Tabular figures, so columns of amounts line up.
 */
export function MoneyAmount({
  cents,
  sign,
  className,
}: {
  cents: number;
  /** "always" shows + on credits, for history rows. */
  sign?: 'auto' | 'always';
  className?: string;
}) {
  const text = formatUSD(cents, { sign }).replace(/^-/, '−');
  return <span className={cn('tabular-nums', className)}>{text}</span>;
}
