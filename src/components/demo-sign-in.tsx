'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ShieldCheck, UserCheck, AlertTriangle, HeartHandshake, User } from 'lucide-react';

/**
 * One-tap sign-in for the leaders' test environment.
 *
 * Only the persona key crosses the wire. There is no password here and none in
 * the bundle: seeded demo accounts have `passwordHash: null`, and the `demo`
 * auth provider that resolves a persona is not registered unless DEMO_MODE is
 * on — which is refused outright on the production hostname.
 *
 * The persona list arrives as props rather than being imported, so the account
 * identifiers are not baked into the client chunk that ships to production.
 */

export interface DemoPersonaOption {
  key: string;
  labelEn: string;
  labelSw: string;
  descriptionEn: string;
  landing: string;
}

const ICONS: Record<string, typeof ShieldCheck> = {
  admin: ShieldCheck,
  member: UserCheck,
  arrears: AlertTriangle,
  helper: HeartHandshake,
};

export function DemoSignIn({ personas }: { personas: DemoPersonaOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const handleSignIn = async (persona: DemoPersonaOption) => {
    setPending(persona.key);
    try {
      const res = await signIn('demo', { persona: persona.key, redirect: false });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      router.push(persona.landing);
      router.refresh();
    } catch {
      toast.error('Demo sign-in failed.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-bold text-amber-900">Ingia kwa majaribio / Test sign-in</p>
        <p className="mt-1 text-sm text-amber-800">
          Chagua aina ya mtumiaji ili kujaribu mfumo. Taarifa zote ni za kubuni.
        </p>
        <p className="mt-0.5 text-sm text-amber-800/80">
          Choose a role to explore the system. All data is invented.
        </p>
      </div>

      <div className="grid gap-2">
        {personas.map((persona) => {
          const Icon = ICONS[persona.key] ?? User;
          return (
            <Button
              key={persona.key}
              variant="outline"
              onClick={() => handleSignIn(persona)}
              disabled={pending !== null}
              className="h-auto w-full justify-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-slate-900">
                  {persona.labelSw}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {persona.labelEn}
                  </span>
                </span>
                <span className="text-sm font-normal text-slate-600">
                  {pending === persona.key ? 'Inaingia...' : persona.descriptionEn}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
