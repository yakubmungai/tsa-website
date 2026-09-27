import { ArrowDownRight, ArrowUpRight, Undo2 } from 'lucide-react';
import type { PortalStrings } from '@/lib/translations-portal';
import { MoneyAmount } from './money';
import { StatusBadge } from './status-badge';
import { EmptyState } from './empty-state';
import { History } from 'lucide-react';

export interface HistoryEntry {
  id: string;
  account: string;
  entryKind: string;
  amountCents: number;
  description: string;
  descriptionSw: string | null;
  occurredAt: Date;
  voidedAt: Date | null;
}

/**
 * A member's account history, newest first.
 *
 * Corrections stay visible: a reversed entry is struck through with a
 * "corrected" badge, and the reversal itself is listed — the history a member
 * is entitled to inspect under Art 6.1 is the whole history.
 */
export function LedgerHistory({
  entries,
  t,
  locale,
  renderAction,
}: {
  entries: HistoryEntry[];
  t: PortalStrings;
  locale: 'sw' | 'en';
  renderAction?: (entry: HistoryEntry) => React.ReactNode;
}) {
  if (entries.length === 0) {
    return <EmptyState icon={<History className="h-6 w-6" />} title={t.dashboard.historyEmpty} />;
  }
  const dateFmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });

  return (
    <ul className="divide-y divide-border/60">
      {entries.map((e) => {
        const isReversal = e.entryKind === 'REVERSAL';
        const reversed = e.voidedAt !== null && !isReversal;
        const label = t.accounts[e.account as keyof PortalStrings['accounts']] ?? e.account;
        const text = (locale === 'sw' ? e.descriptionSw : null) ?? e.description;
        const credit = e.amountCents >= 0;
        return (
          <li key={e.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-foreground">{label}</p>
              {text && text !== label ? (
                <p className="break-words text-base text-muted-foreground">{text}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{dateFmt.format(e.occurredAt)}</span>
                {reversed ? (
                  <StatusBadge tone="neutral" icon={<Undo2 className="h-3.5 w-3.5" aria-hidden />}>
                    {t.dashboard.reversed}
                  </StatusBadge>
                ) : null}
                {isReversal ? <StatusBadge tone="neutral">{t.dashboard.correction}</StatusBadge> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={
                  reversed || isReversal
                    ? 'text-lg font-bold text-muted-foreground line-through'
                    : credit
                      ? 'flex items-center text-lg font-bold text-success'
                      : 'flex items-center text-lg font-bold text-foreground'
                }
              >
                {!reversed && !isReversal ? (
                  credit ? (
                    <ArrowUpRight className="mr-0.5 h-5 w-5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="mr-0.5 h-5 w-5" aria-hidden />
                  )
                ) : null}
                <MoneyAmount cents={e.amountCents} sign="always" />
              </span>
              {renderAction && !reversed && !isReversal ? renderAction(e) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
