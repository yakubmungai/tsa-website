import { CheckCircle2, HandCoins, Upload } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { orgIsoDate } from '@/lib/finance/dates';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { MoneyAmount } from '@/components/portal/money';
import { BankUpload } from '@/components/admin/payments/bank-upload';
import { PaymentQueue, type QueueBankRow, type QueuePayment } from '@/components/admin/payments/payment-queue';
import { RecordPaymentForm } from '@/components/admin/payments/record-payment-form';

/**
 * The Treasurer's desk: upload the bank file, confirm what matched in one
 * click, and decide the rest. Replaces checking WhatsApp screenshots against
 * the bank app by hand.
 */
export default async function AdminPaymentsPage() {
  await requireAdmin();
  const [t, locale, asOf] = await Promise.all([getPortalStrings(), getLocale(), now()]);
  const fmt = new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', { dateStyle: 'medium', timeZone: 'America/Chicago' });

  const [open, bankRows, members, recent] = await Promise.all([
    db.payment.findMany({
      where: { status: { in: ['REPORTED', 'MATCHED'] } },
      include: { member: { select: { names: true } }, bankTransaction: true },
      orderBy: { paidOn: 'asc' },
    }),
    db.bankTransaction.findMany({
      where: { matchedPaymentId: null, ignoredAt: null },
      orderBy: { postedOn: 'asc' },
    }),
    db.member.findMany({ where: { archivedAt: null }, select: { id: true, names: true }, orderBy: { names: 'asc' } }),
    db.payment.findMany({
      where: { status: 'CONFIRMED' },
      include: { member: { select: { names: true } } },
      orderBy: { confirmedAt: 'desc' },
      take: 10,
    }),
  ]);
  const nameOf = new Map(members.map((m) => [m.id, m.names]));
  const methodLabel = (m: string) => t.pay.methods[m as keyof typeof t.pay.methods] ?? m;

  const toQueue = (p: (typeof open)[number]): QueuePayment => ({
    id: p.id,
    memberName: p.member.names,
    amountCents: p.amountCents,
    method: methodLabel(p.method),
    paidOn: fmt.format(p.paidOn),
    payerName: p.payerName,
    source: p.source,
    bankLine: p.bankTransaction ? { description: p.bankTransaction.description, postedOn: fmt.format(p.bankTransaction.postedOn) } : null,
  });
  const unmatched: QueueBankRow[] = bankRows.map((r) => ({
    id: r.id,
    postedOn: fmt.format(r.postedOn),
    amountCents: r.amountCents,
    description: r.description,
    suggested: r.suggestedMemberId ? { id: r.suggestedMemberId, names: nameOf.get(r.suggestedMemberId) ?? '' } : null,
  }));

  return (
    <AdminShell active="payments">
      <PageHeader title={t.adminPayments.title} subtitle={t.adminPayments.subtitle} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <SectionCard title={t.adminPayments.upload} icon={<Upload className="h-5 w-5 text-primary" />}>
            <BankUpload />
          </SectionCard>
          <PaymentQueue
            // Re-open on whichever tab has work after an upload or a confirm.
            key={`${open.length}-${unmatched.length}`}
            matched={open.filter((p) => p.status === 'MATCHED').map(toQueue)}
            reported={open.filter((p) => p.status === 'REPORTED').map(toQueue)}
            unmatched={unmatched}
            members={members}
          />
        </div>
        <div className="space-y-8 lg:col-span-2">
          <SectionCard title={t.adminPayments.record} description={t.adminPayments.recordHelp} icon={<HandCoins className="h-5 w-5 text-primary" />}>
            <RecordPaymentForm members={members} today={orgIsoDate(asOf)} />
          </SectionCard>
          <SectionCard title={t.adminPayments.recent} icon={<CheckCircle2 className="h-5 w-5 text-success" />}>
            <ul className="divide-y divide-border/60">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{p.member.names}</p>
                    <p className="text-sm text-muted-foreground">
                      {methodLabel(p.method)} · {fmt.format(p.paidOn)}
                    </p>
                  </div>
                  <MoneyAmount cents={p.amountCents} className="text-base font-bold" />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}
