'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
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
  const t = usePortalStrings().demo.reset;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await resetDemoData({ confirm: 'RESET' });
      if (res.success) {
        toast.success(t.done(res.data.members, res.data.ledgerEntries));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-auto min-h-12 w-full gap-2 whitespace-normal border-2 border-warning/50 py-2 text-base font-semibold text-foreground hover:bg-warning/10">
          <RotateCcw className="h-4 w-4" />
          {t.button}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="font-sans">
        <AlertDialogHeader>
          <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-base text-muted-foreground">
            <span className="block">{t.confirmBody}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            disabled={loading}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {loading ? t.resetting : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
