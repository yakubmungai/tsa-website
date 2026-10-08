'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Phone, ArrowLeft, MessageSquare } from 'lucide-react';
import { requestPhoneCode, verifyPhoneCode } from '@/features/auth/otp-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';

interface Candidate {
  kind: 'user' | 'claim';
  id: string;
  displayName: string;
}

type Step = 'phone' | 'code' | 'choose';

/**
 * Phone sign-in.
 *
 * Built for the membership it serves: mostly older adults, on phones, reading
 * Swahili first. One decision per screen, large targets, and a way back at
 * every step.
 */
export function PhoneLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = usePortalStrings().login;
  const callbackUrl = searchParams.get('callbackUrl') || '/portal';

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPhoneCode({ phone });
      if (!res.success) {
        toast.error(res.fieldErrors?.phone?.[0] ?? res.error);
        return;
      }
      setDemoCode(res.data.demoCode ?? null);
      setCode('');
      setStep('code');
    } catch {
      toast.error(t.failed);
    } finally {
      setLoading(false);
    }
  };

  const finishSignIn = async (candidate: Candidate, withTicket: string) => {
    const res = await signIn('phone-otp', {
      ticket: withTicket,
      selectionId: candidate.id,
      selectionKind: candidate.kind,
      redirect: false,
    });
    if (res?.error) {
      toast.error(res.error);
      // The ticket is single-use, so a failure means starting over.
      setStep('phone');
      setTicket(null);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  const handleVerifyCode = async (submitted: string) => {
    setLoading(true);
    try {
      const res = await verifyPhoneCode({ phone, code: submitted });
      if (!res.success) {
        toast.error(res.fieldErrors?.code?.[0] ?? res.error);
        setCode('');
        return;
      }

      const { ticket: issued, candidates: found } = res.data;
      setTicket(issued);
      setCandidates(found);

      // A handset shared between spouses maps to more than one account, so ask
      // which one. Otherwise go straight through.
      if (found.length === 1) {
        await finishSignIn(found[0], issued);
      } else {
        setStep('choose');
      }
    } catch {
      toast.error(t.failed);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleRequestCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold text-foreground">
            {t.phoneLabel}
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(713) 555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 pl-11 text-lg"
              disabled={loading}
              required
            />
          </div>
          <p className="text-base text-muted-foreground">
            {t.phoneHelp}
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || phone.trim().length < 7}
          className="btn-shimmer h-12 w-full border-0 text-lg font-bold text-primary-foreground"
        >
          {loading ? t.sending : t.sendCode}
        </Button>
      </form>
    );
  }

  if (step === 'code') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setStep('phone')}
          className="inline-flex min-h-12 items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.changeNumber}
        </button>

        <div className="space-y-3">
          <Label htmlFor="code" className="text-base font-semibold text-foreground">
            {t.codeLabel}
          </Label>

          {demoCode ? (
            <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 px-4 py-3">
              <p className="flex items-center gap-2 text-base font-bold text-foreground">
                <MessageSquare className="h-5 w-5 text-warning" aria-hidden />
                {t.noMessageSent}
              </p>
              <p className="mt-1 text-base text-muted-foreground">
                {t.testCode}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {demoCode}
              </p>
            </div>
          ) : (
            <p className="text-base text-muted-foreground">
              {t.codeSent}
            </p>
          )}

          <div className="flex justify-center py-1">
            <InputOTP
              id="code"
              maxLength={6}
              value={code}
              onChange={(value) => {
                setCode(value);
                if (value.length === 6 && !loading) void handleVerifyCode(value);
              }}
              disabled={loading}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-14 w-11 text-xl sm:w-12" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="button"
            onClick={() => handleVerifyCode(code)}
            disabled={loading || code.length !== 6}
            className="btn-shimmer h-12 w-full border-0 text-lg font-bold text-primary-foreground"
          >
            {loading ? t.verifying : t.signIn}
          </Button>
        </div>
      </div>
    );
  }

  // More than one account uses this handset.
  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-foreground">
          {t.chooseTitle}
        </p>
        <p className="text-base text-muted-foreground">
          {t.chooseHelp}
        </p>
      </div>

      <div className="grid gap-2">
        {candidates.map((candidate) => (
          <Button
            key={`${candidate.kind}:${candidate.id}`}
            variant="outline"
            disabled={loading}
            onClick={() => {
              if (ticket) {
                setLoading(true);
                void finishSignIn(candidate, ticket).finally(() => setLoading(false));
              }
            }}
            className="h-auto min-h-12 w-full justify-start rounded-xl border-2 border-border/70 px-4 py-3 text-left hover:border-primary hover:bg-primary/5"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-foreground">
                {candidate.displayName}
              </span>
              {candidate.kind === 'claim' && (
                <span className="text-sm font-normal text-muted-foreground">
                  {t.newAccount}
                </span>
              )}
            </span>
          </Button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setStep('phone')}
        className="inline-flex min-h-12 items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.startAgain}
      </button>
    </div>
  );
}
