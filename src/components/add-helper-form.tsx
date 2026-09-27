'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { SectionCard } from '@/components/portal/section-card';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { requestDelegation, approveDelegation } from '@/features/delegation/actions';
import { cn } from '@/lib/utils';

const PERMISSIONS = ['VIEW_FINANCES', 'MAKE_PAYMENTS', 'SUBMIT_FORMS', 'EDIT_PROFILE'] as const;

export function AddHelperForm() {
  const t = usePortalStrings();
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
      toast.error(t.common.somethingWrong);
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
      toast.success(t.helpers.added(name));
      setStep('form');
      setName('');
      setPhone('');
      setRelationship('');
      setPermissions(['VIEW_FINANCES']);
      setCode('');
      router.refresh();
    } catch {
      toast.error(t.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title={t.helpers.addTitle}
      description={t.helpers.addBody}
      icon={<UserPlus className="h-5 w-5 text-primary" aria-hidden />}
    >
      {step === 'form' ? (
        <form onSubmit={handleRequest} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="helper-name" className="text-base font-semibold text-foreground">
              {t.helpers.name}
            </Label>
            <Input
              id="helper-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg"
              autoComplete="off"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="helper-phone" className="text-base font-semibold text-foreground">
              {t.helpers.phone}
            </Label>
            <Input
              id="helper-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(713) 555-0100"
              className="h-12 text-lg"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="helper-rel" className="text-base font-semibold text-foreground">
              {t.helpers.relationship}
              <span className="ml-2 font-normal text-muted-foreground">({t.common.optional})</span>
            </Label>
            <Input
              id="helper-rel"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder={t.helpers.relationshipPlaceholder}
              className="h-12 text-lg"
              disabled={loading}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-1 text-base font-semibold text-foreground">
              {t.helpers.whatCanTheyDo}
            </legend>
            {PERMISSIONS.map((permission) => {
              const checked = permissions.includes(permission);
              return (
                <label
                  key={permission}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3 transition-colors',
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-border/70 bg-card hover:border-primary/60'
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(permission)}
                    disabled={loading}
                    className="h-6 w-6"
                  />
                  <span className="text-base font-medium text-foreground">
                    {t.helpers.permissionChoices[permission]}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <button
            type="submit"
            disabled={loading || permissions.length === 0}
            className="btn-shimmer inline-flex min-h-12 w-full items-center justify-center rounded-xl text-lg font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? t.helpers.sending : t.common.next}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-base text-foreground">{t.helpers.codeSent(name)}</p>

          {demoCode ? (
            <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 px-4 py-3">
              <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Info className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                {t.helpers.demoNoMessage}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {demoCode}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-center text-base font-semibold text-foreground">{t.helpers.codeLabel}</p>
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
                    <InputOTPSlot key={i} index={i} className="h-14 w-11 text-xl sm:w-12" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep('form')}
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-card text-base font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {t.common.cancel}
          </button>
        </div>
      )}
    </SectionCard>
  );
}
