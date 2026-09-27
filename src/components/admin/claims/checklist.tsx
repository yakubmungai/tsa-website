'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { setClaimChecklistItem } from '@/features/claims/admin-actions';
import { cn } from '@/lib/utils';

/**
 * Tick-boxes stored on the case: documents seen (Art 4.3) or the conditions
 * met before paying (Art 18.9). Each tick is saved and audited at once.
 */
export function ClaimChecklist({
  claimId,
  field,
  items,
  values,
  disabled,
}: {
  claimId: string;
  field: 'documentsChecklist' | 'payoutConditions';
  items: { key: string; label: string }[];
  values: Record<string, boolean>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(values, (state, change: { key: string; checked: boolean }) => ({
    ...state,
    [change.key]: change.checked,
  }));

  function toggle(key: string) {
    const checked = !optimistic[key];
    startTransition(async () => {
      setOptimistic({ key, checked });
      const res = await setClaimChecklistItem({ claimId, field, key, checked });
      if (!res.success) toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <ul className="grid gap-2">
      {items.map((item) => {
        const on = Boolean(optimistic[item.key]);
        return (
          <li key={item.key}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={disabled}
              onClick={() => toggle(item.key)}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-4 py-2 text-left text-base font-medium transition-colors disabled:opacity-60',
                on ? 'border-success/50 bg-success/10' : 'border-border/70 hover:border-primary/50'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
                  on ? 'border-success bg-success text-success-foreground' : 'border-border'
                )}
              >
                {on ? <Check className="h-4 w-4" aria-hidden /> : null}
              </span>
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
