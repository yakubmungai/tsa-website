'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { revokeDelegation } from '@/features/delegation/actions';

export function RevokeHelperButton({
  delegationId,
  name,
}: {
  delegationId: string;
  name: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    setLoading(true);
    try {
      const res = await revokeDelegation({ delegationId });
      if (res.success) {
        toast.success(`${name} can no longer see your account.`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('Could not remove access. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 border-rose-200 text-rose-700 hover:bg-rose-50">
          Mwondoe / Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="font-sans">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-slate-600">
            Hataweza kuona akaunti yako tena, mara moja.
            <span className="mt-1 block text-slate-500">
              They will lose access straight away. You can add them again later.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Ghairi / Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRevoke();
            }}
            disabled={loading}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            {loading ? '...' : 'Mwondoe / Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
