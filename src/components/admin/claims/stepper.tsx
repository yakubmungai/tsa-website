import { Check } from 'lucide-react';
import type { PortalStrings } from '@/lib/translations-portal';
import { cn } from '@/lib/utils';

export type WorkflowStep = 'review' | 'approve' | 'announce' | 'collect' | 'pay' | 'close';
const ORDER: WorkflowStep[] = ['review', 'approve', 'announce', 'collect', 'pay', 'close'];

/** Which step a case is on, from its status. */
export function currentStep(status: string): WorkflowStep {
  switch (status) {
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 'review';
    case 'APPROVED':
      return 'announce';
    case 'COLLECTING':
      return 'collect';
    case 'VOLUNTARY':
    case 'PAID':
      return 'close';
    default:
      return 'close';
  }
}

/**
 * Kagua → Idhinisha → Tangaza → Kusanya → Lipa → Funga. Done steps are ticked,
 * the current one is highlighted, and a line under it says what the rule is.
 */
export function Stepper({ status, t }: { status: string; t: PortalStrings }) {
  const current = status === 'CLOSED' ? null : currentStep(status);
  const currentIndex = current ? ORDER.indexOf(current) : ORDER.length;
  return (
    <div className="space-y-3">
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ORDER.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 py-2 text-base font-semibold',
                active && 'border-primary bg-primary/10 text-foreground',
                done && 'border-success/40 bg-success/10 text-foreground',
                !active && !done && 'border-border/60 text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm',
                  done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              {t.adminClaims.steps[step]}
            </li>
          );
        })}
      </ol>
      {current ? <p className="text-base text-muted-foreground">{t.adminClaims.stepHelp[current]}</p> : null}
    </div>
  );
}
