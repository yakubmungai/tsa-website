'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { defineAction, actionError } from '@/lib/action';
import { getEffectiveContext, checkPermission } from '@/lib/session';
import { getLocale } from '@/lib/i18n';
import { now } from '@/lib/clock';
import { html } from '@/lib/html';
import { notifyOfficers } from '@/lib/notify';
import { orgIsoDate } from '@/lib/finance/dates';
import { fileClaimSchema } from '@/lib/validations';
import { claimData, createClaimRow } from './service';

/**
 * A member — or a helper acting for them — reports a death or hardship.
 *
 * The member is always the effective member of the session, never a value
 * from the browser, so nobody can file a case against someone else's account.
 */
export const fileClaim = defineAction({
  name: 'fileClaim',
  guard: 'auth',
  schema: fileClaimSchema,
  async handler(input, actionCtx): Promise<{ reference: string; claimId: string }> {
    const ctx = await getEffectiveContext();
    if (!ctx?.memberId) actionError('Your account is not linked to a member yet. Please contact a TSA leader.');
    if (!checkPermission(ctx, 'SUBMIT_FORMS')) {
      actionError('This member has not given you permission to send reports for them.');
    }
    // A member reports their own family's cases. Their own death is reported by
    // the family — a helper acting for them, or an officer.
    if (input.type === 'MEMBER_DEATH' && !ctx.isActing) {
      actionError('A member’s death is reported by their family or a TSA leader.');
    }

    const asOf = await now();
    if (input.eventDate > orgIsoDate(asOf)) {
      actionError('The date cannot be in the future.', { eventDate: ['The date cannot be in the future.'] });
    }

    const member = await db.member.findUnique({
      where: { id: ctx.memberId },
      select: { id: true, names: true, archivedAt: true, status: true },
    });
    if (!member || member.archivedAt) actionError('Member not found.');

    const locale = await getLocale();
    const data = await claimData(input, asOf);
    const claim = await db.$transaction(async (tx) => {
      const created = await createClaimRow(tx, {
        ...data,
        memberId: member.id,
        filedByUserId: actionCtx.userId,
        filedOnBehalf: ctx.isActing,
        locale,
      });
      await writeAudit({
        tx,
        action: 'CLAIM_FILED',
        entityType: 'Claim',
        entityId: created.id,
        onBehalfOfMemberId: member.id,
        summary: `${member.names} reported ${input.type} (${input.subjectName}) — ${created.reference}`,
        metadata: { type: input.type, relationship: input.relationship, acting: ctx.isActing },
      });
      return created;
    });

    await notifyOfficers({
      subject: `Taarifa mpya ya shida/msiba: ${member.names} [${claim.reference}]`,
      html: html`<p><strong>${member.names}</strong> ametoa taarifa (${input.type}).</p>
        <p>Aliyepatwa: ${input.subjectName} — Tarehe: ${input.eventDate}</p>
        <p>${input.description}</p>
        <p>Namba: ${claim.reference}. Ingia kwenye tovuti → Shida/Misiba ili kukagua.</p>`,
    });

    revalidatePath('/portal');
    revalidatePath('/portal/claims');
    revalidatePath('/admin');
    revalidatePath('/admin/claims');
    return { reference: claim.reference, claimId: claim.id };
  },
});
