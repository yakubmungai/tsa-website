'use client';

import { LifeBuoy, MessageCircle, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TSA_HELP_PHONE_DISPLAY, TSA_HELP_PHONE_E164 } from '@/lib/finance/constants';
import { usePortalStrings } from './use-portal-strings';

/** "I need help" — on every step of every member flow, so there is no dead end. */
export function HelpButton({ context }: { context?: string }) {
  const t = usePortalStrings();
  const wa = `https://wa.me/${TSA_HELP_PHONE_E164.replace('+', '')}${
    context ? `?text=${encodeURIComponent(context)}` : ''
  }`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 text-base font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <LifeBuoy className="h-5 w-5 text-primary" aria-hidden />
          {t.help.button}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t.help.title}</DialogTitle>
          <DialogDescription className="text-base">{t.help.body}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <a
            href={`tel:${TSA_HELP_PHONE_E164}`}
            className="btn-shimmer inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold text-primary-foreground"
          >
            <Phone className="h-5 w-5" aria-hidden />
            {t.help.call} · {TSA_HELP_PHONE_DISPLAY}
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-bold text-primary transition-colors hover:bg-primary/5"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            {t.help.whatsapp}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
