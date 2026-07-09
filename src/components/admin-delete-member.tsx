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
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteMember } from '@/features/membership/admin-actions';
import { toast } from 'sonner';

interface DeleteMemberProps {
  memberId: string;
  memberNames: string;
}

export function AdminDeleteMember({ memberId, memberNames }: DeleteMemberProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteMember(memberId);
      if (res.success) {
        toast.success('Member successfully deleted.');
        router.push('/admin/members');
      } else {
        toast.error(res.error || 'Failed to delete member.');
      }
    } catch (err) {
      toast.error('An error occurred during deletion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="font-semibold text-xs text-rose-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700 gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Profile
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="font-sans">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-slate-900">Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500">
            This action cannot be undone. It will permanently delete the profile of <strong className="text-slate-800">{memberNames}</strong> and remove all their transaction and financial history from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
