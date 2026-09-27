'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Eye, MessageCircle, PenLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/components/portal/section-card';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { cn } from '@/lib/utils';
import {
  composeBroadcast,
  messageWarnings,
  whatsappShareUrl,
  type BroadcastKind,
} from '@/features/broadcast/templates';

const KINDS: BroadcastKind[] = ['MSIBA', 'PAYMENT_REMINDER', 'MONTHLY_STATEMENT', 'GENERAL'];

export function BroadcastComposer({ siteUrl }: { siteUrl: string }) {
  const t = usePortalStrings();
  const [kind, setKind] = useState<BroadcastKind>('MSIBA');
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const message = useMemo(
    () => composeBroadcast({ kind, ...fields }),
    [kind, fields]
  );
  const warnings = useMemo(() => messageWarnings(message), [message]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t.broadcast.copied);
    } catch {
      toast.error(t.broadcast.copyFailed);
    }
  };

  const labelClass = 'text-base font-semibold text-foreground';

  const field = (key: string, label: string, placeholder = '') => (
    <div className="space-y-2">
      <Label htmlFor={key} className={labelClass}>
        {label}
      </Label>
      <Input
        id={key}
        value={fields[key] ?? ''}
        onChange={set(key)}
        placeholder={placeholder}
        className="h-12 text-base"
      />
    </div>
  );

  const f = t.broadcast.fields;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title={t.broadcast.composeTitle}
        description={t.broadcast.composeBody}
        icon={<PenLine className="h-5 w-5 text-primary" aria-hidden />}
        bodyClassName="space-y-5"
      >
        <fieldset className="space-y-2">
          <legend className="mb-1 text-base font-semibold text-foreground">{t.broadcast.kindLabel}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {KINDS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                aria-pressed={kind === option}
                className={cn(
                  'min-h-12 rounded-xl border-2 px-4 py-2 text-left text-base font-semibold transition-colors',
                  kind === option
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-primary/60'
                )}
              >
                {t.broadcast.kinds[option]}
              </button>
            ))}
          </div>
        </fieldset>

        {kind === 'MSIBA' && (
          <>
            {field('subjectName', f.subjectName)}
            {field('relation', f.relation, t.broadcast.relationPlaceholder)}
            {field('memberName', f.memberName)}
            {field('amount', f.share, '$19.48')}
            {field('deadline', f.deadline, t.broadcast.deadlinePlaceholder)}
            {field('burialLocation', f.burialLocation)}
            {field('burialDate', f.burialDate)}
          </>
        )}

        {kind === 'PAYMENT_REMINDER' && (
          <>
            {field('amount', f.amount, '$25.00')}
            {field('deadline', f.deadline)}
          </>
        )}

        {kind === 'GENERAL' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bodySw" className={labelClass}>
                {f.bodySw}
              </Label>
              <Textarea id="bodySw" value={fields.bodySw ?? ''} onChange={set('bodySw')} rows={4} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bodyEn" className={labelClass}>
                {f.bodyEn}
              </Label>
              <Textarea id="bodyEn" value={fields.bodyEn ?? ''} onChange={set('bodyEn')} rows={4} className="text-base" />
            </div>
          </>
        )}

        {field('link', f.link, `${siteUrl}/portal`)}
      </SectionCard>

      <SectionCard
        title={t.broadcast.previewTitle}
        description={t.broadcast.previewBody(message.length)}
        icon={<Eye className="h-5 w-5 text-primary" aria-hidden />}
        bodyClassName="space-y-4"
      >
        {warnings.length > 0 && (
          <div className="space-y-2 rounded-2xl border-2 border-warning/40 bg-warning/10 p-4">
            {warnings.map((warning) => (
              <p key={warning} className="flex gap-2 text-base text-foreground">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                {warning}
              </p>
            ))}
          </div>
        )}

        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/60 bg-muted p-4 font-sans text-base leading-relaxed text-foreground">
          {message}
        </pre>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-shimmer inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold text-primary-foreground"
          >
            <Copy className="h-5 w-5" aria-hidden />
            {t.broadcast.copy}
          </button>
          <a
            href={whatsappShareUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 text-lg font-bold text-primary transition-colors hover:bg-primary/5"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            {t.broadcast.openWhatsapp}
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
