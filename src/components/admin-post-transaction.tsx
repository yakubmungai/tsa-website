'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { postTransaction } from '@/features/membership/admin-actions';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';

export function AdminPostTransaction({ memberId }: { memberId: string }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'ADVANCE' | 'REGISTRATION' | 'MEMBERSHIP' | 'OTHER'>('ADVANCE');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await postTransaction({
        memberId,
        amount: Number(amount),
        type,
        description: description.trim() || `${type} Transaction`
      });

      if (res.success) {
        toast.success('Transaction posted successfully!');
        setAmount('');
        setDescription('');
        setOpen(false);
      } else {
        toast.error(res.error || 'Failed to post transaction.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4 text-emerald-600" />
          Log New Transaction
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold"
        >
          {open ? 'Hide Form' : 'Show Form'}
        </Button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold text-slate-600">Amount ($)</Label>
              <Input 
                id="amount"
                type="text" 
                placeholder="e.g. 50 or -25"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
              />
              <span className="text-[10px] text-slate-400 block">
                Use negative sign (-) for dues/fees (e.g. -25).
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs font-semibold text-slate-600 font-mono">Category</Label>
              <Select 
                value={type} 
                onValueChange={(val: any) => setType(val)}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVANCE">Advance Credit</SelectItem>
                  <SelectItem value="REGISTRATION">Registration Fee</SelectItem>
                  <SelectItem value="MEMBERSHIP">Membership Dues</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs font-semibold text-slate-600">Memo / Description</Label>
            <Textarea 
              id="desc"
              placeholder="e.g. Annual membership fee 2025"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="h-16 text-xs resize-none"
            />
          </div>

          <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2" disabled={loading}>
            {loading ? 'Posting...' : 'Post Transaction'}
          </Button>
        </form>
      )}
    </div>
  );
}
