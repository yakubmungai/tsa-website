import { Check, CheckCircle2, Circle, Clock, HandCoins, Megaphone, XCircle } from 'lucide-react';
import type { PortalStrings } from '@/lib/translations-portal';
import { cn } from '@/lib/utils';
import { StatusBadge, type Tone } from './status-badge';

export type ClaimStatusKey =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'COLLECTING'
  | 'PAID'
  | 'CLOSED'
  | 'REJECTED'
  | 'VOLUNTARY';

const TONE: Record<ClaimStatusKey, { tone: Tone; icon: React.ReactNode }> = {
  SUBMITTED: { tone: 'warning', icon: <Clock className="h-4 w-4" aria-hidden /> },
  UNDER_REVIEW: { tone: 'info', icon: <Clock className="h-4 w-4" aria-hidden /> },
  APPROVED: { tone: 'success', icon: <CheckCircle2 className="h-4 w-4" aria-hidden /> },
  COLLECTING: { tone: 'info', icon: <Megaphone className="h-4 w-4" aria-hidden /> },
  PAID: { tone: 'success', icon: <HandCoins className="h-4 w-4" aria-hidden /> },
  CLOSED: { tone: 'neutral', icon: <CheckCircle2 className="h-4 w-4" aria-hidden /> },
  REJECTED: { tone: 'danger', icon: <XCircle className="h-4 w-4" aria-hidden /> },
  VOLUNTARY: { tone: 'info', icon: <HandCoins className="h-4 w-4" aria-hidden /> },
};

export function ClaimStatusBadge({ status, t }: { status: ClaimStatusKey; t: PortalStrings }) {
  const s = TONE[status];
  return (
    <StatusBadge tone={s.tone} icon={s.icon}>
      {t.claims.status[status]}
    </StatusBadge>
  );
}

/** Where a case has got to, as a member would describe it. */
export function ClaimTimeline({
  status,
  dates,
  t,
  formatDate,
}: {
  status: ClaimStatusKey;
  dates: { reportedAt: Date; reviewStartedAt: Date | null; approvedAt: Date | null; announcedAt: Date | null; paidAt: Date | null };
  t: PortalStrings;
  formatDate: (d: Date) => string;
}) {
  if (status === 'REJECTED') return null;
  const steps: { label: string; at: Date | null; reached: boolean }[] = [
    { label: t.claims.timeline.filed, at: dates.reportedAt, reached: true },
    { label: t.claims.timeline.review, at: dates.reviewStartedAt, reached: status !== 'SUBMITTED' },
    { label: t.claims.timeline.approved, at: dates.approvedAt, reached: ['APPROVED', 'COLLECTING', 'PAID', 'CLOSED', 'VOLUNTARY'].includes(status) },
    { label: t.claims.timeline.announced, at: dates.announcedAt, reached: ['COLLECTING', 'PAID', 'CLOSED'].includes(status) || (status === 'VOLUNTARY') },
    { label: t.claims.timeline.paid, at: dates.paidAt, reached: ['PAID', 'CLOSED'].includes(status) },
  ];
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              s.reached ? 'bg-success text-success-foreground' : 'border-2 border-border text-muted-foreground'
            )}
          >
            {s.reached ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
          </span>
          <span className={cn('text-base', s.reached ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {s.label}
            {s.reached && s.at ? <span className="ml-2 font-normal text-muted-foreground">{formatDate(s.at)}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
