'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, User, Phone, MapPin, Users, ShieldCheck, Heart } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMember } from '@/features/membership/admin-actions';
import { toast } from 'sonner';

export default function NewMemberPage() {
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
  const [witnesses, setWitnesses] = useState<{ name: string; phone: string }[]>([{ name: '', phone: '' }]);
  const [nextOfKin, setNextOfKin] = useState<{ name: string; phone: string }[]>([{ name: '', phone: '' }]);

  // Handlers for List fields
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

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.trim()) {
      toast.error('Please enter the member\'s full name.');
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
      if (res.success && res.memberId) {
        toast.success('Member created successfully!');
        router.push(`/admin/members/${res.memberId}`);
      } else {
        toast.error(res.error || 'Failed to create member.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-4xl w-full mx-auto pt-28 pb-12 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button */}
        <div>
          <Button asChild variant="ghost" size="sm" className="hover:bg-slate-100 font-semibold text-xs">
            <Link href="/admin/members">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Member Directory
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Add New Member</h1>
          <p className="text-slate-500 text-sm">
            Create a new profile record for the Tanzania Sharing Association database.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Basic Information */}
          <Card className="shadow-sm border border-slate-100 bg-white">
            <CardHeader className="border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <User className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Personal Information</CardTitle>
              </div>
              <CardDescription>Primary profile data for directory and searches</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="names">Full Name <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="names"
                    placeholder="e.g. John Doe"
                    value={names}
                    onChange={(e) => setNames(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    placeholder="e.g. 563-210-1022"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address"
                  placeholder="e.g. 123 Emerald St, Des Moines, IA 50311"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Spouse & Family */}
          <Card className="shadow-sm border border-slate-100 bg-white">
            <CardHeader className="border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Heart className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Spouse & Family Relations</CardTitle>
              </div>
              <CardDescription>Family connections and references</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Spouse info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-2">
                  <Label htmlFor="spouse">Spouse Name (Husband/Wife)</Label>
                  <Input 
                    id="spouse"
                    placeholder="e.g. Jane Doe"
                    value={husbandWife}
                    onChange={(e) => setHusbandWife(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spousePhone">Spouse Phone Number</Label>
                  <Input 
                    id="spousePhone"
                    placeholder="e.g. 563-210-9988"
                    value={spousePhone}
                    onChange={(e) => setSpousePhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Parents list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-800 font-semibold">Parents (Father / Mother)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddParent} className="h-8 gap-1 text-xs border-dashed">
                    <Plus className="h-3 w-3" /> Add Parent
                  </Button>
                </div>
                <div className="space-y-2">
                  {parents.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input 
                        placeholder={`Parent ${idx + 1} Name`}
                        value={p}
                        onChange={(e) => handleParentChange(e.target.value, idx)}
                      />
                      {parents.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveParent(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Children list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-800 font-semibold">Children</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddChild} className="h-8 gap-1 text-xs border-dashed">
                    <Plus className="h-3 w-3" /> Add Child
                  </Button>
                </div>
                <div className="space-y-2">
                  {children.map((c, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input 
                        placeholder={`Child ${idx + 1} Name`}
                        value={c}
                        onChange={(e) => handleChildChange(e.target.value, idx)}
                      />
                      {children.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveChild(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Siblings list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-800 font-semibold">Siblings (Brothers / Sisters)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSibling} className="h-8 gap-1 text-xs border-dashed">
                    <Plus className="h-3 w-3" /> Add Sibling
                  </Button>
                </div>
                <div className="space-y-2">
                  {siblings.map((s, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input 
                        placeholder={`Sibling ${idx + 1} Name`}
                        value={s}
                        onChange={(e) => handleSiblingChange(e.target.value, idx)}
                      />
                      {siblings.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSibling(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Witnesses & Next of Kin */}
          <Card className="shadow-sm border border-slate-100 bg-white">
            <CardHeader className="border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Witnesses & Next of Kin</CardTitle>
              </div>
              <CardDescription>Emergency contacts and registered referees</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Witnesses list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-800 font-semibold">Witnesses / Referees</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddWitness} className="h-8 gap-1 text-xs border-dashed">
                    <Plus className="h-3 w-3" /> Add Witness
                  </Button>
                </div>
                <div className="space-y-3">
                  {witnesses.map((w, idx) => (
                    <div key={idx} className="flex gap-2 items-start md:items-center">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-grow">
                        <Input 
                          placeholder="Witness Name"
                          value={w.name}
                          onChange={(e) => handleWitnessChange('name', e.target.value, idx)}
                        />
                        <Input 
                          placeholder="Witness Phone"
                          value={w.phone}
                          onChange={(e) => handleWitnessChange('phone', e.target.value, idx)}
                        />
                      </div>
                      {witnesses.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveWitness(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 mt-1 md:mt-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Next of Kin list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-800 font-semibold">Next of Kin / Funeral Supervisors</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddNextOfKin} className="h-8 gap-1 text-xs border-dashed">
                    <Plus className="h-3 w-3" /> Add Next of Kin
                  </Button>
                </div>
                <div className="space-y-3">
                  {nextOfKin.map((n, idx) => (
                    <div key={idx} className="flex gap-2 items-start md:items-center">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-grow">
                        <Input 
                          placeholder="Next of Kin Name"
                          value={n.name}
                          onChange={(e) => handleNextOfKinChange('name', e.target.value, idx)}
                        />
                        <Input 
                          placeholder="Next of Kin Phone"
                          value={n.phone}
                          onChange={(e) => handleNextOfKinChange('phone', e.target.value, idx)}
                        />
                      </div>
                      {nextOfKin.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveNextOfKin(idx)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 mt-1 md:mt-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button asChild variant="outline" className="border-slate-200">
              <Link href="/admin/members">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium px-6">
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Save Member'}
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
