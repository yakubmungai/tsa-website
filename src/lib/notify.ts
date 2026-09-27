import 'server-only';
import { Resend } from 'resend';

/**
 * Tell the officers something happened — a case reported, a payment reported.
 *
 * Best effort: the record is already in the database and shows in the admin
 * inbox, so a failed email must never fail the member's action. Callers must
 * escape anything a member typed (src/lib/html.ts) before putting it in `html`.
 */
export async function notifyOfficers(message: { subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'TSA Website <website@mail.tansha.org>',
      to: [process.env.ADMIN_EMAIL || 'tansha.hq@gmail.com'],
      subject: message.subject,
      html: message.html,
    });
  } catch (err) {
    console.error('[notify] officer email failed', message.subject, err);
  }
}
