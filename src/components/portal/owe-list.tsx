import { AlertTriangle, CalendarClock, CheckCircle2, Wallet } from 'lucide-react';
import type { PortalStrings } from '@/lib/translations-portal';
import { formatUSD } from '@/lib/money';
import { MoneyAmount } from './money';
import { StatusBadge } from './status-badge';
import { EmptyState } from './empty-state';

export interface OweItem {
  id: string;
  reference: string;
  subjectName: string;
  amountCents: number;
  outstandingCents: number;
  fromAdvanceCents: number;
  dueAt: Date;
  state: 'UPCOMING' | 'OPEN' | 'OVERDUE' | 'PAID' | 'EXCUSED';
}

/** "Ninadaiwa" — each announced contribution, what is left, and by when. */
export function OweList({
  items,
  t,
  formatDate,
}: {
  items: OweItem[];
  t: PortalStrings;
  formatDate: (d: Date) => string;
}) {
  if (items.length === 0) {
    return <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-success" />} title={t.owe.empty} />;
  }
  return (
    <ul className="divide-y divide-border/60">
      {items.map((i) => (
        <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-semibold">{t.owe.forCase(i.subjectName)}</p>
            <p className="text-base text-muted-foreground">{i.reference}</p>
            {i.state === 'UPCOMING' ? (
              <p className="flex items-center gap-2 text-base text-muted-foreground">
                <CalendarClock className="h-4 w-4" aria-hidden />
                {t.owe.upcoming(formatDate(i.dueAt))}
              </p>
            ) : i.state === 'OPEN' ? (
              <p className="text-base">{t.owe.due(formatDate(i.dueAt))}</p>
            ) : null}
            {i.fromAdvanceCents > 0 ? (
              <p className="flex items-center gap-2 text-base text-muted-foreground">
                <Wallet className="h-4 w-4" aria-hidden />
                {t.owe.fromAdvance(formatUSD(i.fromAdvanceCents))}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <MoneyAmount
              cents={i.state === 'PAID' ? i.amountCents : i.outstandingCents}
              className="text-xl font-bold"
            />
            {i.state === 'OVERDUE' ? (
              <StatusBadge tone="danger" icon={<AlertTriangle className="h-4 w-4" aria-hidden />}>
                {t.owe.overdue}
              </StatusBadge>
            ) : i.state === 'PAID' ? (
              <StatusBadge tone="success" icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}>
                {t.owe.paid}
              </StatusBadge>
            ) : i.state === 'EXCUSED' ? (
              <StatusBadge tone="neutral">{t.owe.excused}</StatusBadge>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
