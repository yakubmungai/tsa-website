'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { UserPlus } from 'lucide-react';
import { requestDelegation, approveDelegation } from '@/features/delegation/actions';

const PERMISSIONS = [
  { value: 'VIEW_FINANCES', sw: 'Kuona salio langu', en: 'See my balance and statements' },
  { value: 'MAKE_PAYMENTS', sw: 'Kulipa kwa niaba yangu', en: 'Pay on my behalf' },
  { value: 'SUBMIT_FORMS', sw: 'Kujaza fomu kwa niaba yangu', en: 'Submit forms for me' },
  { value: 'EDIT_PROFILE', sw: 'Kubadilisha taarifa zangu', en: 'Update my details' },
] as const;

export function AddHelperForm() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['VIEW_FINANCES']);

  const [delegationId, setDelegationId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const toggle = (value: string) =>
    setPermissions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestDelegation({
        delegateName: name,
        delegatePhone: phone,
        relationship: relationship || undefined,
        permissions: permissions as never,
      });
      if (!res.success) {
        const first = Object.values(res.fieldErrors ?? {})[0]?.[0];
        toast.error(first ?? res.error);
        return;
      }
      setDelegationId(res.data.delegationId);
      setDemoCode(res.data.demoCode ?? null);
      setStep('confirm');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submitted: string) => {
    if (!delegationId) return;
    setLoading(true);
    try {
      const res = await approveDelegation({ delegationId, code: submitted });
      if (!res.success) {
        toast.error(res.error);
        setCode('');
        return;
      }
      toast.success(`${name} can now help with your account.`);
      setStep('form');
      setName('');
      setPhone('');
      setRelationship('');
      setPermissions(['VIEW_FINANCES']);
      setCode('');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-emerald-700" aria-hidden />
          Ongeza msaidizi
          <span className="text-base font-normal text-slate-500">Add a helper</span>
        </CardTitle>
        <CardDescription className="text-base">
          Mtu unayemwamini anaweza kukusaidia na akaunti yako.
          <span className="mt-1 block text-slate-500">
            Someone you trust can help you with your account. We will send a code to your
            phone to confirm.
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'form' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="helper-name" className="text-base font-semibold text-slate-800">
                Jina lake / Their name
              </Label>
              <Input
                id="helper-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helper-phone" className="text-base font-semibold text-slate-800">
                Namba yake ya simu / Their phone number
              </Label>
              <Input
                id="helper-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(713) 555-0100"
                className="h-12 text-base"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helper-rel" className="text-base font-semibold text-slate-800">
                Uhusiano / Relationship
                <span className="ml-2 text-sm font-normal text-slate-500">optional</span>
              </Label>
              <Input
                id="helper-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="binti / daughter"
                className="h-12 text-base"
                disabled={loading}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-base font-semibold text-slate-800">
                Wanaweza kufanya nini? / What can they do?
              </legend>
              {PERMISSIONS.map((permission) => (
                <label
                  key={permission.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <Checkbox
                    checked={permissions.includes(permission.value)}
                    onCheckedChange={() => toggle(permission.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-base font-medium text-slate-900">
                      {permission.sw}
                    </span>
                    <span className="block text-sm text-slate-600">{permission.en}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <Button
              type="submit"
              disabled={loading || permissions.length === 0}
              className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
            >
              {loading ? 'Inatuma...' : 'Endelea / Continue'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-base text-slate-700">
              Tumekutumia namba ya uthibitisho kwenye simu yako.
              <span className="mt-1 block text-slate-500">
                We sent a code to your own phone — not to {name}&rsquo;s — so only you can
                approve this.
              </span>
            </p>

            {demoCode ? (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-900">
                  Hakuna ujumbe uliotumwa / No message was sent
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-950">
                  {demoCode}
                </p>
              </div>
            ) : null}

            <div className="flex justify-center py-1">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 6 && !loading) void handleApprove(value);
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
              variant="ghost"
              onClick={() => setStep('form')}
              disabled={loading}
              className="h-11 w-full text-base"
            >
              Ghairi / Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
