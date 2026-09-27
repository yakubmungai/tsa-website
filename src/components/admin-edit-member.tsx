'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Plus, Trash2, Save } from 'lucide-react';
import { updateMemberDetails } from '@/features/membership/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { toast } from 'sonner';

export interface Contact {
  name: string;
  phone: string;
}

const INPUT = 'h-12 text-base';

/** Section heading inside the member form. */
export function MemberFormHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-lg font-bold text-foreground">{children}</h3>;
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-dashed border-border px-3 text-base font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5"
    >
      <Plus className="h-5 w-5" aria-hidden />
      {label}
    </button>
  );
}

function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
    >
      <Trash2 className="h-5 w-5" aria-hidden />
    </button>
  );
}

/** A growable list of names (parents, children, siblings). Always keeps one row. */
export function StringListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: (index: number) => string;
}) {
  const t = usePortalStrings();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-semibold text-foreground">{label}</Label>
        <AddRowButton onClick={() => onChange([...values, ''])} label={t.memberForm.add} />
      </div>
      {values.map((value, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(values.map((v, i) => (i === idx ? e.target.value : v)))}
            placeholder={placeholder(idx)}
            aria-label={`${label} ${idx + 1}`}
            className={INPUT}
          />
          {values.length > 1 && (
            <RemoveRowButton
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              label={t.memberForm.remove}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** A growable list of name + phone pairs (witnesses, next of kin). Always keeps one row. */
export function ContactListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: Contact[];
  onChange: (next: Contact[]) => void;
}) {
  const t = usePortalStrings();
  const change = (idx: number, field: keyof Contact, val: string) =>
    onChange(values.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-semibold text-foreground">{label}</Label>
        <AddRowButton onClick={() => onChange([...values, { name: '', phone: '' }])} label={t.memberForm.add} />
      </div>
      {values.map((c, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="grid flex-grow grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={c.name}
              onChange={(e) => change(idx, 'name', e.target.value)}
              placeholder={t.memberForm.name}
              aria-label={`${label} ${idx + 1}: ${t.memberForm.name}`}
              className={INPUT}
            />
            <Input
              value={c.phone}
              onChange={(e) => change(idx, 'phone', e.target.value)}
              placeholder={t.memberForm.phone}
              aria-label={`${label} ${idx + 1}: ${t.memberForm.phone}`}
              inputMode="tel"
              className={INPUT}
            />
          </div>
          {values.length > 1 && (
            <RemoveRowButton
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              label={t.memberForm.remove}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface EditMemberProps {
  member: {
    id: string;
    names: string;
    phone: string | null;
    address: string | null;
    husbandWife: string | null;
    spousePhone: string | null;
    parents: string[];
    children: string[];
    siblings: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    witnesses: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nextOfKin: any;
  };
}

export function AdminEditMember({ member }: EditMemberProps) {
  const t = usePortalStrings();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [names, setNames] = useState(member.names);
  const [phone, setPhone] = useState(member.phone || '');
  const [address, setAddress] = useState(member.address || '');
  const [husbandWife, setHusbandWife] = useState(member.husbandWife || '');
  const [spousePhone, setSpousePhone] = useState(member.spousePhone || '');

  // Lists states (parse JSON or fallback)
  const initialWitnesses = Array.isArray(member.witnesses) ? member.witnesses : [];
  const initialNextOfKin = Array.isArray(member.nextOfKin) ? member.nextOfKin : [];

  const [parents, setParents] = useState<string[]>(member.parents.length > 0 ? member.parents : ['']);
  const [children, setChildren] = useState<string[]>(member.children.length > 0 ? member.children : ['']);
  const [siblings, setSiblings] = useState<string[]>(member.siblings.length > 0 ? member.siblings : ['']);
  const [witnesses, setWitnesses] = useState<Contact[]>(
    initialWitnesses.length > 0 ? initialWitnesses : [{ name: '', phone: '' }]
  );
  const [nextOfKin, setNextOfKin] = useState<Contact[]>(
    initialNextOfKin.length > 0 ? initialNextOfKin : [{ name: '', phone: '' }]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.trim()) {
      toast.error(t.memberForm.nameRequired);
      return;
    }

    setLoading(true);
    try {
      const res = await updateMemberDetails({
        memberId: member.id,
        names,
        phone,
        address,
        husbandWife,
        spousePhone,
        parents: parents.filter(p => p.trim() !== ''),
        children: children.filter(c => c.trim() !== ''),
        siblings: siblings.filter(s => s.trim() !== ''),
        witnesses: witnesses.filter(w => w.name.trim() !== ''),
        nextOfKin: nextOfKin.filter(n => n.name.trim() !== ''),
      });

      if (res.success) {
        toast.success(t.memberForm.updated);
        setOpen(false);
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

  const labelClass = 'text-base font-semibold text-foreground';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 text-base font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Edit className="h-5 w-5" aria-hidden />
          {t.memberForm.editButton}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto bg-background font-sans sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 pb-4 text-left">
          <SheetTitle className="font-serif text-2xl font-bold text-foreground">{t.memberForm.editTitle}</SheetTitle>
          <SheetDescription className="text-base">{t.memberForm.editBody(member.names)}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-8 py-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <MemberFormHeading>{t.memberForm.personal}</MemberFormHeading>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-names" className={labelClass}>{t.memberForm.fullName}</Label>
                <Input id="edit-names" value={names} onChange={(e) => setNames(e.target.value)} className={INPUT} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className={labelClass}>{t.memberForm.phone}</Label>
                <Input id="edit-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address" className={labelClass}>{t.memberForm.address}</Label>
              <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Spouse Details */}
          <div className="space-y-4 border-t border-border/60 pt-6">
            <MemberFormHeading>{t.memberForm.family}</MemberFormHeading>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-spouse" className={labelClass}>{t.memberForm.spouse}</Label>
                <Input id="edit-spouse" value={husbandWife} onChange={(e) => setHusbandWife(e.target.value)} className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-spousePhone" className={labelClass}>{t.memberForm.spousePhone}</Label>
                <Input id="edit-spousePhone" inputMode="tel" value={spousePhone} onChange={(e) => setSpousePhone(e.target.value)} className={INPUT} />
              </div>
            </div>

            <StringListField label={t.memberForm.parents} values={parents} onChange={setParents} placeholder={() => t.memberForm.name} />
            <StringListField label={t.memberForm.children} values={children} onChange={setChildren} placeholder={() => t.memberForm.name} />
            <StringListField label={t.memberForm.siblings} values={siblings} onChange={setSiblings} placeholder={() => t.memberForm.name} />
          </div>

          {/* Witnesses & Next of Kin */}
          <div className="space-y-4 border-t border-border/60 pt-6">
            <MemberFormHeading>{t.memberForm.contacts}</MemberFormHeading>
            <ContactListField label={t.memberForm.witnesses} values={witnesses} onChange={setWitnesses} />
            <ContactListField label={t.memberForm.nextOfKin} values={nextOfKin} onChange={setNextOfKin} />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-shimmer inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-lg font-bold text-primary-foreground disabled:opacity-60"
            >
              <Save className="h-5 w-5" aria-hidden />
              {loading ? t.memberForm.saving : t.memberForm.saveChanges}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
