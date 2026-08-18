'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { RotateCcw } from 'lucide-react';
import { resetDemoData } from '@/features/demo/actions';

export function DemoReset() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await resetDemoData({ confirm: 'RESET' });
      if (res.success) {
        toast.success(
          `Demo data reset: ${res.data.members} members, ${res.data.transactions} ledger entries.`
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50">
          <RotateCcw className="h-4 w-4" />
          Rudisha data ya majaribio / Reset demo data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="font-sans">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the demo data?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-slate-600">
            <span className="block">
              Every demo member, transaction and change made while testing will be
              deleted and rebuilt from scratch.
            </span>
            <span className="block font-medium text-slate-800">
              Kila kitu kilichobadilishwa wakati wa majaribio kitafutwa na kuanza upya.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? 'Resetting...' : 'Reset'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
