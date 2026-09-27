'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Archive } from 'lucide-react';
import { archiveMember } from '@/features/membership/admin-actions';
import { toast } from 'sonner';

interface ArchiveMemberProps {
  memberId: string;
  memberNames: string;
}

export function AdminDeleteMember({ memberId, memberNames }: ArchiveMemberProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [open, setOpen] = useState(false);

  const normalise = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const nameMatches = normalise(confirmName) === normalise(memberNames);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const res = await archiveMember({ memberId, confirmName });
      if (res.success) {
        toast.success(`${memberNames} has been archived.`);
        setOpen(false);
        router.push('/admin/members');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('An error occurred while archiving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmName('');
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-semibold text-xs text-amber-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 gap-1.5"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive Profile
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="font-sans">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-slate-900">
            Archive {memberNames}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 space-y-2">
            <span className="block">
              They will be hidden from the member directory and their login will be
              removed.
            </span>
            <span className="block">
              Their transaction and financial history is <strong>kept</strong>, as the
              constitution requires, and an administrator can restore them later.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-name" className="text-sm text-slate-700">
            Type <strong className="text-slate-900">{memberNames}</strong> to confirm
          </Label>
          <Input
            id="confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={memberNames}
            autoComplete="off"
            disabled={loading}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleArchive();
            }}
            disabled={loading || !nameMatches}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Archiving...' : 'Archive Member'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
