'use server';

import { z } from 'zod';
import { html } from '@/lib/html';
import { officerMail } from '@/lib/notify';
import { getIpHash } from '@/lib/audit';
import { consume, POLICIES } from '@/lib/rate-limit';

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(3).max(5000),
});

/**
 * The footer's contact form. Anyone can send it, so the input is validated,
 * escaped before it goes into the email, and limited per IP — otherwise it is
 * a relay for spam or fake messages that appear to come from TSA's website.
 */
export async function submitContactMessage(formData: FormData) {
  try {
    const parsed = contactSchema.safeParse({
      firstName: formData.get('firstName') ?? '',
      lastName: formData.get('lastName') ?? undefined,
      email: formData.get('email') ?? '',
      message: formData.get('message') ?? '',
    });
    if (!parsed.success) return { success: false, error: 'Please check the form and try again.' };
    const { firstName, lastName, email, message } = parsed.data;

    const limit = await consume(POLICIES.contactIp, (await getIpHash()) ?? 'unknown-ip');
    if (!limit.allowed) return { success: false, error: 'Too many messages. Please try again later.' };

    const mail = officerMail();
    if (!mail) {
      console.error('[contact] officer email not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { error } = await mail.resend.emails.send({
      from: 'TSA Website <website@mail.tansha.org>',
      to: [mail.to],
      replyTo: email,
      subject: `${mail.subjectPrefix}New Contact Message from ${firstName} ${lastName}`.trim(),
      html: html`
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px; color: #333;">
          <div style="text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">TSA Contact Form</h1>
            <p style="text-align: center; color: #666; margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase;">Website Inquiry</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9f9f9;"><td style="padding: 12px; border: 1px solid #eee; font-weight: bold; width: 35%;">Name:</td><td style="padding: 12px; border: 1px solid #eee;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 12px; border: 1px solid #eee;">${email}</td></tr>
          </table>

          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin-top: 0; font-weight: bold; color: #475569;">Message:</p>
            <p style="white-space: pre-wrap; color: #1e293b; line-height: 1.6;">${message}</p>
          </div>

          <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            This message was sent via the contact form on the TSA Website.
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[contact] send failed', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[contact] unexpected error', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
