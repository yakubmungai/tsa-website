'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Save, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/portal/section-card';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { ContactListField, StringListField, type Contact } from '@/components/admin-edit-member';
import { createMember } from '@/features/membership/admin-actions';

const INPUT = 'h-12 text-base';
const LABEL = 'text-base font-semibold text-foreground';

/** The add-member form. The page around it is a server component in AdminShell. */
export function NewMemberForm() {
  const t = usePortalStrings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [names, setNames] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [husbandWife, setHusbandWife] = useState('');
  const [spousePhone, setSpousePhone] = useState('');

  // Lists State
  const [parents, setParents] = useState<string[]>(['']);
  const [children, setChildren] = useState<string[]>(['']);
  const [siblings, setSiblings] = useState<string[]>(['']);
  const [witnesses, setWitnesses] = useState<Contact[]>([{ name: '', phone: '' }]);
  const [nextOfKin, setNextOfKin] = useState<Contact[]>([{ name: '', phone: '' }]);

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.trim()) {
      toast.error(t.memberForm.nameRequired);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        names,
        phone,
        address,
        husbandWife,
        spousePhone,
        // Filter out empty items
        parents: parents.filter(p => p.trim() !== ''),
        children: children.filter(c => c.trim() !== ''),
        siblings: siblings.filter(s => s.trim() !== ''),
        witnesses: witnesses.filter(w => w.name.trim() !== ''),
        nextOfKin: nextOfKin.filter(n => n.name.trim() !== ''),
      };

      const res = await createMember(payload);
      if (res.success) {
        toast.success(t.memberForm.created);
        router.push(`/admin/members/${res.data.memberId}`);
      } else {
        const firstFieldError = Object.values(res.fieldErrors ?? {})[0]?.[0];
        toast.error(firstFieldError ?? res.error);
      }
    } catch {
      toast.error(t.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  };

  const numbered = (label: string) => (idx: number) => `${label} ${idx + 1}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard
        title={t.memberForm.personal}
        description={t.memberForm.personalHelp}
        icon={<User className="h-5 w-5 text-primary" aria-hidden />}
        bodyClassName="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="names" className={LABEL}>
              {t.memberForm.fullName}{' '}
              <span className="font-normal text-destructive">({t.memberForm.required})</span>
            </Label>
            <Input id="names" value={names} onChange={(e) => setNames(e.target.value)} className={INPUT} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className={LABEL}>{t.memberForm.phone}</Label>
            <Input
              id="phone"
              inputMode="tel"
              placeholder="563-210-1022"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address" className={LABEL}>{t.memberForm.address}</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className={INPUT} />
        </div>
      </SectionCard>

      <SectionCard
        title={t.memberForm.family}
        description={t.memberForm.familyHelp}
        icon={<Heart className="h-5 w-5 text-primary" aria-hidden />}
        bodyClassName="space-y-6"
      >
        <div className="grid grid-cols-1 gap-4 border-b border-border/60 pb-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="spouse" className={LABEL}>{t.memberForm.spouse}</Label>
            <Input id="spouse" value={husbandWife} onChange={(e) => setHusbandWife(e.target.value)} className={INPUT} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spousePhone" className={LABEL}>{t.memberForm.spousePhone}</Label>
            <Input
              id="spousePhone"
              inputMode="tel"
              value={spousePhone}
              onChange={(e) => setSpousePhone(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        <StringListField label={t.memberForm.parents} values={parents} onChange={setParents} placeholder={numbered(t.memberForm.parents)} />
        <StringListField label={t.memberForm.children} values={children} onChange={setChildren} placeholder={numbered(t.memberForm.children)} />
        <StringListField label={t.memberForm.siblings} values={siblings} onChange={setSiblings} placeholder={numbered(t.memberForm.siblings)} />
      </SectionCard>

      <SectionCard
        title={t.memberForm.contacts}
        description={t.memberForm.contactsHelp}
        icon={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden />}
        bodyClassName="space-y-6"
      >
        <ContactListField label={t.memberForm.witnesses} values={witnesses} onChange={setWitnesses} />
        <ContactListField label={t.memberForm.nextOfKin} values={nextOfKin} onChange={setNextOfKin} />
      </SectionCard>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/admin/members"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {t.common.cancel}
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="btn-shimmer inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 text-lg font-bold text-primary-foreground disabled:opacity-60"
        >
          <Save className="h-5 w-5" aria-hidden />
          {loading ? t.memberForm.saving : t.memberForm.save}
        </button>
      </div>
    </form>
  );
}
