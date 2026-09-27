'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClaimForMember } from '@/features/claims/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { cn } from '@/lib/utils';

type ClaimType = 'MEMBER_DEATH' | 'CHILD_DEATH' | 'RELATIVE_DEATH' | 'HARDSHIP';
type Relationship = 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT_GUARDIAN' | 'SIBLING';
type Hardship = 'ILLNESS_CRITICAL' | 'IMMIGRATION_DETENTION' | 'FIRE';

export interface Prefill {
  submissionId: string;
  memberId: string | null;
  subjectName: string;
  relation: string;
  eventDate: string;
  description: string;
  contactPhone: string;
  reporterName: string;
}

interface MemberOption {
  id: string;
  names: string;
  memberNumber: number | null;
  phone: string | null;
}

function guessRelationship(relation: string): Relationship | undefined {
  const r = relation.toLowerCase();
  if (/mke|mume|wife|husband|spouse/.test(r)) return 'SPOUSE';
  if (/mtoto|child|son|daughter/.test(r)) return 'CHILD';
  if (/mama|baba|mother|father|parent|mzazi|mlezi/.test(r)) return 'PARENT_GUARDIAN';
  if (/kaka|dada|brother|sister|sibling/.test(r)) return 'SIBLING';
  if (/self|mwenyewe|mwanachama|member/.test(r)) return 'SELF';
  return undefined;
}

export function NewClaimForm({
  members,
  today,
  prefill,
}: {
  members: MemberOption[];
  today: string;
  prefill: Prefill | null;
}) {
  const t = usePortalStrings();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [memberId, setMemberId] = useState(prefill?.memberId ?? '');
  const guessed = prefill ? guessRelationship(prefill.relation) : undefined;
  const [type, setType] = useState<ClaimType>(
    guessed === 'SELF' ? 'MEMBER_DEATH' : guessed === 'CHILD' ? 'CHILD_DEATH' : 'RELATIVE_DEATH'
  );
  const [relationship, setRelationship] = useState<Relationship>(guessed ?? 'PARENT_GUARDIAN');
  const [hardship, setHardship] = useState<Hardship>('ILLNESS_CRITICAL');
  const [subjectName, setSubjectName] = useState(prefill?.subjectName ?? '');
  const [subjectAge, setSubjectAge] = useState('');
  const [livesInUsa, setLivesInUsa] = useState(true);
  const [eventDate, setEventDate] = useState(prefill?.eventDate || today);
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [contactPhone, setContactPhone] = useState(prefill?.contactPhone ?? '');
  const [recipientName, setRecipientName] = useState(prefill?.reporterName ?? '');
  const [recipientPhone, setRecipientPhone] = useState(prefill?.contactPhone ?? '');
  const [recipientRelationship, setRecipientRelationship] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members.filter((m) => m.names.toLowerCase().includes(q) || (m.phone ?? '').includes(q)).slice(0, 8);
  }, [members, query]);
  const chosen = members.find((m) => m.id === memberId);

  function chooseType(next: ClaimType) {
    setType(next);
    if (next === 'MEMBER_DEATH') {
      setRelationship('SELF');
      if (chosen) setSubjectName(chosen.names);
    }
    if (next === 'CHILD_DEATH') setRelationship('CHILD');
    if (next === 'RELATIVE_DEATH' && relationship === 'SELF') setRelationship('PARENT_GUARDIAN');
  }

  function submit() {
    startTransition(async () => {
      const res = await createClaimForMember({
        memberId,
        sourceSubmissionId: prefill?.submissionId,
        type,
        relationship,
        subjectName: type === 'MEMBER_DEATH' ? (chosen?.names ?? subjectName) : subjectName,
        subjectAge: subjectAge === '' ? undefined : Number(subjectAge),
        subjectLivesInUsa: type === 'CHILD_DEATH' ? livesInUsa : undefined,
        hardshipCategory: type === 'HARDSHIP' ? hardship : undefined,
        eventDate,
        description,
        contactPhone,
        recipientName: type === 'MEMBER_DEATH' ? recipientName : '',
        recipientPhone: type === 'MEMBER_DEATH' ? recipientPhone : '',
        recipientRelationship: type === 'MEMBER_DEATH' ? recipientRelationship : '',
        memorialRequested: false,
      });
      if (res.success) {
        router.push(`/admin/claims/${res.data.claimId}`);
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  }

  const err = (k: string) => (errors[k]?.[0] ? <p className="text-sm text-destructive">{errors[k][0]}</p> : null);
  const pill = (active: boolean) =>
    cn(
      'min-h-12 rounded-xl border-2 px-3 py-2 text-left text-base font-semibold',
      active ? 'border-primary bg-primary/10' : 'border-border/70 text-muted-foreground'
    );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-base">{t.adminClaims.chooseMember}</Label>
        {chosen ? (
          <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-primary/10 px-4 py-3">
            <span className="text-lg font-semibold">
              {chosen.names}
              {chosen.memberNumber ? <span className="text-muted-foreground"> · TSA-{chosen.memberNumber}</span> : null}
            </span>
            <button type="button" onClick={() => setMemberId('')} className="text-base font-semibold text-primary">
              {t.common.cancel}
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.admin.members.search} className="h-12 pl-12 text-base" />
            </div>
            <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setMemberId(m.id)} className="min-h-12 w-full px-4 py-2 text-left text-base hover:bg-muted">
                    {m.names} <span className="text-muted-foreground">{m.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {err('memberId')}
      </div>

      <div className="space-y-2">
        <Label className="text-base">{t.claims.steps.what}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['MEMBER_DEATH', 'CHILD_DEATH', 'RELATIVE_DEATH', 'HARDSHIP'] as ClaimType[]).map((k) => (
            <button key={k} type="button" aria-pressed={type === k} onClick={() => chooseType(k)} className={pill(type === k)}>
              {t.claims.types[k].title}
            </button>
          ))}
        </div>
      </div>

      {type === 'HARDSHIP' ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {(['ILLNESS_CRITICAL', 'IMMIGRATION_DETENTION', 'FIRE'] as Hardship[]).map((k) => (
            <button key={k} type="button" aria-pressed={hardship === k} onClick={() => setHardship(k)} className={pill(hardship === k)}>
              {t.claims.hardship[k].title}
            </button>
          ))}
        </div>
      ) : null}

      {type === 'RELATIVE_DEATH' || type === 'HARDSHIP' ? (
        <div className="space-y-2">
          <Label className="text-base">{t.adminClaims.relationship}</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(['SELF', 'SPOUSE', 'CHILD', 'PARENT_GUARDIAN', 'SIBLING'] as Relationship[])
              .filter((r) => (type === 'RELATIVE_DEATH' ? r !== 'SELF' : true))
              .map((r) => (
                <button key={r} type="button" aria-pressed={relationship === r} onClick={() => setRelationship(r)} className={pill(relationship === r)}>
                  {t.claims.relationships[r]}
                </button>
              ))}
          </div>
          {err('relationship')}
        </div>
      ) : null}

      {type !== 'MEMBER_DEATH' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="subjectName" label={t.adminClaims.subject} value={subjectName} onChange={setSubjectName} error={err('subjectName')} />
          {type === 'CHILD_DEATH' ? (
            <div className="grid grid-cols-2 gap-2">
              <Field id="subjectAge" label={t.adminClaims.age} value={subjectAge} onChange={(v) => setSubjectAge(v.replace(/\D/g, ''))} />
              <div className="space-y-2">
                <Label className="text-base">{t.adminClaims.livesInUsa}</Label>
                <div className="grid grid-cols-2 gap-1">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" aria-pressed={livesInUsa === v} onClick={() => setLivesInUsa(v)} className={pill(livesInUsa === v)}>
                      {v ? t.common.yes : t.common.no}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="recipientName" label={t.claims.recipientName} value={recipientName} onChange={setRecipientName} error={err('recipientName')} />
          <Field id="recipientPhone" label={t.claims.recipientPhone} value={recipientPhone} onChange={setRecipientPhone} />
          <Field id="recipientRelationship" label={t.claims.recipientRelationship} value={recipientRelationship} onChange={setRecipientRelationship} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventDate" className="text-base">
            {t.adminClaims.eventDate}
          </Label>
          <Input id="eventDate" type="date" max={today} value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-12 text-lg" />
          {err('eventDate')}
        </div>
        <Field id="contactPhone" label={t.adminClaims.contact} value={contactPhone} onChange={setContactPhone} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-base">
          {t.claims.detailsQuestion}
        </Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 text-base" />
        {err('description')}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending || !memberId}
        className="btn-shimmer min-h-14 w-full rounded-2xl text-lg font-bold text-primary-foreground disabled:opacity-50"
      >
        {pending ? t.common.loading : t.adminClaims.create}
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 text-base" />
      {error}
    </div>
  );
}
