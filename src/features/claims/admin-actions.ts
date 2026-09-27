'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { now } from '@/lib/clock';
import { formatUSD } from '@/lib/money';
import { orgDateFromInput, orgIsoDate } from '@/lib/finance/dates';
import { recomputeBalance } from '@/lib/finance/ledger';
import {
  adminCreateClaimSchema,
  approveClaimSchema,
  claimChecklistSchema,
  claimDecisionSchema,
  claimIdSchema,
  excuseShareSchema,
  payoutSchema,
  sharePaymentSchema,
} from '@/lib/validations';
import {
  ClaimError,
  announceClaim as announce,
  applyToShare,
  claimData,
  createClaimRow,
  paidOutCents,
  reviewClaim,
} from './service';

/** Turn a service refusal into a message for the officer; anything else stays generic. */
function refuse(err: unknown): never {
  if (err instanceof ClaimError) actionError(err.message);
  throw err;
}

function revalidateClaim(claimId: string, memberId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/claims');
  revalidatePath(`/admin/claims/${claimId}`);
  revalidatePath('/portal');
  revalidatePath('/portal/claims');
  if (memberId) revalidatePath(`/admin/members/${memberId}`);
}

async function loadClaim(claimId: string) {
  const claim = await db.claim.findUnique({ where: { id: claimId } });
  if (!claim) actionError('Case not found.');
  return claim;
}

/**
 * An officer opens a case for a member — their death, reported by the family
 * by phone, or a member who does not use the portal. Can start from a public
 * funeral notice, which is then marked as handled.
 */
export const createClaimForMember = defineAction({
  name: 'createClaimForMember',
  guard: 'admin',
  schema: adminCreateClaimSchema,
  async handler(input, ctx): Promise<{ claimId: string; reference: string }> {
    const member = await db.member.findUnique({ where: { id: input.memberId } });
    if (!member || member.archivedAt) actionError('Member not found.');
    const asOf = await now();
    if (input.eventDate > orgIsoDate(asOf)) actionError('The date cannot be in the future.');

    const { memberId, sourceSubmissionId, ...fields } = input;
    const data = await claimData(fields, asOf);
    const claim = await db.$transaction(async (tx) => {
      const created = await createClaimRow(tx, {
        ...data,
        memberId,
        filedByUserId: ctx.userId,
        filedOnBehalf: true,
        sourceSubmissionId: sourceSubmissionId ?? null,
      });
      if (sourceSubmissionId) {
        await tx.formSubmission.update({
          where: { id: sourceSubmissionId },
          data: {
            status: 'APPROVED',
            memberId,
            reviewedById: ctx.userId,
            reviewedAt: asOf,
            reviewNote: `Opened as case ${created.reference}`,
          },
        });
      }
      await writeAudit({
        tx,
        action: 'CLAIM_FILED',
        entityType: 'Claim',
        entityId: created.id,
        onBehalfOfMemberId: memberId,
        summary: `Officer opened ${input.type} for ${member.names} (${input.subjectName}) — ${created.reference}`,
        metadata: { sourceSubmissionId: sourceSubmissionId ?? null },
      });
      return created;
    });
    revalidateClaim(claim.id, memberId);
    revalidatePath('/admin/forms');
    return { claimId: claim.id, reference: claim.reference };
  },
});

/** Kagua — the Katibu/Muhakiki picks the case up. */
export const startClaimReview = defineAction({
  name: 'startClaimReview',
  guard: 'admin',
  schema: claimIdSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const claim = await loadClaim(input.claimId);
    if (claim.status !== 'SUBMITTED') actionError('This case is already past review.');
    await db.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: { status: 'UNDER_REVIEW', reviewStartedAt: await now(), reviewedById: ctx.userId },
      });
      await writeAudit({
        tx,
        action: 'CLAIM_REVIEW_STARTED',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `Review started on ${claim.reference}`,
      });
    });
    revalidateClaim(claim.id);
    return { ok: true };
  },
});

/** Tick a document seen (Art 4.3) or a payout condition met (Art 18.9). */
export const setClaimChecklistItem = defineAction({
  name: 'setClaimChecklistItem',
  guard: 'admin',
  schema: claimChecklistSchema,
  async handler(input): Promise<{ ok: true }> {
    const claim = await loadClaim(input.claimId);
    const current = (claim[input.field] ?? {}) as Record<string, boolean>;
    const next = { ...current, [input.key]: input.checked };
    await db.$transaction(async (tx) => {
      await tx.claim.update({ where: { id: claim.id }, data: { [input.field]: next } });
      await writeAudit({
        tx,
        action: 'CLAIM_CHECKLIST_UPDATED',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `${input.checked ? 'Ticked' : 'Unticked'} ${input.field}.${input.key} on ${claim.reference}`,
      });
    });
    revalidateClaim(claim.id);
    return { ok: true };
  },
});

/**
 * Idhinisha — fix the tier on the event date and the benefit.
 *
 * The amount the rules suggest is recomputed here, on the server; if the
 * officer changes it, a note is required and both figures are recorded.
 */
export const approveClaim = defineAction({
  name: 'approveClaim',
  guard: 'admin',
  schema: approveClaimSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const claim = await loadClaim(input.claimId);
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status)) actionError('This case has already been decided.');
    const review = await reviewClaim(claim.id).catch(refuse);
    const suggested = review.eligibility.suggestedBenefitCents;
    const overridden = input.effectiveType !== review.eligibility.effectiveType || input.benefit !== suggested;
    if (overridden && input.note.length < 3) {
      actionError('You changed the suggested amount or type — give a reason.', {
        note: ['Give a reason for the change'],
      });
    }
    const asOf = await now();

    await db.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: 'APPROVED',
          effectiveType: input.effectiveType,
          tierAtEvent: review.tierAtEvent,
          standingAtEventCents: review.standingAtEventCents,
          eligibility: review.eligibility as unknown as Prisma.InputJsonValue,
          benefitCents: input.benefit,
          levyPoolCents: input.benefit,
          decisionNote: input.note || null,
          approvedAt: asOf,
          reviewedById: ctx.userId,
          reviewStartedAt: claim.reviewStartedAt ?? asOf,
        },
      });
      // Art 5.4 — membership ends at death; the deceased no longer contributes.
      if (claim.type === 'MEMBER_DEATH') {
        await tx.member.update({ where: { id: claim.memberId }, data: { status: 'DECEASED' } });
      }
      await writeAudit({
        tx,
        action: 'CLAIM_APPROVED',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `Approved ${claim.reference}: ${formatUSD(input.benefit)} as ${input.effectiveType} (tier ${review.tierAtEvent})`,
        metadata: {
          suggestedCents: suggested,
          approvedCents: input.benefit,
          suggestedType: review.eligibility.effectiveType,
          approvedType: input.effectiveType,
          flags: review.eligibility.flags.map((f) => f.code),
          note: input.note,
        },
      });
    });
    revalidateClaim(claim.id, claim.memberId);
    return { ok: true };
  },
});

/** Kihiari — announced for voluntary support only; nobody is charged. */
export const markClaimVoluntary = defineAction({
  name: 'markClaimVoluntary',
  guard: 'admin',
  schema: claimDecisionSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const claim = await loadClaim(input.claimId);
    if (!['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(claim.status)) {
      actionError('This case has already been announced or decided.');
    }
    const review = await reviewClaim(claim.id).catch(refuse);
    await db.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: 'VOLUNTARY',
          tierAtEvent: review.tierAtEvent,
          standingAtEventCents: review.standingAtEventCents,
          eligibility: review.eligibility as unknown as Prisma.InputJsonValue,
          benefitCents: 0,
          levyPoolCents: 0,
          decisionNote: input.note,
          approvedAt: await now(),
          reviewedById: ctx.userId,
        },
      });
      await writeAudit({
        tx,
        action: 'CLAIM_VOLUNTARY',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `Marked ${claim.reference} as kihiari: ${input.note}`,
      });
    });
    revalidateClaim(claim.id);
    return { ok: true };
  },
});

export const rejectClaim = defineAction({
  name: 'rejectClaim',
  guard: 'admin',
  schema: claimDecisionSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const claim = await loadClaim(input.claimId);
    if (!['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(claim.status)) {
      actionError('An announced case cannot be rejected. Undo its entries instead.');
    }
    await db.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: { status: 'REJECTED', decisionNote: input.note, rejectedAt: await now(), reviewedById: ctx.userId },
      });
      await writeAudit({
        tx,
        action: 'CLAIM_REJECTED',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `Rejected ${claim.reference}: ${input.note}`,
      });
    });
    revalidateClaim(claim.id);
    return { ok: true };
  },
});

/** Tangaza — charge every contributing member their share. */
export const announceClaim = defineAction({
  name: 'announceClaim',
  guard: 'admin',
  schema: claimIdSchema,
  async handler(input, ctx): Promise<{
    payers: number;
    totalCents: number;
    typicalShareCents: number;
    deferred: number;
    fromAdvanceCents: number;
  }> {
    const { claim, result } = await announce(input.claimId, ctx.userId).catch(refuse);
    await writeAudit({
      action: 'CLAIM_ANNOUNCED',
      entityType: 'Claim',
      entityId: claim.id,
      onBehalfOfMemberId: claim.memberId,
      summary: `Announced ${claim.reference}: ${result.payers} members, ${formatUSD(result.totalCents)} (${result.deferred} deferred)`,
      metadata: { ...result },
    });
    revalidateClaim(claim.id);
    revalidatePath('/admin/members');
    return result;
  },
});

/** Money a member paid towards one share — until Stage 4, recorded by hand. */
export const recordSharePayment = defineAction({
  name: 'recordSharePayment',
  guard: 'admin',
  schema: sharePaymentSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const share = await db.$transaction(async (tx) => {
      const s = await applyToShare(tx, {
        assessmentId: input.assessmentId,
        amountCents: input.amount,
        occurredAt: orgDateFromInput(input.paidOn),
        userId: ctx.userId,
        note: input.memo,
      }).catch(refuse);
      await recomputeBalance(tx, s.memberId);
      await writeAudit({
        tx,
        action: 'SHARE_PAYMENT_RECORDED',
        entityType: 'Assessment',
        entityId: s.id,
        onBehalfOfMemberId: s.memberId,
        summary: `Recorded ${formatUSD(input.amount)} towards ${s.claim.reference}`,
        metadata: { paidOn: input.paidOn, memo: input.memo },
      });
      return s;
    });
    revalidateClaim(share.claimId, share.memberId);
    return { ok: true };
  },
});

/** Art 17.4 — a member who gave notice is not in breach. */
export const excuseShare = defineAction({
  name: 'excuseShare',
  guard: 'admin',
  schema: excuseShareSchema,
  async handler(input, ctx): Promise<{ ok: true }> {
    const share = await db.assessment.findUnique({ where: { id: input.assessmentId }, include: { claim: true } });
    if (!share) actionError('Share not found.');
    await db.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id: share.id },
        data: input.note
          ? { excusedAt: await now(), excuseNote: input.note, excusedById: ctx.userId }
          : { excusedAt: null, excuseNote: null, excusedById: null },
      });
      await writeAudit({
        tx,
        action: 'SHARE_EXCUSED',
        entityType: 'Assessment',
        entityId: share.id,
        onBehalfOfMemberId: share.memberId,
        summary: input.note
          ? `Excused share on ${share.claim.reference}: ${input.note}`
          : `Removed excuse on ${share.claim.reference}`,
      });
    });
    revalidateClaim(share.claimId, share.memberId);
    return { ok: true };
  },
});

/**
 * Lipa — record money paid out on the case.
 *
 * Art 18.9 conditions must all be ticked first. Partial payments are allowed
 * (Art 18.1: leaders help with the burial and hand over what remains), and the
 * case is marked paid once the benefit is covered.
 */
export const recordPayout = defineAction({
  name: 'recordPayout',
  guard: 'admin',
  schema: payoutSchema,
  async handler(input, ctx): Promise<{ paidCents: number }> {
    const claim = await loadClaim(input.claimId);
    if (!['COLLECTING', 'APPROVED', 'PAID', 'VOLUNTARY'].includes(claim.status)) {
      actionError('Money can be paid out only on an approved case.');
    }
    const conditions = (claim.payoutConditions ?? {}) as Record<string, boolean>;
    const required = ['muhasibuChecked', 'muhakikiApproved', 'idSeen', 'receiptSigned'];
    if (input.kind === 'BENEFIT_PAYOUT' && !required.every((k) => conditions[k])) {
      actionError('Confirm all the Art 18.9 conditions first.');
    }

    const paid = await db.$transaction(async (tx) => {
      await tx.ledgerEntry.create({
        data: {
          memberId: claim.memberId,
          account: input.kind,
          entryKind: 'PAYOUT',
          amountCents: -input.amount,
          description: `${claim.reference} — paid to ${input.paidTo}`,
          descriptionSw: `${claim.reference} — amelipwa ${input.paidTo}`,
          occurredAt: orgDateFromInput(input.paidOn),
          caseEventId: claim.id,
          createdByUserId: ctx.userId,
        },
      });
      const total = await paidOutCents(claim.id, tx);
      const benefitPaid = total >= (claim.benefitCents ?? 0) && (claim.benefitCents ?? 0) > 0;
      if (benefitPaid && claim.status !== 'PAID') {
        await tx.claim.update({ where: { id: claim.id }, data: { status: 'PAID', paidAt: await now() } });
      }
      await recomputeBalance(tx, claim.memberId);
      await writeAudit({
        tx,
        action: 'CLAIM_PAYOUT_RECORDED',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `Paid ${formatUSD(input.amount)} (${input.kind}) on ${claim.reference} to ${input.paidTo}`,
        metadata: { paidOn: input.paidOn, paidTo: input.paidTo },
      });
      return total;
    });
    revalidateClaim(claim.id, claim.memberId);
    return { paidCents: paid };
  },
});

/** Funga — the case is done. */
export const closeClaim = defineAction({
  name: 'closeClaim',
  guard: 'admin',
  schema: claimIdSchema,
  async handler(input): Promise<{ ok: true }> {
    const claim = await loadClaim(input.claimId);
    // Shares still owed stay collectable after closing: they belong to members.
    if (!['PAID', 'VOLUNTARY'].includes(claim.status)) {
      actionError('Only a paid or voluntary case can be closed.');
    }
    await db.$transaction(async (tx) => {
      await tx.claim.update({ where: { id: claim.id }, data: { status: 'CLOSED', closedAt: await now() } });
      await writeAudit({
        tx,
        action: 'CLAIM_CLOSED',
        entityType: 'Claim',
        entityId: claim.id,
        onBehalfOfMemberId: claim.memberId,
        summary: `Closed ${claim.reference}`,
      });
    });
    revalidateClaim(claim.id);
    return { ok: true };
  },
});
