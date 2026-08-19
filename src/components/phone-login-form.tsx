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
      toast.error('Something went wrong. Please try again.');
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
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleRequestCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold text-slate-800">
            Namba yako ya simu
            <span className="ml-2 text-sm font-normal text-slate-500">Your phone number</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(713) 555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 pl-11 text-base"
              disabled={loading}
              required
            />
          </div>
          <p className="text-sm text-slate-600">
            Tutakutumia namba ya uthibitisho.
            <span className="ml-1 text-slate-500">We will send you a code.</span>
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || phone.trim().length < 7}
          className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
        >
          {loading ? 'Inatuma...' : 'Nitumie namba / Send me a code'}
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
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Badilisha namba / Change number
        </button>

        <div className="space-y-3">
          <Label htmlFor="code" className="text-base font-semibold text-slate-800">
            Weka namba ya uthibitisho
            <span className="ml-2 text-sm font-normal text-slate-500">Enter your code</span>
          </Label>

          {demoCode ? (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <MessageSquare className="h-4 w-4" aria-hidden />
                Hakuna ujumbe uliotumwa / No message was sent
              </p>
              <p className="mt-1 text-sm text-amber-800">
                This is the test system. Your code is:
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-950">
                {demoCode}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Tumekutumia namba ya tarakimu 6.
              <span className="ml-1 text-slate-500">We sent a 6-digit code.</span>
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
                  <InputOTPSlot key={i} index={i} className="h-14 w-12 text-xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="button"
            onClick={() => handleVerifyCode(code)}
            disabled={loading || code.length !== 6}
            className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
          >
            {loading ? 'Inathibitisha...' : 'Ingia / Sign in'}
          </Button>
        </div>
      </div>
    );
  }

  // More than one account uses this handset.
  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-slate-800">
          Akaunti zaidi ya moja zinatumia namba hii
        </p>
        <p className="text-sm text-slate-600">
          More than one account uses this phone. Which one is yours?
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
            className="h-auto w-full justify-start px-4 py-3 text-left"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-slate-900">
                {candidate.displayName}
              </span>
              {candidate.kind === 'claim' && (
                <span className="text-sm font-normal text-slate-600">
                  Akaunti mpya / Set up this account
                </span>
              )}
            </span>
          </Button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setStep('phone')}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Anza upya / Start again
      </button>
    </div>
  );
}
