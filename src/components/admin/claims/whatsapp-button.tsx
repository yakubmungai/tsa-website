'use client';

import { useState } from 'react';
import { createPayLink } from '@/features/payments/admin-actions';
import { Check, Copy, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { cn } from '@/lib/utils';

/** Stands in for a member's personal pay link until the message is opened. */
export const PAY_LINK_PLACEHOLDER = '{{PAY_LINK}}';

/** Swap the placeholder for a freshly made pay link for this member. */
export async function withPayLink(message: string, memberId?: string): Promise<string> {
  if (!memberId || !message.includes(PAY_LINK_PLACEHOLDER)) return message;
  const res = await createPayLink({ memberId });
  return message.replace(PAY_LINK_PLACEHOLDER, res.success ? res.data.url : '');
}

/**
 * A ready-written WhatsApp message: shown in a dialog to check and copy, with
 * a button that opens WhatsApp with it filled in (to one member, or to choose
 * a chat such as the TSA group).
 *
 * In the leaders' test environment the "open" link is withheld: the demo
 * members' numbers are invented, and a real stranger might own one.
 */
export function WhatsAppButton({
  message: template,
  phoneE164,
  label,
  demo,
  variant = 'outline',
  payLinkFor,
}: {
  message: string;
  phoneE164?: string | null;
  label: string;
  demo: boolean;
  variant?: 'outline' | 'primary';
  /** Member whose personal pay link goes into the message, made on open. */
  payLinkFor?: string;
}) {
  const t = usePortalStrings();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(template.replace(PAY_LINK_PLACEHOLDER, '…'));
  const url = phoneE164
    ? `https://wa.me/${phoneE164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the text is selectable.
    }
  }

  return (
    <Dialog
      onOpenChange={async (open) => {
        if (open) setMessage(await withPayLink(template, payLinkFor));
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold',
            variant === 'primary'
              ? 'btn-shimmer min-h-12 rounded-xl px-5 text-base text-primary-foreground'
              : 'border border-border text-foreground hover:bg-muted'
          )}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t.adminClaims.message}</DialogTitle>
          {demo ? (
            <DialogDescription className="text-base">
              Majaribio: ujumbe hautumwi. / Test mode: the message is not sent.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 font-sans text-base">{message}</pre>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border text-base font-semibold hover:bg-muted"
          >
            {copied ? <Check className="h-5 w-5 text-success" aria-hidden /> : <Copy className="h-5 w-5" aria-hidden />}
            {copied ? t.common.copied : t.adminClaims.copyMessage}
          </button>
          {!demo ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shimmer inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl text-base font-bold text-primary-foreground"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              {t.adminClaims.openWhatsapp}
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
