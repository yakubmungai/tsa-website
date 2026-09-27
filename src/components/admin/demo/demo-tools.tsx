'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Clock, FastForward, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveDemoFeedback, setDemoClock, simulateZelleDeposit } from '@/features/demo/tools';
import { cn } from '@/lib/utils';

/** "Songa mbele" — the time machine. */
export function DemoClock({ testDate, moved }: { testDate: string; moved: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function go(addDays: number | null) {
    startTransition(async () => {
      const res = await setDemoClock({ addDays });
      if (res.success) {
        toast.success(`Tarehe ya majaribio / Test date: ${res.data.today}`);
        router.refresh();
      } else toast.error(res.error);
    });
  }
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-lg">
        <Clock className="h-5 w-5 text-primary" aria-hidden />
        <span>
          Leo kwenye majaribio / Test date: <strong>{testDate}</strong>
          {moved ? <span className="ml-2 text-muted-foreground">(imesogezwa / moved)</span> : null}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {[1, 7, 15].map((d) => (
          <button
            key={d}
            type="button"
            disabled={pending}
            onClick={() => go(d)}
            className="btn-shimmer inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            <FastForward className="h-5 w-5" aria-hidden />
            Songa mbele siku {d} / +{d} days
          </button>
        ))}
        {moved ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => go(null)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-4 text-base font-semibold"
          >
            <RotateCcw className="h-5 w-5" aria-hidden />
            Rudi leo / Back to today
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** "Simulate a Zelle deposit" — it appears on Malipo for the Treasurer to match. */
export function SimulateDeposit({ members }: { members: { id: string; names: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [amount, setAmount] = useState('20.00');
  const [withReference, setWithReference] = useState(true);
  function submit() {
    startTransition(async () => {
      const res = await simulateZelleDeposit({ memberId, amount, withReference });
      if (res.success) {
        toast.success('Imeingia benki — angalia Malipo / Deposit added — see Payments');
        router.refresh();
      } else toast.error(res.error);
    });
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="simMember" className="text-base">
            Mwanachama / Member
          </Label>
          <select
            id="simMember"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.names}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="simAmount" className="text-base">
            Kiasi / Amount ($)
          </Label>
          <Input id="simAmount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg" />
        </div>
      </div>
      <label className="flex min-h-12 items-center gap-3 text-base">
        <input type="checkbox" checked={withReference} onChange={(e) => setWithReference(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
        Aliandika TSA-namba kwenye memo / Wrote their TSA reference in the memo
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !memberId}
        className="btn-shimmer min-h-12 w-full rounded-xl text-base font-bold text-primary-foreground disabled:opacity-50"
      >
        Tuma Zelle ya majaribio / Simulate a Zelle deposit
      </button>
    </div>
  );
}

export interface Scenario {
  id: string;
  sw: string;
  en: string;
  signInAs: string;
  steps: string[];
  expect: string;
}

/** The guided scenarios, with a tick per scenario remembered on this device. */
export function ScenarioChecklist({ scenarios }: { scenarios: Scenario[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('tsa_demo_scenarios');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, client only
      if (saved) setDone(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);
  function toggle(id: string) {
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      try {
        window.localStorage.setItem('tsa_demo_scenarios', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }
  const count = scenarios.filter((s) => done[s.id]).length;
  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-muted-foreground">
        {count} / {scenarios.length} zimekamilika / completed
      </p>
      <ol className="space-y-4">
        {scenarios.map((s, i) => (
          <li key={s.id} className={cn('rounded-2xl border-2 p-4', done[s.id] ? 'border-success/40 bg-success/5' : 'border-border/60')}>
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={Boolean(done[s.id])}
                onClick={() => toggle(s.id)}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold',
                  done[s.id] ? 'border-success bg-success text-success-foreground' : 'border-border'
                )}
              >
                {done[s.id] ? <Check className="h-5 w-5" aria-hidden /> : i + 1}
              </button>
              <div className="min-w-0 space-y-2 break-words">
                <p className="text-lg font-semibold">
                  {s.sw}
                  <span className="block text-base font-normal text-muted-foreground">{s.en}</span>
                </p>
                <p className="text-base">
                  <span className="font-semibold">Ingia kama / Sign in as:</span> {s.signInAs}
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-base">
                  {s.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="rounded-xl bg-muted/60 p-3 text-base">
                  <span className="font-semibold">Unapaswa kuona / You should see:</span> {s.expect}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ResolveFeedback({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await resolveDemoFeedback({ id });
          router.refresh();
        })
      }
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
    >
      <Check className="h-4 w-4" aria-hidden />
      Imeshughulikiwa / Done
    </button>
  );
}
