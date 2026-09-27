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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Archive } from 'lucide-react';
import { archiveMember } from '@/features/membership/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { toast } from 'sonner';

interface ArchiveMemberProps {
  memberId: string;
  memberNames: string;
}

export function AdminDeleteMember({ memberId, memberNames }: ArchiveMemberProps) {
  const t = usePortalStrings();
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
        toast.success(t.memberForm.archived(memberNames));
        setOpen(false);
        router.push('/admin/members');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.memberForm.archiveFailed);
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
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-warning/40 bg-card px-4 text-base font-semibold text-warning transition-colors hover:bg-warning/10"
        >
          <Archive className="h-5 w-5" aria-hidden />
          {t.memberForm.archiveButton}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl font-sans sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-2xl font-bold text-foreground">
            {t.memberForm.archiveTitle(memberNames)}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-base text-muted-foreground">
            <span className="block">{t.memberForm.archiveBody}</span>
            <span className="block">{t.memberForm.archiveKept}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-name" className="text-base text-foreground">
            {t.memberForm.archiveConfirm}{' '}
            <strong className="font-bold">{memberNames}</strong>
          </Label>
          <Input
            id="confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={memberNames}
            autoComplete="off"
            disabled={loading}
            className="h-12 text-base"
          />
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} className="min-h-12 rounded-xl px-5 text-base font-semibold">
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleArchive();
            }}
            disabled={loading || !nameMatches}
            className="min-h-12 rounded-xl bg-warning px-5 text-base font-bold text-warning-foreground hover:bg-warning/90 disabled:opacity-50"
          >
            {loading ? t.memberForm.archiving : t.memberForm.archiveSubmit}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
