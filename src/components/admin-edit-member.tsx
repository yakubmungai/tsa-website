'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Plus, Trash2, Save } from 'lucide-react';
import { updateMemberDetails } from '@/features/membership/admin-actions';
import { toast } from 'sonner';

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
    witnesses: any;
    nextOfKin: any;
  };
}

export function AdminEditMember({ member }: EditMemberProps) {
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
  const [witnesses, setWitnesses] = useState<{ name: string; phone: string }[]>(
    initialWitnesses.length > 0 ? initialWitnesses : [{ name: '', phone: '' }]
  );
  const [nextOfKin, setNextOfKin] = useState<{ name: string; phone: string }[]>(
    initialNextOfKin.length > 0 ? initialNextOfKin : [{ name: '', phone: '' }]
  );

  // Dynamic lists handlers
  const handleAddParent = () => setParents([...parents, '']);
  const handleRemoveParent = (idx: number) => setParents(parents.filter((_, i) => i !== idx));
  const handleParentChange = (val: string, idx: number) => {
    const updated = [...parents];
    updated[idx] = val;
    setParents(updated);
  };

  const handleAddChild = () => setChildren([...children, '']);
  const handleRemoveChild = (idx: number) => setChildren(children.filter((_, i) => i !== idx));
  const handleChildChange = (val: string, idx: number) => {
    const updated = [...children];
    updated[idx] = val;
    setChildren(updated);
  };

  const handleAddSibling = () => setSiblings([...siblings, '']);
  const handleRemoveSibling = (idx: number) => setSiblings(siblings.filter((_, i) => i !== idx));
  const handleSiblingChange = (val: string, idx: number) => {
    const updated = [...siblings];
    updated[idx] = val;
    setSiblings(updated);
  };

  const handleAddWitness = () => setWitnesses([...witnesses, { name: '', phone: '' }]);
  const handleRemoveWitness = (idx: number) => setWitnesses(witnesses.filter((_, i) => i !== idx));
  const handleWitnessChange = (field: 'name' | 'phone', val: string, idx: number) => {
    const updated = [...witnesses];
    updated[idx][field] = val;
    setWitnesses(updated);
  };

  const handleAddNextOfKin = () => setNextOfKin([...nextOfKin, { name: '', phone: '' }]);
  const handleRemoveNextOfKin = (idx: number) => setNextOfKin(nextOfKin.filter((_, i) => i !== idx));
  const handleNextOfKinChange = (field: 'name' | 'phone', val: string, idx: number) => {
    const updated = [...nextOfKin];
    updated[idx][field] = val;
    setNextOfKin(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.trim()) {
      toast.error('Please enter the full name.');
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
        parents: parents.filter(p => p.trim() !== ''),
        children: children.filter(c => c.trim() !== ''),
        siblings: siblings.filter(s => s.trim() !== ''),
        witnesses: witnesses.filter(w => w.name.trim() !== ''),
        nextOfKin: nextOfKin.filter(n => n.name.trim() !== ''),
      };

      const res = await updateMemberDetails(member.id, payload);
      if (res.success) {
        toast.success('Profile details updated!');
        setOpen(false);
      } else {
        toast.error(res.error || 'Failed to update details.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="font-semibold text-xs border-slate-200 gap-1.5">
          <Edit className="h-3.5 w-3.5" />
          Edit Profile
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto font-sans">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-xl font-bold text-slate-900">Edit Member Profile</SheetTitle>
          <SheetDescription>Update database details for {member.names}.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="py-6 space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-names">Full Name</Label>
                <Input id="edit-names" value={names} onChange={(e) => setNames(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Spouse Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Spouse & Family</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-spouse">Spouse Name</Label>
                <Input id="edit-spouse" value={husbandWife} onChange={(e) => setHusbandWife(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-spousePhone">Spouse Phone</Label>
                <Input id="edit-spousePhone" value={spousePhone} onChange={(e) => setSpousePhone(e.target.value)} />
              </div>
            </div>

            {/* Parents List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Parents</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddParent} className="h-7 text-xs px-2 gap-1 border-dashed">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {parents.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={p} onChange={(e) => handleParentChange(e.target.value, idx)} placeholder="Parent Name" />
                  {parents.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveParent(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Children List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Children</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddChild} className="h-7 text-xs px-2 gap-1 border-dashed">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {children.map((c, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={c} onChange={(e) => handleChildChange(e.target.value, idx)} placeholder="Child Name" />
                  {children.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveChild(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Siblings List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Siblings</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddSibling} className="h-7 text-xs px-2 gap-1 border-dashed">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {siblings.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={s} onChange={(e) => handleSiblingChange(e.target.value, idx)} placeholder="Sibling Name" />
                  {siblings.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSibling(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Witnesses & Next of Kin */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Witnesses & Next of Kin</h3>

            {/* Witnesses */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Witnesses / Referees</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddWitness} className="h-7 text-xs px-2 gap-1 border-dashed">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {witnesses.map((w, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={w.name} onChange={(e) => handleWitnessChange('name', e.target.value, idx)} placeholder="Witness Name" />
                  <Input value={w.phone} onChange={(e) => handleWitnessChange('phone', e.target.value, idx)} placeholder="Phone" />
                  {witnesses.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveWitness(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Next of Kin */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Next of Kin / Funeral Supervisors</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddNextOfKin} className="h-7 text-xs px-2 gap-1 border-dashed">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {nextOfKin.map((n, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={n.name} onChange={(e) => handleNextOfKinChange('name', e.target.value, idx)} placeholder="Next of Kin Name" />
                  <Input value={n.phone} onChange={(e) => handleNextOfKinChange('phone', e.target.value, idx)} placeholder="Phone" />
                  {nextOfKin.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveNextOfKin(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
