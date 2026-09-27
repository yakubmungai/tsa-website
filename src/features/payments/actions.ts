'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { getEffectiveContext, checkPermission } from '@/lib/session';
import { now } from '@/lib/clock';
import { html } from '@/lib/html';
import { formatUSD } from '@/lib/money';
import { notifyOfficers } from '@/lib/notify';
import { consume, consumeAll, POLICIES } from '@/lib/rate-limit';
import { isCardPaymentEnabled } from '@/lib/rollout';
import { orgDateFromInput, orgIsoDate } from '@/lib/finance/dates';
import { cardCheckoutSchema, payLinkReportSchema, reportPaymentSchema } from '@/lib/validations';
import { resolvePayLink, rematchBank } from './service';

async function ipKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
  return createHash('sha256').update(`${process.env.AUDIT_IP_PEPPER ?? ''}:${ip}`).digest('hex').slice(0, 32);
}

async function record(input: {
  memberId: string;
  memberName: string;
  amount: number;
  paidOn: string;
  method: 'ZELLE' | 'CASHAPP' | 'BANK_TRANSFER' | 'CHECK' | 'CASH';
  payerName?: string;
  memo?: string;
  preference: 'AUTO' | 'ADVANCE';
  userId: string | null;
  source: 'portal' | 'paylink';
}) {
  const asOf = await now();
  if (input.paidOn > orgIsoDate(asOf)) actionError('The date cannot be in the future.');
  const payment = await db.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        memberId: input.memberId,
        method: input.method,
        status: 'REPORTED',
        amountCents: input.amount,
        paidOn: orgDateFromInput(input.paidOn),
        payerName: input.payerName ?? null,
        memo: input.memo ?? null,
        preference: input.preference,
        reportedByUserId: input.userId,
        source: input.source,
      },
    });
    await writeAudit({
      tx,
      action: 'PAYMENT_REPORTED',
      entityType: 'Payment',
      entityId: created.id,
      onBehalfOfMemberId: input.memberId,
      summary: `${input.memberName} reported ${formatUSD(input.amount)} by ${input.method}`,
      actor: input.userId ? undefined : { label: 'pay-link', role: 'PUBLIC' },
    });
    return created;
  });

  // A deposit uploaded before the report can now be matched to it.
  await rematchBank();
  await notifyOfficers({
    subject: `Malipo yameripotiwa: ${input.memberName} ${formatUSD(input.amount)}`,
    html: html`<p><strong>${input.memberName}</strong> amesema amelipa ${formatUSD(input.amount)} kwa ${input.method} tarehe ${input.paidOn}.</p>
      <p>Ingia kwenye tovuti → Malipo ili kuthibitisha.</p>`,
  });
  revalidatePath('/portal');
  revalidatePath('/admin');
  revalidatePath('/admin/payments');
  return payment;
}

/**
 * "Nimelipa" — a member (or a helper with MAKE_PAYMENTS) says they sent money.
 * Nothing moves until the Treasurer confirms; the member sees it as waiting.
 */
export const reportPayment = defineAction({
  name: 'reportPayment',
  guard: 'auth',
  schema: reportPaymentSchema,
  async handler(input, actionCtx): Promise<{ paymentId: string }> {
    const ctx = await getEffectiveContext();
    if (!ctx?.memberId) actionError('Your account is not linked to a member yet.');
    if (!checkPermission(ctx, 'MAKE_PAYMENTS')) {
      actionError('This member has not given you permission to make payments for them.');
    }
    const member = await db.member.findUniqueOrThrow({ where: { id: ctx.memberId }, select: { id: true, names: true } });
    const p = await record({ ...input, memberId: member.id, memberName: member.names, userId: actionCtx.userId, source: 'portal' });
    return { paymentId: p.id };
  },
});

/**
 * The same, from a personal pay link opened from WhatsApp — no sign-in. The
 * token decides whose account it is; nothing from the browser does.
 */
export const reportPaymentViaLink = defineAction({
  name: 'reportPaymentViaLink',
  guard: 'public',
  schema: payLinkReportSchema,
  async handler(input): Promise<{ paymentId: string }> {
    const limit = await consumeAll([
      { policy: POLICIES.payLinkIp, key: await ipKey() },
      { policy: POLICIES.payLinkReport, key: input.token },
    ]);
    if (!limit.allowed) actionError('Too many attempts. Please try again later, or call the Treasurer.');
    const link = await resolvePayLink(input.token);
    if (!link) actionError('This link has expired. Ask a TSA leader for a new one.');
    await db.payLink.update({ where: { id: link.id }, data: { lastUsedAt: new Date() } });
    const { token: _token, ...fields } = input;
    const p = await record({ ...fields, memberId: link.member.id, memberName: link.member.names, userId: null, source: 'paylink' });
    return { paymentId: p.id };
  },
});

/**
 * Start a card / Apple Pay / bank payment on Stripe's hosted page. Refused
 * unless card payments are switched on.
 */
export const startCardCheckout = defineAction({
  name: 'startCardCheckout',
  guard: 'public',
  schema: cardCheckoutSchema,
  async handler(input): Promise<{ url: string }> {
    if (!isCardPaymentEnabled()) actionError('Card payments are not available yet.');
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tansha.org').replace(/\/$/, '');

    let memberId: string;
    let memberName: string;
    let userId: string | null = null;
    let returnUrl: string;
    if (input.token) {
      const limit = await consume(POLICIES.payLinkIp, await ipKey());
      if (!limit.allowed) actionError('Too many attempts. Please try again later.');
      const link = await resolvePayLink(input.token);
      if (!link) actionError('This link has expired. Ask a TSA leader for a new one.');
      memberId = link.member.id;
      memberName = link.member.names;
      returnUrl = `${base}/lipa/${input.token}`;
    } else {
      const ctx = await getEffectiveContext();
      if (!ctx?.memberId) actionError('Please sign in to pay.');
      if (!checkPermission(ctx, 'MAKE_PAYMENTS')) actionError('You do not have permission to pay for this member.');
      const m = await db.member.findUniqueOrThrow({ where: { id: ctx.memberId }, select: { id: true, names: true } });
      memberId = m.id;
      memberName = m.names;
      userId = ctx.actor.id;
      returnUrl = `${base}/portal/pay`;
    }
    const { createCheckout } = await import('./stripe');
    const url = await createCheckout({
      memberId,
      memberName,
      amountCents: input.amount,
      preference: input.preference,
      reportedByUserId: userId,
      source: input.token ? 'paylink' : 'portal',
      returnUrl,
    });
    return { url };
  },
});
