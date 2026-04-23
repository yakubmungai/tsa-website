'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitFuneralNotice(formData: FormData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key is not configured');
    }

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

    const { data, error } = await resend.emails.send({
      from: 'TSA Website <info@tansha.org>',
      to: [process.env.ADMIN_EMAIL || 'tansha.hq@gmail.com'],
      subject: `New Funeral Notice: ${fields.deceasedName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 800px; margin: auto; border: 1px solid #eee; padding: 40px; line-height: 1.6; color: #333;">
          <div style="text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #1e293b; margin: 0; font-size: 24px;">TANZANIA SHARING ASSOCIATION (TSA)</h1>
            <p style="text-align: center; color: #666; margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Funeral Notice / Taarifa ya Msiba</p>
          </div>
          
          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">1. Reporter Information / Taarifa za Mtoa Taarifa</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; font-weight: bold;">Full Name / Jina Kamili:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.fullName}</td></tr>
          </table>

          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">2. Deceased Information / Taarifa za Marehemu</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; font-weight: bold;">Name of Deceased / Jina la Marehemu:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.deceasedName}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Relation / Uhusiano:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.relation}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Place of Passing / Mahali alipofarikia:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.placeOfPassing}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date & Time / Tarehe na Saa:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.dateTimeOfPassing}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Cause of Death / Sababu ya Kifo:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.causeOfDeath}</td></tr>
          </table>

          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">3. Emergency Contacts / Wasiliana na Watu Hawa</h2>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name / Jina</th><th style="padding: 8px; text-align: left;">Phone / Simu</th></tr>
            </thead>
            <tbody>
              ${fields.emergencyContacts.map((c: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${c.fullName}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${c.phoneNumber}</td></tr>`).join('') || '<tr><td colspan="2" style="padding: 8px; text-align: center;">None listed</td></tr>'}
            </tbody>
          </table>

          <h2 style="background: #f8fafc; padding: 10px 15px; border-left: 5px solid #1e293b; margin-top: 30px; font-size: 18px;">4. Burial Details / Taarifa za Mazishi</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 40%; font-weight: bold;">Location / Mahali pa Mazishi:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.burialLocation}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date / Tarehe ya Mazishi:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fields.burialDate}</td></tr>
          </table>

          <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            This notice was submitted via the TSA Official Website.
          </div>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Submission Error:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
