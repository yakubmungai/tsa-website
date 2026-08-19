'use server';

import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { escapeDeep } from '@/lib/html';
import { recordSubmission, guardPublicSubmission } from '@/features/forms/record';

async function requestIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip');
    if (!ip) return null;
    return createHash('sha256')
      .update(`${process.env.AUDIT_IP_PEPPER ?? ''}:${ip}`)
      .digest('hex')
      .slice(0, 32);
  } catch {
    return null;
  }
}

export async function submitFuneralNotice(formData: FormData) {
  try {

    const getString = (key: string) => formData.get(key) as string || 'N/A';
    const getArray = (key: string) => {
      const val = formData.get(key);
      if (!val) return [];
      try {
        return JSON.parse(val as string);
      } catch (e) {
        return [];
      }
    };

    const fields = {
      fullName: getString('fullName'),
      deceasedName: getString('deceasedName'),
      relation: getString('relation'),
      placeOfPassing: getString('placeOfPassing'),
      dateTimeOfPassing: getString('dateTimeOfPassing'),
      causeOfDeath: getString('causeOfDeath'),
      emergencyContacts: getArray('emergencyContacts'),
      burialLocation: getString('burialLocation'),
      burialDate: getString('burialDate'),
    };

    // Rate limited like the other public forms. Without it this endpoint can be
    // used to send fabricated bereavement notices to TSA's leadership.
    const guard = await guardPublicSubmission(await requestIpHash());
    if (!guard.allowed) {
      return {
        success: false,
        error:
          'Too many submissions from this connection. Please call a TSA leader directly — do not wait.',
      };
    }

    const safe = escapeDeep(fields);

    const recorded = await recordSubmission({
      formType: 'FUNERAL_ASSISTANCE',
      data: fields,
      submitter: { name: fields.fullName },
      email: {
        subject: `New Funeral Notice: ${safe.deceasedName}`,
        html: `
        <div style="font-family: sans-serif; max-width: 800px; margin: auto; border: 1px solid #eee; padding: 40px; line-height: 1.6; color: #333;">
          <div style="text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #1e293b; margin: 0; font-size: 24px;">TANZANIA SHARING ASSOCIATION (TSA)</h1>
            <p style="text-align: center; color: #666; margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Funeral Notice / Taarifa ya Msiba</p>
          </div>
          
          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">1. Reporter Information / Taarifa za Mtoa Taarifa</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; font-weight: bold;">Full Name / Jina Kamili:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.fullName}</td></tr>
          </table>

          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">2. Deceased Information / Taarifa za Marehemu</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; font-weight: bold;">Name of Deceased / Jina la Marehemu:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.deceasedName}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Relation / Uhusiano:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.relation}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Place of Passing / Mahali alipofarikia:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.placeOfPassing}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date & Time / Tarehe na Saa:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.dateTimeOfPassing}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Cause of Death / Sababu ya Kifo:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.causeOfDeath}</td></tr>
          </table>

          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">3. Emergency Contacts / Wasiliana na Watu Hawa</h2>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name / Jina</th><th style="padding: 8px; text-align: left;">Phone / Simu</th></tr>
            </thead>
            <tbody>
              ${safe.emergencyContacts.map((c: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${c.fullName}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${c.phoneNumber}</td></tr>`).join('') || '<tr><td colspan="2" style="padding: 8px; text-align: center;">None listed</td></tr>'}
            </tbody>
          </table>

          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">4. Burial Details / Taarifa za Mazishi</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; font-weight: bold;">Location / Mahali pa Mazishi:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.burialLocation}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date / Tarehe ya Mazishi:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.burialDate}</td></tr>
          </table>

          <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            This notice was submitted via the TSA Official Website.
          </div>
        </div>
      `,
      },
    });

    return { success: true, reference: recorded.reference };
  } catch (err) {
    console.error('Submission Error:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
