'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitContactMessage(formData: FormData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key is not configured');
    }

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    const { data, error } = await resend.emails.send({
      from: 'TSA Website <info@tansha.org>',
      to: [process.env.ADMIN_EMAIL || 'tansha.hq@gmail.com'],
      replyTo: email,
      subject: `New Contact Message from ${firstName} ${lastName}`,
      html: `
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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Contact Submission Error:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
