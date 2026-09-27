'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserMinus } from 'lucide-react';
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
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { revokeDelegation } from '@/features/delegation/actions';

export function RevokeHelperButton({
  delegationId,
  name,
}: {
  delegationId: string;
  name: string;
}) {
  const t = usePortalStrings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    setLoading(true);
    try {
      const res = await revokeDelegation({ delegationId });
      if (res.success) {
        toast.success(t.helpers.removed(name));
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.helpers.removeFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-destructive/40 bg-card px-4 text-base font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <UserMinus className="h-5 w-5" aria-hidden />
          {t.helpers.remove}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl font-sans sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-2xl">{t.helpers.removeTitle(name)}</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-muted-foreground">
            {t.helpers.removeBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} className="min-h-12 rounded-xl px-5 text-base font-semibold">
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRevoke();
            }}
            disabled={loading}
            className="min-h-12 rounded-xl bg-destructive px-5 text-base font-bold text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? t.common.loading : t.helpers.remove}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
