'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Baby, CheckCircle2, Flame, HandHeart, HeartCrack, HeartPulse, Shield, User, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fileClaim } from '@/features/claims/actions';
import { formatUSD } from '@/lib/money';
import { daysBetween, orgDateFromInput } from '@/lib/finance/dates';
import { CHILD_AGE_LIMIT, REPORT_WITHIN_DAYS } from '@/lib/finance/constants';
import { ChoiceButton } from './choice-button';
import { CopyField } from './copy-field';
import { WizardShell } from './wizard-shell';
import { usePortalStrings } from './use-portal-strings';

type ClaimType = 'MEMBER_DEATH' | 'CHILD_DEATH' | 'RELATIVE_DEATH' | 'HARDSHIP';
type Relationship = 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT_GUARDIAN' | 'SIBLING';
type Hardship = 'ILLNESS_CRITICAL' | 'IMMIGRATION_DETENTION' | 'FIRE';

export interface WizardProps {
  memberId: string;
  memberName: string;
  /** A helper acting for the member — only they can report the member's own death. */
  isActing: boolean;
  relatives: { spouse: string | null; parents: string[]; children: string[]; siblings: string[] };
  defaultPhone: string;
  today: string;
  estimate: { majorDeathCents: number; relativeOrHardshipCents: number; voluntary: boolean };
}

interface Draft {
  type?: ClaimType;
  hardshipCategory?: Hardship;
  relationship?: Relationship;
  subjectName: string;
  subjectAge: string;
  subjectLivesInUsa?: boolean;
  eventDate: string;
  description: string;
  contactPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientRelationship: string;
  memorialRequested: boolean;
  memorialDate: string;
}

const STEPS = 5;

export function ClaimWizard(props: WizardProps) {
  const t = usePortalStrings();
  const draftKey = `tsa_claim_draft_${props.memberId}`;
  const empty: Draft = {
    subjectName: '',
    subjectAge: '',
    eventDate: props.today,
    description: '',
    contactPhone: props.defaultPhone,
    recipientName: '',
    recipientPhone: '',
    recipientRelationship: '',
    memorialRequested: false,
    memorialDate: '',
  };
  const [draft, setDraft] = useState<Draft>(empty);
  const [step, setStep] = useState(1);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Progress survives leaving the page — an older member interrupted by a
  // phone call comes back to where they were.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { draft: Draft; step: number };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, client only
        setDraft({ ...empty, ...parsed.draft });
        setStep(parsed.step || 1);
        setRestored(true);
      }
    } catch {
      // Nothing saved, or storage blocked.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (done) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ draft, step }));
    } catch {
      // Storage blocked: the form still works, it just is not remembered.
    }
  }, [draft, step, done, draftKey]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function chooseType(type: ClaimType) {
    setDraft((d) => ({
      ...d,
      type,
      hardshipCategory: type === 'HARDSHIP' ? d.hardshipCategory : undefined,
      relationship: type === 'MEMBER_DEATH' ? 'SELF' : type === 'CHILD_DEATH' ? 'CHILD' : undefined,
      subjectName: type === 'MEMBER_DEATH' ? props.memberName : '',
    }));
    if (type !== 'HARDSHIP') setStep(2);
  }

  function chooseHardship(category: Hardship) {
    setDraft((d) => ({
      ...d,
      hardshipCategory: category,
      // Detention and fire cover the member only (Art 4.3).
      relationship: category === 'ILLNESS_CRITICAL' ? d.relationship : 'SELF',
      subjectName: category === 'ILLNESS_CRITICAL' ? d.subjectName : props.memberName,
    }));
    setStep(2);
  }

  const listFor = (rel?: Relationship): string[] => {
    switch (rel) {
      case 'SPOUSE':
        return props.relatives.spouse ? [props.relatives.spouse] : [];
      case 'CHILD':
        return props.relatives.children;
      case 'PARENT_GUARDIAN':
        return props.relatives.parents;
      case 'SIBLING':
        return props.relatives.siblings;
      default:
        return [];
    }
  };

  const relationshipChoices: Relationship[] = useMemo(() => {
    if (draft.type === 'RELATIVE_DEATH') return ['SPOUSE', 'PARENT_GUARDIAN', 'SIBLING', 'CHILD'];
    if (draft.type === 'HARDSHIP' && draft.hardshipCategory === 'ILLNESS_CRITICAL') return ['SELF', 'SPOUSE', 'CHILD'];
    return [];
  }, [draft.type, draft.hardshipCategory]);

  const lateDays = useMemo(() => {
    try {
      return daysBetween(orgDateFromInput(draft.eventDate), orgDateFromInput(props.today));
    } catch {
      return 0;
    }
  }, [draft.eventDate, props.today]);

  // The estimate follows the same rules the reviewer's screen will apply.
  const childToRelative =
    draft.type === 'CHILD_DEATH' &&
    ((draft.subjectAge !== '' && Number(draft.subjectAge) >= CHILD_AGE_LIMIT) || draft.subjectLivesInUsa === false);
  const estimateCents =
    draft.type === 'MEMBER_DEATH' || (draft.type === 'CHILD_DEATH' && !childToRelative)
      ? props.estimate.majorDeathCents
      : props.estimate.relativeOrHardshipCents;

  const whoValid =
    draft.type === 'MEMBER_DEATH'
      ? draft.recipientName.trim().length >= 2
      : Boolean(draft.relationship) &&
        draft.subjectName.trim().length >= 2 &&
        (draft.type !== 'CHILD_DEATH' || (draft.subjectAge !== '' && draft.subjectLivesInUsa !== undefined));

  function submit() {
    setFormError(null);
    startTransition(async () => {
      const res = await fileClaim({
        type: draft.type,
        relationship: draft.relationship,
        subjectName: draft.subjectName,
        subjectAge: draft.subjectAge === '' ? undefined : Number(draft.subjectAge),
        subjectLivesInUsa: draft.type === 'CHILD_DEATH' ? draft.subjectLivesInUsa : undefined,
        hardshipCategory: draft.type === 'HARDSHIP' ? draft.hardshipCategory : undefined,
        eventDate: draft.eventDate,
        description: draft.description,
        contactPhone: draft.contactPhone,
        recipientName: draft.type === 'MEMBER_DEATH' ? draft.recipientName : '',
        recipientPhone: draft.type === 'MEMBER_DEATH' ? draft.recipientPhone : '',
        recipientRelationship: draft.type === 'MEMBER_DEATH' ? draft.recipientRelationship : '',
        memorialRequested: draft.type !== 'HARDSHIP' && draft.memorialRequested,
        memorialDate: draft.type !== 'HARDSHIP' && draft.memorialRequested ? draft.memorialDate : '',
      });
      if (res.success) {
        setDone(res.data.reference);
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  }

  if (done) {
    const share = `https://wa.me/?text=${encodeURIComponent(t.claims.done.shareText(done))}`;
    return (
      <section className="space-y-6 rounded-3xl border-2 border-success/40 bg-success/10 p-6 text-center shadow-sm sm:p-10">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden />
        <h2 className="font-serif text-3xl font-bold">{t.claims.done.title}</h2>
        <p className="text-lg">{t.claims.done.body}</p>
        <CopyField label={t.claims.done.reference} value={done} emphasis className="text-left" />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={share}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-primary px-6 text-lg font-bold text-primary hover:bg-primary/5"
          >
            {t.claims.done.share}
          </a>
          <Link
            href="/portal/claims"
            className="btn-shimmer inline-flex min-h-14 items-center justify-center rounded-2xl px-6 text-lg font-bold text-primary-foreground"
          >
            {t.claims.done.viewMine}
          </Link>
        </div>
      </section>
    );
  }

  const help = `TSA: ${props.memberName}`;
  const fieldError = (key: string) =>
    errors[key]?.[0] ? <p className="text-base text-destructive">{errors[key][0]}</p> : null;

  return (
    <div className="space-y-4">
      {restored && step > 1 ? <p className="text-base text-muted-foreground">{t.claims.draftKept}</p> : null}

      {step === 1 ? (
        <WizardShell step={1} total={STEPS} title={t.claims.steps.what} helpContext={help}>
          <div className="grid gap-3">
            {props.isActing ? (
              <ChoiceButton
                icon={<HeartCrack className="h-6 w-6" />}
                title={t.claims.types.MEMBER_DEATH.title}
                description={t.claims.types.MEMBER_DEATH.description}
                selected={draft.type === 'MEMBER_DEATH'}
                onClick={() => chooseType('MEMBER_DEATH')}
              />
            ) : null}
            <ChoiceButton
              icon={<Baby className="h-6 w-6" />}
              title={t.claims.types.CHILD_DEATH.title}
              description={t.claims.types.CHILD_DEATH.description}
              selected={draft.type === 'CHILD_DEATH'}
              onClick={() => chooseType('CHILD_DEATH')}
            />
            <ChoiceButton
              icon={<Users className="h-6 w-6" />}
              title={t.claims.types.RELATIVE_DEATH.title}
              description={t.claims.types.RELATIVE_DEATH.description}
              selected={draft.type === 'RELATIVE_DEATH'}
              onClick={() => chooseType('RELATIVE_DEATH')}
            />
            <ChoiceButton
              icon={<HandHeart className="h-6 w-6" />}
              title={t.claims.types.HARDSHIP.title}
              description={t.claims.types.HARDSHIP.description}
              selected={draft.type === 'HARDSHIP'}
              onClick={() => chooseType('HARDSHIP')}
            />
          </div>
          {draft.type === 'HARDSHIP' ? (
            <div className="space-y-3 border-t border-border/60 pt-5">
              <p className="text-lg font-semibold">{t.claims.whichKind}</p>
              <ChoiceButton
                icon={<HeartPulse className="h-6 w-6" />}
                title={t.claims.hardship.ILLNESS_CRITICAL.title}
                description={t.claims.hardship.ILLNESS_CRITICAL.description}
                selected={draft.hardshipCategory === 'ILLNESS_CRITICAL'}
                onClick={() => chooseHardship('ILLNESS_CRITICAL')}
              />
              <ChoiceButton
                icon={<Shield className="h-6 w-6" />}
                title={t.claims.hardship.IMMIGRATION_DETENTION.title}
                description={t.claims.hardship.IMMIGRATION_DETENTION.description}
                selected={draft.hardshipCategory === 'IMMIGRATION_DETENTION'}
                onClick={() => chooseHardship('IMMIGRATION_DETENTION')}
              />
              <ChoiceButton
                icon={<Flame className="h-6 w-6" />}
                title={t.claims.hardship.FIRE.title}
                description={t.claims.hardship.FIRE.description}
                selected={draft.hardshipCategory === 'FIRE'}
                onClick={() => chooseHardship('FIRE')}
              />
            </div>
          ) : null}
        </WizardShell>
      ) : null}

      {step === 2 ? (
        <WizardShell
          step={2}
          total={STEPS}
          title={draft.type === 'MEMBER_DEATH' ? t.claims.recipientTitle : t.claims.whoQuestion}
          helpContext={help}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          nextDisabled={!whoValid}
        >
          {draft.type === 'MEMBER_DEATH' ? (
            <div className="space-y-4">
              <TextField id="recipientName" label={t.claims.recipientName} value={draft.recipientName} onChange={(v) => set('recipientName', v)} />
              <TextField id="recipientPhone" label={t.claims.recipientPhone} value={draft.recipientPhone} onChange={(v) => set('recipientPhone', v)} inputMode="tel" />
              <TextField
                id="recipientRelationship"
                label={t.claims.recipientRelationship}
                value={draft.recipientRelationship}
                onChange={(v) => set('recipientRelationship', v)}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {relationshipChoices.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {relationshipChoices.map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      aria-pressed={draft.relationship === rel}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          relationship: rel,
                          subjectName: rel === 'SELF' ? props.memberName : '',
                        }))
                      }
                      className={
                        draft.relationship === rel
                          ? 'min-h-14 rounded-2xl border-2 border-primary bg-primary/10 px-3 text-lg font-semibold'
                          : 'min-h-14 rounded-2xl border-2 border-border/70 bg-card px-3 text-lg font-semibold text-muted-foreground'
                      }
                    >
                      {t.claims.relationships[rel]}
                    </button>
                  ))}
                </div>
              ) : null}

              {draft.relationship && draft.relationship !== 'SELF' ? (
                <div className="space-y-3">
                  {listFor(draft.relationship).length > 0 ? (
                    <>
                      <p className="text-base font-semibold text-muted-foreground">{t.claims.registered}</p>
                      <div className="grid gap-2">
                        {listFor(draft.relationship).map((name) => (
                          <ChoiceButton
                            key={name}
                            icon={<User className="h-6 w-6" />}
                            title={name}
                            selected={draft.subjectName === name}
                            onClick={() => set('subjectName', name)}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                  <TextField
                    id="subjectName"
                    label={listFor(draft.relationship).length > 0 ? `${t.claims.notListed} — ${t.claims.typeName}` : t.claims.typeName}
                    value={listFor(draft.relationship).includes(draft.subjectName) ? '' : draft.subjectName}
                    onChange={(v) => set('subjectName', v)}
                  />
                </div>
              ) : null}

              {draft.relationship === 'SELF' && draft.type === 'HARDSHIP' ? (
                <p className="rounded-2xl bg-muted/60 p-4 text-lg">{props.memberName}</p>
              ) : null}

              {draft.type === 'CHILD_DEATH' ? (
                <div className="space-y-4">
                  <TextField
                    id="subjectAge"
                    label={t.claims.childAge}
                    value={draft.subjectAge}
                    onChange={(v) => set('subjectAge', v.replace(/[^\d]/g, '').slice(0, 3))}
                    inputMode="numeric"
                  />
                  <fieldset className="space-y-2">
                    <legend className="text-lg font-semibold">{t.claims.livesInUsa}</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {[true, false].map((v) => (
                        <button
                          key={String(v)}
                          type="button"
                          aria-pressed={draft.subjectLivesInUsa === v}
                          onClick={() => set('subjectLivesInUsa', v)}
                          className={
                            draft.subjectLivesInUsa === v
                              ? 'min-h-14 rounded-2xl border-2 border-primary bg-primary/10 text-lg font-semibold'
                              : 'min-h-14 rounded-2xl border-2 border-border/70 bg-card text-lg font-semibold text-muted-foreground'
                          }
                        >
                          {v ? t.common.yes : t.common.no}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              ) : null}
            </div>
          )}
        </WizardShell>
      ) : null}

      {step === 3 ? (
        <WizardShell
          step={3}
          total={STEPS}
          title={t.claims.steps.when}
          helpContext={help}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          nextDisabled={!draft.eventDate || draft.eventDate > props.today}
        >
          <div className="space-y-2">
            <Label htmlFor="eventDate" className="text-lg">
              {t.claims.whenQuestion}
            </Label>
            <Input
              id="eventDate"
              type="date"
              value={draft.eventDate}
              max={props.today}
              onChange={(e) => set('eventDate', e.target.value)}
              className="h-14 text-lg"
            />
            {fieldError('eventDate')}
          </div>
          {lateDays > REPORT_WITHIN_DAYS ? (
            <p className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-base">{t.claims.lateWarning(lateDays)}</p>
          ) : null}
        </WizardShell>
      ) : null}

      {step === 4 ? (
        <WizardShell
          step={4}
          total={STEPS}
          title={t.claims.steps.details}
          helpContext={help}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
          nextDisabled={draft.description.trim().length < 3}
        >
          <div className="space-y-2">
            <Label htmlFor="description" className="text-lg">
              {t.claims.detailsQuestion}
            </Label>
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={t.claims.detailsPlaceholder}
              className="min-h-32 text-lg"
            />
            {fieldError('description')}
          </div>
          <TextField
            id="contactPhone"
            label={t.claims.contactPhone}
            value={draft.contactPhone}
            onChange={(v) => set('contactPhone', v)}
            inputMode="tel"
          />
          {draft.type !== 'HARDSHIP' ? (
            <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
              <label className="flex min-h-12 items-center gap-3 text-lg">
                <input
                  type="checkbox"
                  checked={draft.memorialRequested}
                  onChange={(e) => set('memorialRequested', e.target.checked)}
                  className="h-6 w-6 accent-[hsl(var(--primary))]"
                />
                {t.claims.memorial}
              </label>
              {draft.memorialRequested ? (
                <div className="space-y-2">
                  <Label htmlFor="memorialDate" className="text-base">
                    {t.claims.memorialDate}
                  </Label>
                  <Input
                    id="memorialDate"
                    type="date"
                    value={draft.memorialDate}
                    onChange={(e) => set('memorialDate', e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </WizardShell>
      ) : null}

      {step === 5 ? (
        <WizardShell
          step={5}
          total={STEPS}
          title={t.claims.steps.review}
          helpContext={help}
          onBack={() => setStep(4)}
          onNext={submit}
          nextLabel={pending ? t.claims.submitting : t.claims.submit}
          busy={pending}
        >
          <dl className="divide-y divide-border/60 rounded-2xl border border-border/60 text-lg">
            <Row label={t.claims.steps.what} value={draft.type ? t.claims.types[draft.type].title : ''} />
            {draft.hardshipCategory ? <Row label={t.claims.whichKind} value={t.claims.hardship[draft.hardshipCategory].title} /> : null}
            <Row
              label={t.claims.steps.who}
              value={`${draft.subjectName}${draft.relationship && draft.relationship !== 'SELF' ? ` (${t.claims.relationships[draft.relationship]})` : ''}`}
            />
            {draft.type === 'MEMBER_DEATH' ? <Row label={t.claims.recipientName} value={draft.recipientName} /> : null}
            <Row label={t.claims.whenQuestion} value={draft.eventDate} />
            <Row label={t.claims.detailsQuestion} value={draft.description} />
          </dl>
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            {props.estimate.voluntary ? (
              <p className="text-lg">{t.claims.estimateVoluntary}</p>
            ) : (
              <>
                <p className="text-xl font-bold">{t.claims.estimate(formatUSD(estimateCents))}</p>
                <p className="text-base text-muted-foreground">{t.claims.estimateNote}</p>
              </>
            )}
          </div>
          <p className="text-base text-muted-foreground">{t.claims.documentsNote}</p>
          {formError ? (
            <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-base text-destructive">
              {formError}
            </p>
          ) : null}
        </WizardShell>
      ) : null}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: 'tel' | 'numeric' | 'text';
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-lg">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} className="h-14 text-lg" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="break-words font-semibold sm:col-span-2">{value}</dd>
    </div>
  );
}
