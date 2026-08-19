import 'server-only';
import { randomInt } from 'node:crypto';
import { Resend } from 'resend';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { toE164 } from '@/lib/phone';
import { consumeAll, POLICIES } from '@/lib/rate-limit';

/**
 * Recording a form submission.
 *
 * Database first, email second, and an email failure never loses the
 * submission. Previously all four public forms only sent email, so every
 * application TSA had ever received existed solely in a mailbox — and the admin
 * review queue, which reads from the database, was permanently empty.
 */

export type FormType = 'MEMBERSHIP' | 'CONSTITUTION' | 'FUNERAL_ASSISTANCE' | 'RENEWAL';

/**
 * Crockford base32 without the ambiguous letters, so a reference read aloud
 * over the phone cannot be misheard as a different one.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function referenceCode(): string {
  let body = '';
  for (let i = 0; i < 5; i++) body += ALPHABET[randomInt(0, ALPHABET.length)];
  return `TSA-F-${body}`;
}

export interface RecordSubmissionInput<T> {
  formType: FormType;
  data: T;
  /** Shown in the admin queue and used for duplicate detection. */
  submitter: { name?: string; email?: string; phone?: string };
  memberId?: string | null;
  locale?: 'en' | 'sw';
  source?: 'web' | 'portal' | 'manual';
  email: {
    subject: string;
    html: string;
    attachments?: { filename: string; content: Buffer }[];
  };
}

export interface RecordSubmissionResult {
  reference: string;
  submissionId: string;
}

/** Rate limit and spam checks shared by every public form. */
export async function guardPublicSubmission(ipHash: string | null, phone?: string) {
  const limit = await consumeAll([
    { policy: POLICIES.publicFormIp, key: ipHash ?? 'unknown-ip' },
    ...(phone ? [{ policy: POLICIES.publicFormPhone, key: phone }] : []),
  ]);
  return limit;
}

export async function recordSubmission<T>(
  input: RecordSubmissionInput<T>
): Promise<RecordSubmissionResult> {
  // 1. Persist. This is the part that must not fail silently.
  let submission: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < 5 && !submission; attempt++) {
    try {
      submission = await db.formSubmission.create({
        data: {
          reference: referenceCode(),
          formType: input.formType,
          data: input.data as Prisma.InputJsonValue,
          memberId: input.memberId ?? null,
          submitterName: input.submitter.name?.trim() || null,
          submitterEmail: input.submitter.email?.trim().toLowerCase() || null,
          submitterPhone: input.submitter.phone ? toE164(input.submitter.phone) : null,
          locale: input.locale ?? 'sw',
          source: input.source ?? 'web',
        },
        select: { id: true, reference: true },
      });
    } catch (err) {
      // reference is unique; retry on the rare collision.
      const code = (err as { code?: string })?.code;
      if (code !== 'P2002') throw err;
    }
  }

  if (!submission) {
    throw new Error('Could not allocate a submission reference');
  }

  // 2. Notify. Best effort — the record already exists either way.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: 'TSA Website <website@mail.tansha.org>',
        to: [process.env.ADMIN_EMAIL || 'tansha.hq@gmail.com'],
        subject: `${input.email.subject} [${submission.reference}]`,
        html: input.email.html,
        attachments: input.email.attachments,
      });

      await db.formSubmission.update({
        where: { id: submission.id },
        data: error
          ? { emailError: error.message }
          : { emailSentAt: new Date(), emailError: null },
      });
    } catch (err) {
      console.error('[forms] notification failed', submission.reference, err);
      await db.formSubmission
        .update({
          where: { id: submission.id },
          data: { emailError: err instanceof Error ? err.message : 'unknown' },
        })
        .catch(() => {});
    }
  } else {
    await db.formSubmission.update({
      where: { id: submission.id },
      data: { emailError: 'RESEND_API_KEY not configured' },
    });
  }

  return { reference: submission.reference, submissionId: submission.id };
}
