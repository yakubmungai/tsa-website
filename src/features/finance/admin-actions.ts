'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { formatUSD } from '@/lib/money';
import { postLedgerEntrySchema, reverseLedgerEntrySchema } from '@/lib/validations';
import { LedgerError, postEntry, recomputeBalance, reverseEntry } from '@/lib/finance/ledger';
import { orgDateFromInput } from '@/lib/finance/dates';

/**
 * Money an officer records by hand: a payment received, a refund, a charge.
 *
 * Replaces postTransaction, which wrote the legacy Transaction table. The entry,
 * the member's cached balance and the audit row commit together or not at all.
 */
export const postLedgerEntry = defineAction({
  name: 'postLedgerEntry',
  guard: 'admin',
  schema: postLedgerEntrySchema,
  async handler(input, ctx): Promise<{ entryId: string }> {
    const member = await db.member.findUnique({
      where: { id: input.memberId },
      select: { id: true, names: true, archivedAt: true },
    });
    if (!member) actionError('Member not found.');
    if (member.archivedAt) actionError('Cannot post to an archived member.');

    const amountCents = input.direction === 'IN' ? input.amount : -input.amount;
    const occurredAt = orgDateFromInput(input.paidOn);

    const entry = await db.$transaction(async (tx) => {
      const created = await postEntry(tx, {
        memberId: member.id,
        account: input.account,
        entryKind: input.direction === 'IN' ? 'PAYMENT' : input.account === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'CHARGE',
        amountCents,
        description: input.memo || (input.direction === 'IN' ? 'Payment received' : 'Charge'),
        descriptionSw: input.memo || (input.direction === 'IN' ? 'Malipo yamepokelewa' : 'Deni'),
        occurredAt,
        createdByUserId: ctx.userId,
      });
      await recomputeBalance(tx, member.id);
      await writeAudit({
        tx,
        action: 'LEDGER_ENTRY_POSTED',
        entityType: 'LedgerEntry',
        entityId: created.id,
        onBehalfOfMemberId: member.id,
        summary: `Posted ${formatUSD(amountCents, { sign: 'always' })} (${input.account}) to ${member.names}`,
        metadata: { amountCents, account: input.account, paidOn: input.paidOn, memo: input.memo },
      });
      return created;
    });

    revalidatePath(`/admin/members/${member.id}`);
    revalidatePath('/admin/members');
    revalidatePath('/portal');
    return { entryId: entry.id };
  },
});

/**
 * Undo an entry. Nothing is deleted: an opposite entry is posted and both stay
 * in the member's history, with the reason.
 */
export const reverseLedgerEntry = defineAction({
  name: 'reverseLedgerEntry',
  guard: 'admin',
  schema: reverseLedgerEntrySchema,
  async handler(input, ctx): Promise<{ reversalId: string }> {
    const result = await db
      .$transaction(async (tx) => {
        const { original, reversal } = await reverseEntry(tx, {
          entryId: input.entryId,
          reason: input.reason,
          userId: ctx.userId,
        });
        if (original.memberId) await recomputeBalance(tx, original.memberId);
        await writeAudit({
          tx,
          action: 'LEDGER_ENTRY_REVERSED',
          entityType: 'LedgerEntry',
          entityId: original.id,
          onBehalfOfMemberId: original.memberId,
          summary: `Reversed ${formatUSD(original.amountCents, { sign: 'always' })} (${original.account}): ${input.reason}`,
          metadata: { reversalId: reversal.id, reason: input.reason },
        });
        return { original, reversal };
      })
      .catch((err) => {
        if (err instanceof LedgerError) actionError(err.message);
        throw err;
      });

    if (result.original.memberId) revalidatePath(`/admin/members/${result.original.memberId}`);
    revalidatePath('/admin/members');
    revalidatePath('/portal');
    return { reversalId: result.reversal.id };
  },
});

/**
 * Record that member data left the system.
 *
 * The exports are built in the browser, so the server cannot see them happen;
 * the export buttons call this first. Art 6.1 records should show who took a
 * copy of the roster and when.
 */
export const recordMemberExport = defineAction({
  name: 'recordMemberExport',
  guard: 'admin',
  schema: z
    .object({
      format: z.enum(['EXCEL_PROFILES', 'PDF_BALANCES']),
      rowCount: z.number().int().min(0).max(10_000),
    })
    .strict(),
  async handler(input): Promise<{ ok: true }> {
    await writeAudit({
      action: 'MEMBER_DATA_EXPORTED',
      entityType: 'MemberExport',
      entityId: input.format,
      summary: `Exported ${input.rowCount} members as ${input.format}`,
      metadata: { format: input.format, rowCount: input.rowCount },
    });
    return { ok: true };
  },
});
