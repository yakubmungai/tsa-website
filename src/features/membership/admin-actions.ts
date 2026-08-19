'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { formatUSD } from '@/lib/money';
import { memberFormSchema, postTransactionSchema } from '@/lib/validations';
import {
  findDuplicateCandidates,
  memberDataFromApplication,
  type DuplicateCandidate,
} from '@/features/forms/promote';

// Middleware check for admin authentication
async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
}

/**
 * Post a ledger entry against a member.
 *
 * The amount arrives from a free-text box, so it is parsed into integer cents
 * and range-checked before it reaches a Decimal(10,2) column. Previously
 * `Number(amount)` was passed straight through, so "abc" became NaN and
 * "999999999999" surfaced as a raw Prisma error in the browser.
 */
export const postTransaction = defineAction({
  name: 'postTransaction',
  guard: 'admin',
  schema: postTransactionSchema,
  async handler(input): Promise<{ transactionId: string; memberName: string }> {
    const member = await db.member.findUnique({
      where: { id: input.memberId },
      select: { id: true, names: true, archivedAt: true },
    });
    if (!member) actionError('Member not found.');
    if (member.archivedAt) actionError('Cannot post to an archived member.');

    // The ledger row and its audit entry commit together, so money can never
    // move without a record of who moved it.
    const created = await db.$transaction(async (tx) => {
      const row = await tx.transaction.create({
        data: {
          memberId: input.memberId,
          // Decimal column: hand it an exact decimal string, never a float.
          amount: (input.amount / 100).toFixed(2),
          type: input.type,
          description: input.description || null,
        },
        select: { id: true },
      });

      await writeAudit({
        tx,
        action: 'TRANSACTION_POSTED',
        entityType: 'Transaction',
        entityId: row.id,
        onBehalfOfMemberId: input.memberId,
        summary: `Posted ${formatUSD(input.amount, { sign: 'always' })} (${input.type}) to ${member.names}`,
        metadata: {
          amountCents: input.amount,
          type: input.type,
          description: input.description,
        },
      });

      return row;
    });

    revalidatePath(`/admin/members/${input.memberId}`);
    revalidatePath('/portal');
    return { transactionId: created.id, memberName: member.names };
  },
});

/** Update a member's profile and family details. */
export const updateMemberDetails = defineAction({
  name: 'updateMemberDetails',
  guard: 'admin',
  schema: memberFormSchema.extend({ memberId: z.string().uuid() }),
  async handler(input): Promise<{ memberId: string; changedFields: string[] }> {
    const { memberId, ...fields } = input;

    const existing = await db.member.findUnique({ where: { id: memberId } });
    if (!existing) actionError('Member not found.');

    // Record which fields actually changed, so the audit trail is reviewable
    // rather than a wall of identical "updated" entries.
    const changedFields = (Object.keys(fields) as (keyof typeof fields)[]).filter((key) => {
      const before = JSON.stringify((existing as Record<string, unknown>)[key] ?? null);
      const after = JSON.stringify(fields[key] ?? null);
      return before !== after;
    });

    await db.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: {
          names: fields.names,
          phone: fields.phone ?? null,
          address: fields.address ?? null,
          husbandWife: fields.husbandWife ?? null,
          spousePhone: fields.spousePhone ?? null,
          parents: fields.parents,
          children: fields.children,
          siblings: fields.siblings,
          witnesses: fields.witnesses,
          nextOfKin: fields.nextOfKin,
        },
      });

      if (changedFields.length > 0) {
        await writeAudit({
          tx,
          action: 'MEMBER_UPDATED',
          entityType: 'Member',
          entityId: memberId,
          onBehalfOfMemberId: memberId,
          summary: `Updated ${changedFields.join(', ')} for ${fields.names}`,
          metadata: { changedFields },
        });
      }
    });

    revalidatePath(`/admin/members/${memberId}`);
    revalidatePath('/admin/members');
    return { memberId, changedFields };
  },
});

/**
 * Archive a member (soft delete).
 *
 * This used to be `db.member.delete()`, which cascaded to Transaction and User
 * — one click erased a member's entire financial history with no record. The
 * KATIBA (Art 6.1) gives members the right to inspect these records, and the
 * association needs them for its own reporting, so the row is retained and
 * hidden instead.
 *
 * The caller must confirm by typing the member's exact name, so this cannot be
 * triggered by a stray click on the wrong row.
 */
export async function archiveMember(memberId: string, confirmName: string) {
  try {
    await verifyAdmin();

    const member = await db.member.findUnique({
      where: { id: memberId },
      include: { _count: { select: { transactions: true, submissions: true } } },
    });

    if (!member) {
      return { success: false, error: 'Member not found.' };
    }
    if (member.archivedAt) {
      return { success: false, error: 'This member is already archived.' };
    }

    const normalise = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalise(confirmName) !== normalise(member.names)) {
      return {
        success: false,
        error: `Name did not match. Type "${member.names}" exactly to archive this member.`,
      };
    }

    await db.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: { archivedAt: new Date() },
      });

      // Revoke the login, so an archived member cannot sign in. The member row
      // and every transaction stay exactly where they are.
      await tx.user.deleteMany({ where: { memberId } });

      await writeAudit({
        tx,
        action: 'MEMBER_ARCHIVED',
        entityType: 'Member',
        entityId: memberId,
        summary: `Archived member ${member.names}`,
        metadata: {
          names: member.names,
          phone: member.phone,
          transactionCount: member._count.transactions,
          submissionCount: member._count.submissions,
        },
      });
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${memberId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error archiving member:', err);
    return { success: false, error: 'Failed to archive member.' };
  }
}

/** Undo an archive. */
export async function restoreMember(memberId: string) {
  try {
    await verifyAdmin();

    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: 'Member not found.' };

    await db.$transaction(async (tx) => {
      await tx.member.update({ where: { id: memberId }, data: { archivedAt: null } });
      await writeAudit({
        tx,
        action: 'MEMBER_RESTORED',
        entityType: 'Member',
        entityId: memberId,
        summary: `Restored member ${member.names}`,
      });
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${memberId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error restoring member:', err);
    return { success: false, error: 'Failed to restore member.' };
  }
}

// Approve a form submission
/** Members this application might already be, for the reviewer to judge. */
export const getSubmissionDuplicates = defineAction({
  name: 'getSubmissionDuplicates',
  guard: 'admin',
  schema: z.object({ submissionId: z.string().uuid() }).strict(),
  async handler(input): Promise<{ candidates: DuplicateCandidate[] }> {
    const submission = await db.formSubmission.findUnique({
      where: { id: input.submissionId },
      select: { submitterName: true, submitterPhone: true, data: true },
    });
    if (!submission) actionError('Submission not found.');

    const payload = (submission.data ?? {}) as Record<string, unknown>;
    const name =
      submission.submitterName ??
      `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim();

    return { candidates: await findDuplicateCandidates(name, submission.submitterPhone) };
  },
});

/**
 * Approve a submission.
 *
 * A membership application must say explicitly what to do — link it to an
 * existing member, or create a new one. There is no implicit create, because
 * that is how duplicate profiles get made against a roster that already
 * contains near-duplicates from the original import.
 */
export const approveSubmission = defineAction({
  name: 'approveSubmission',
  guard: 'admin',
  schema: z
    .object({
      submissionId: z.string().uuid(),
      /** Required for MEMBERSHIP submissions that are not already linked. */
      resolution: z
        .discriminatedUnion('action', [
          z.object({ action: z.literal('createMember') }),
          z.object({ action: z.literal('linkExisting'), memberId: z.string().uuid() }),
          z.object({ action: z.literal('acknowledge') }),
        ])
        .optional(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  async handler(input, ctx): Promise<{ memberId: string | null }> {
    const submission = await db.formSubmission.findUnique({
      where: { id: input.submissionId },
    });
    if (!submission) actionError('Submission not found.');
    if (submission.status === 'APPROVED') actionError('This submission is already approved.');

    const isApplication = submission.formType === 'MEMBERSHIP';
    const resolution = input.resolution ?? { action: 'acknowledge' as const };

    if (isApplication && !submission.memberId && resolution.action === 'acknowledge') {
      actionError(
        'Choose whether to link this application to an existing member or create a new one.'
      );
    }

    const memberId = await db.$transaction(async (tx) => {
      let linkedMemberId: string | null = submission.memberId;

      if (resolution.action === 'linkExisting') {
        const existing = await tx.member.findUnique({
          where: { id: resolution.memberId },
          select: { id: true, archivedAt: true },
        });
        if (!existing || existing.archivedAt) actionError('That member no longer exists.');
        linkedMemberId = existing.id;
      }

      if (resolution.action === 'createMember') {
        const data = memberDataFromApplication(
          (submission.data ?? {}) as Record<string, unknown>
        );
        if (!data.names) actionError('This application has no name on it.');

        const created = await tx.member.create({
          data: { ...data, joinedAt: new Date(), joinedAtEstimated: false, status: 'ACTIVE' },
          select: { id: true },
        });
        linkedMemberId = created.id;

        await writeAudit({
          tx,
          action: 'MEMBER_CREATED',
          entityType: 'Member',
          entityId: created.id,
          onBehalfOfMemberId: created.id,
          summary: `Created ${data.names} from application ${submission.reference}`,
          metadata: { submissionId: submission.id, reference: submission.reference },
        });
      }

      await tx.formSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'APPROVED',
          memberId: linkedMemberId,
          reviewedById: ctx.userId,
          reviewedAt: new Date(),
          reviewNote: input.note ?? null,
        },
      });

      await writeAudit({
        tx,
        action: 'SUBMISSION_APPROVED',
        entityType: 'FormSubmission',
        entityId: submission.id,
        onBehalfOfMemberId: linkedMemberId,
        summary: `Approved ${submission.formType} ${submission.reference} (${resolution.action})`,
        metadata: { resolution: resolution.action },
      });

      return linkedMemberId;
    });

    revalidatePath('/admin/forms');
    revalidatePath('/admin/members');
    return { memberId };
  },
});

export const rejectSubmission = defineAction({
  name: 'rejectSubmission',
  guard: 'admin',
  schema: z
    .object({
      submissionId: z.string().uuid(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  async handler(input, ctx): Promise<{ submissionId: string }> {
    const submission = await db.formSubmission.findUnique({
      where: { id: input.submissionId },
      select: { id: true, reference: true, formType: true },
    });
    if (!submission) actionError('Submission not found.');

    await db.$transaction(async (tx) => {
      await tx.formSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'REJECTED',
          reviewedById: ctx.userId,
          reviewedAt: new Date(),
          reviewNote: input.note ?? null,
        },
      });
      await writeAudit({
        tx,
        action: 'SUBMISSION_REJECTED',
        entityType: 'FormSubmission',
        entityId: submission.id,
        summary: `Rejected ${submission.formType} ${submission.reference}`,
        metadata: { note: input.note ?? null },
      });
    });

    revalidatePath('/admin/forms');
    return { submissionId: submission.id };
  },
});

/** Create a member profile from scratch. */
export const createMember = defineAction({
  name: 'createMember',
  guard: 'admin',
  schema: memberFormSchema,
  async handler(input): Promise<{ memberId: string }> {
    const created = await db.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          names: input.names,
          phone: input.phone ?? null,
          address: input.address ?? null,
          husbandWife: input.husbandWife ?? null,
          spousePhone: input.spousePhone ?? null,
          parents: input.parents,
          children: input.children,
          siblings: input.siblings,
          witnesses: input.witnesses,
          nextOfKin: input.nextOfKin,
        },
        select: { id: true },
      });

      await writeAudit({
        tx,
        action: 'MEMBER_CREATED',
        entityType: 'Member',
        entityId: member.id,
        onBehalfOfMemberId: member.id,
        summary: `Created member ${input.names}`,
        metadata: { names: input.names, phone: input.phone ?? null },
      });

      return member;
    });

    revalidatePath('/admin/members');
    return { memberId: created.id };
  },
});
