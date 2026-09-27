'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { now } from '@/lib/clock';
import { formatUSD } from '@/lib/money';
import { orgDateFromInput } from '@/lib/finance/dates';
import {
  adminRecordPaymentSchema,
  bankAssignSchema,
  bankIgnoreSchema,
  memberIdOnlySchema,
  paymentIdSchema,
  rejectPaymentSchema,
} from '@/lib/validations';
import { PaymentError, confirmPaymentTx, importBankStatement, mintPayLink, type ImportSummary } from './service';

function refuse(err: unknown): never {
  if (err instanceof PaymentError) actionError(err.message);
  throw err;
}

function revalidateAll(memberId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/payments');
  revalidatePath('/admin/claims', 'layout');
  revalidatePath('/admin/members');
  revalidatePath('/portal');
  if (memberId) revalidatePath(`/admin/members/${memberId}`);
}

async function confirmOne(paymentId: string, userId: string) {
  return db
    .$transaction(async (tx) => {
      const { payment, allocations } = await confirmPaymentTx(tx, paymentId, userId);
      await writeAudit({
        tx,
        action: 'PAYMENT_CONFIRMED',
        entityType: 'Payment',
        entityId: payment.id,
        onBehalfOfMemberId: payment.memberId,
        summary: `Confirmed ${formatUSD(payment.amountCents)} ${payment.method}`,
        metadata: { allocations: allocations.map((a) => ({ ...a })) },
      });
      return payment;
    })
    .catch(refuse);
}

/** Thibitisha — the Treasurer confirms one payment. */
export const confirmPayment = defineAction({
  name: 'confirmPayment',
  guard: 'admin',
  schema: paymentIdSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const p = await confirmOne(input.paymentId, ctx.userId);
    revalidateAll(p.memberId);
    return { ok: true };
  },
});

/** "Thibitisha zote zilizolingana" — every payment the bank file confirmed. */
export const confirmAllMatched = defineAction({
  name: 'confirmAllMatched',
  guard: 'admin',
  schema: z.object({}).strict(),
  async handler(_input, ctx): Promise<{ confirmed: number }> {
    const matched = await db.payment.findMany({ where: { status: 'MATCHED' }, select: { id: true } });
    for (const p of matched) await confirmOne(p.id, ctx.userId);
    revalidateAll();
    return { confirmed: matched.length };
  },
});

export const rejectPayment = defineAction({
  name: 'rejectPayment',
  guard: 'admin',
  schema: rejectPaymentSchema,
  async handler(input): Promise<{ ok: true }> {
    const p = await db.payment.findUnique({ where: { id: input.paymentId } });
    if (!p) actionError('Payment not found.');
    if (p.status === 'CONFIRMED') actionError('A confirmed payment is corrected with Undo on the member’s history.');
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: p.id }, data: { status: 'REJECTED', rejectedReason: input.reason } });
      await tx.bankTransaction.updateMany({ where: { matchedPaymentId: p.id }, data: { matchedPaymentId: null, matchConfidence: null } });
      await writeAudit({
        tx,
        action: 'PAYMENT_REJECTED',
        entityType: 'Payment',
        entityId: p.id,
        onBehalfOfMemberId: p.memberId,
        summary: `Rejected reported ${formatUSD(p.amountCents)}: ${input.reason}`,
      });
    });
    revalidateAll(p.memberId);
    return { ok: true };
  },
});

/** Money the Treasurer has in hand — cash at a meeting, a check — recorded and confirmed at once. */
export const recordMemberPayment = defineAction({
  name: 'recordMemberPayment',
  guard: 'admin',
  schema: adminRecordPaymentSchema,
  async handler(input, ctx): Promise<{ paymentId: string }> {
    const member = await db.member.findUnique({ where: { id: input.memberId }, select: { id: true, names: true, archivedAt: true } });
    if (!member || member.archivedAt) actionError('Member not found.');
    const created = await db.payment.create({
      data: {
        memberId: member.id,
        method: input.method,
        status: 'REPORTED',
        amountCents: input.amount,
        paidOn: orgDateFromInput(input.paidOn),
        payerName: input.payerName ?? null,
        memo: input.memo ?? null,
        preference: input.preference,
        reportedByUserId: ctx.userId,
        source: 'admin',
      },
    });
    await confirmOne(created.id, ctx.userId);
    revalidateAll(member.id);
    return { paymentId: created.id };
  },
});

/** Upload the bank-statement file. Parsed on the server; nothing is kept but deposits. */
export async function uploadBankStatement(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
  const run = defineAction({
    name: 'uploadBankStatement',
    guard: 'admin',
    schema: z.object({ name: z.string().max(200), text: z.string().max(2_000_000) }),
    async handler(input, ctx) {
      const summary = await importBankStatement(input.text, input.name, ctx.userId);
      await writeAudit({
        action: 'BANK_STATEMENT_IMPORTED',
        entityType: 'BankImport',
        entityId: summary.importId,
        summary: `Imported ${input.name}: ${summary.newRows} new deposits, ${summary.matched} matched`,
        metadata: { ...summary, errors: summary.errors.slice(0, 20) },
      });
      revalidateAll();
      return summary;
    },
  });
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose the file you downloaded from the bank.' };
  if (file.size > 2_000_000) return { ok: false, error: 'That file is too large for a bank statement.' };
  const res = await run({ name: file.name, text: await file.text() });
  return res.success ? { ok: true, summary: res.data } : { ok: false, error: res.error };
}

/** A deposit nobody reported: the Treasurer says whose it is, and it is confirmed. */
export const assignBankRow = defineAction({
  name: 'assignBankRow',
  guard: 'admin',
  schema: bankAssignSchema,
  async handler(input, ctx): Promise<{ paymentId: string }> {
    const row = await db.bankTransaction.findUnique({ where: { id: input.bankId } });
    if (!row) actionError('Bank line not found.');
    if (row.matchedPaymentId) actionError('This deposit is already matched.');
    const payment = await db.payment.create({
      data: {
        memberId: input.memberId,
        method: /cash ?app|square/i.test(row.description) ? 'CASHAPP' : /zelle/i.test(row.description) ? 'ZELLE' : 'BANK_TRANSFER',
        status: 'MATCHED',
        amountCents: row.amountCents,
        paidOn: row.postedOn,
        payerName: row.senderName,
        memo: row.description.slice(0, 200),
        reportedByUserId: ctx.userId,
        source: 'bank',
        providerRef: `bank:${row.rowHash}`,
      },
    });
    await db.bankTransaction.update({
      where: { id: row.id },
      data: { matchedPaymentId: payment.id, matchConfidence: 'STRONG', suggestedMemberId: null },
    });
    await confirmOne(payment.id, ctx.userId);
    revalidateAll(input.memberId);
    return { paymentId: payment.id };
  },
});

export const ignoreBankRow = defineAction({
  name: 'ignoreBankRow',
  guard: 'admin',
  schema: bankIgnoreSchema,
  async handler(input): Promise<{ ok: true }> {
    await db.bankTransaction.update({
      where: { id: input.bankId },
      data: { ignoredAt: await now(), ignoredReason: input.reason },
    });
    await writeAudit({
      action: 'BANK_ROW_IGNORED',
      entityType: 'BankTransaction',
      entityId: input.bankId,
      summary: `Ignored bank line: ${input.reason}`,
    });
    revalidateAll();
    return { ok: true };
  },
});

/** A personal pay link for a WhatsApp reminder. */
export const createPayLink = defineAction({
  name: 'createPayLink',
  guard: 'admin',
  schema: memberIdOnlySchema,
  async handler(input, ctx): Promise<{ url: string }> {
    const token = await mintPayLink(input.memberId, ctx.userId);
    await writeAudit({
      action: 'PAY_LINK_CREATED',
      entityType: 'PayLink',
      entityId: input.memberId,
      onBehalfOfMemberId: input.memberId,
      summary: 'Created a pay link for a reminder',
    });
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tansha.org').replace(/\/$/, '');
    return { url: `${base}/lipa/${token}` };
  },
});
