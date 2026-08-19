'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, MessageCircle, AlertTriangle } from 'lucide-react';
import {
  composeBroadcast,
  messageWarnings,
  whatsappShareUrl,
  type BroadcastKind,
} from '@/features/broadcast/templates';

const KINDS: { value: BroadcastKind; sw: string; en: string }[] = [
  { value: 'MSIBA', sw: 'Taarifa ya msiba', en: 'Bereavement notice' },
  { value: 'PAYMENT_REMINDER', sw: 'Ukumbusho wa malipo', en: 'Payment reminder' },
  { value: 'MONTHLY_STATEMENT', sw: 'Taarifa ya mwezi', en: 'Monthly statement' },
  { value: 'GENERAL', sw: 'Taarifa ya kawaida', en: 'General announcement' },
];

export function BroadcastComposer({ siteUrl }: { siteUrl: string }) {
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
      toast.success('Copied. Paste it into the TSA WhatsApp group.');
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  };

  const field = (key: string, sw: string, en: string, placeholder = '') => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-sm font-semibold text-slate-700">
        {sw} <span className="font-normal text-slate-500">{en}</span>
      </Label>
      <Input
        id={key}
        value={fields[key] ?? ''}
        onChange={set(key)}
        placeholder={placeholder}
        className="h-11 text-base"
      />
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Andaa ujumbe / Compose</CardTitle>
          <CardDescription>
            Nothing is sent from here. You copy the message and paste it into the group
            yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={kind === option.value ? 'default' : 'outline'}
                onClick={() => setKind(option.value)}
                className={`h-auto justify-start px-3 py-2 text-left ${
                  kind === option.value ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{option.sw}</span>
                  <span className="text-xs font-normal opacity-80">{option.en}</span>
                </span>
              </Button>
            ))}
          </div>

          {kind === 'MSIBA' && (
            <>
              {field('subjectName', 'Jina la marehemu', 'Name of the deceased')}
              {field('relation', 'Uhusiano', 'Relation', 'baba / father')}
              {field('memberName', 'Mwanachama', 'Member')}
              {field('amount', 'Mchango wa kila mmoja', "Each member's share", '$19.48')}
              {field('deadline', 'Tarehe ya mwisho', 'Deadline', '3 September')}
              {field('burialLocation', 'Mahali pa mazishi', 'Burial location')}
              {field('burialDate', 'Tarehe ya mazishi', 'Burial date')}
            </>
          )}

          {kind === 'PAYMENT_REMINDER' && (
            <>
              {field('amount', 'Kiasi', 'Amount', '$25.00')}
              {field('deadline', 'Tarehe ya mwisho', 'Deadline')}
            </>
          )}

          {kind === 'GENERAL' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bodySw" className="text-sm font-semibold text-slate-700">
                  Ujumbe kwa Kiswahili <span className="font-normal text-slate-500">Swahili</span>
                </Label>
                <Textarea id="bodySw" value={fields.bodySw ?? ''} onChange={set('bodySw')} rows={4} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bodyEn" className="text-sm font-semibold text-slate-700">
                  Ujumbe kwa Kiingereza <span className="font-normal text-slate-500">English</span>
                </Label>
                <Textarea id="bodyEn" value={fields.bodyEn ?? ''} onChange={set('bodyEn')} rows={4} />
              </div>
            </>
          )}

          {field('link', 'Kiungo', 'Link', `${siteUrl}/portal`)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hakiki / Preview</CardTitle>
          <CardDescription>
            {message.length} characters. Swahili first, English below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              {warnings.map((warning) => (
                <p key={warning} className="flex gap-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {warning}
                </p>
              ))}
            </div>
          )}

          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 font-sans text-sm leading-relaxed text-slate-100">
            {message}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleCopy}
              className="h-12 flex-1 gap-2 bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
            >
              <Copy className="h-4 w-4" />
              Nakili / Copy
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 gap-2 text-base font-semibold">
              <a href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Fungua WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
