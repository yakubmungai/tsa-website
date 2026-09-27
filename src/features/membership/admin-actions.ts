'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { archiveMemberSchema, memberFormSchema, memberIdSchema } from '@/lib/validations';
import {
  findDuplicateCandidates,
  memberDataFromApplication,
  type DuplicateCandidate,
} from '@/features/forms/promote';

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
export const archiveMember = defineAction({
  name: 'archiveMember',
  guard: 'admin',
  schema: archiveMemberSchema,
  async handler(input): Promise<{ memberId: string }> {
    const member = await db.member.findUnique({
      where: { id: input.memberId },
      include: { _count: { select: { ledgerEntries: true, submissions: true } } },
    });
    if (!member) actionError('Member not found.');
    if (member.archivedAt) actionError('This member is already archived.');

    const normalise = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalise(input.confirmName) !== normalise(member.names)) {
      actionError(`Name did not match. Type "${member.names}" exactly to archive this member.`);
    }

    await db.$transaction(async (tx) => {
      await tx.member.update({ where: { id: member.id }, data: { archivedAt: new Date() } });

      // Revoke the login, so an archived member cannot sign in. The member row
      // and every ledger entry stay exactly where they are.
      await tx.user.deleteMany({ where: { memberId: member.id } });

      await writeAudit({
        tx,
        action: 'MEMBER_ARCHIVED',
        entityType: 'Member',
        entityId: member.id,
        summary: `Archived member ${member.names}`,
        metadata: {
          names: member.names,
          phone: member.phone,
          ledgerEntryCount: member._count.ledgerEntries,
          submissionCount: member._count.submissions,
        },
      });
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${member.id}`);
    return { memberId: member.id };
  },
});

/** Undo an archive. */
export const restoreMember = defineAction({
  name: 'restoreMember',
  guard: 'admin',
  schema: memberIdSchema,
  async handler(input): Promise<{ memberId: string }> {
    const member = await db.member.findUnique({ where: { id: input.memberId } });
    if (!member) actionError('Member not found.');

    await db.$transaction(async (tx) => {
      await tx.member.update({ where: { id: member.id }, data: { archivedAt: null } });
      await writeAudit({
        tx,
        action: 'MEMBER_RESTORED',
        entityType: 'Member',
        entityId: member.id,
        summary: `Restored member ${member.names}`,
      });
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${member.id}`);
    return { memberId: member.id };
  },
});

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
