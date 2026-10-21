import 'server-only';
import { Resend } from 'resend';
import { isDemoMode } from '@/lib/demo';

/**
 * Where officer emails go, and with which key — or null when none should go.
 *
 * Live site: ADMIN_EMAIL. Test site: only DEMO_OFFICER_EMAIL, subject marked
 * [TEST], so test cases, payments and forms never reach the real officers'
 * inbox — even if RESEND_API_KEY is set there. With no test inbox set, the
 * test site sends nothing; every record is still saved.
 */
export function officerMail(): { resend: Resend; to: string; subjectPrefix: string } | null {
  if (isDemoMode()) {
    const to = process.env.DEMO_OFFICER_EMAIL;
    const key = process.env.RESEND_API_KEY || process.env.DEMO_FEEDBACK_RESEND_API_KEY;
    if (!to || !key) return null;
    return { resend: new Resend(key), to, subjectPrefix: '[TEST] ' };
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return { resend: new Resend(key), to: process.env.ADMIN_EMAIL || 'tansha.hq@gmail.com', subjectPrefix: '' };
}

/**
 * Tell the officers something happened — a case reported, a payment reported.
 *
 * Best effort: the record is already in the database and shows in the admin
 * inbox, so a failed email must never fail the member's action. Callers must
 * escape anything a member typed (src/lib/html.ts) before putting it in `html`.
 */
export async function notifyOfficers(message: { subject: string; html: string }): Promise<void> {
  const mail = officerMail();
  if (!mail) return;
  try {
    await mail.resend.emails.send({
      from: 'TSA Website <website@mail.tansha.org>',
      to: [mail.to],
      subject: mail.subjectPrefix + message.subject,
      html: message.html,
    });
  } catch (err) {
    console.error('[notify] officer email failed', message.subject, err);
  }
}
