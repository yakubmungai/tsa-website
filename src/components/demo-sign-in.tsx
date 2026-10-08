'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-context';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { ShieldCheck, UserCheck, AlertTriangle, HeartHandshake, User, UserPlus, Wallet } from 'lucide-react';

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
  descriptionSw: string;
  landing: string;
}

const ICONS: Record<string, typeof ShieldCheck> = {
  admin: ShieldCheck,
  member: UserCheck,
  arrears: AlertTriangle,
  helper: HeartHandshake,
  newMember: UserPlus,
  duesOnly: Wallet,
};

export function DemoSignIn({ personas }: { personas: DemoPersonaOption[] }) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = usePortalStrings().demo.signIn;
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
      <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 px-4 py-3">
        <p className="text-base font-bold text-foreground">{t.title}</p>
        <p className="mt-1 text-base text-foreground">{t.body}</p>
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
              // The shared Button never wraps (whitespace-nowrap); these cards
              // carry a sentence, so they must, or they run off a phone screen.
              className="h-auto min-h-12 w-full items-start justify-start gap-3 whitespace-normal rounded-xl px-4 py-3 text-left hover:border-primary hover:bg-primary/5"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
                <span className="text-base font-semibold text-foreground">
                  {language === 'sw' ? persona.labelSw : persona.labelEn}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {pending === persona.key
                    ? t.signingIn
                    : language === 'sw'
                      ? persona.descriptionSw
                      : persona.descriptionEn}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
