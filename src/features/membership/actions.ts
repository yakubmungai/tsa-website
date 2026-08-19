'use server';

import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { escapeDeep } from '@/lib/html';
import { recordSubmission, guardPublicSubmission } from '@/features/forms/record';

/** Hashed caller IP, for rate limiting without storing an address. */
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

export async function submitMembership(formData: FormData) {
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
      firstName: getString('firstName'),
      lastName: getString('lastName'),
      email: getString('email'),
      phone: getString('phone'),
      streetAddress: getString('streetAddress'),
      city: getString('city'),
      state: getString('state'),
      zipCode: getString('zipCode'),
      dob: getString('dob'),
      pob: getString('pob'),
      spouseName: getString('spouseName'),
      spousePhone: getString('spousePhone'),
      fatherName: getString('fatherName'),
      fatherAge: getString('fatherAge'),
      fatherResidence: getString('fatherResidence'),
      motherName: getString('motherName'),
      motherAge: getString('motherAge'),
      motherResidence: getString('motherResidence'),
      children: getArray('children'),
      siblings: getArray('siblings'),
      funeralSupervisors: getArray('funeralSupervisors'),
      witnesses: getArray('witnesses'),
      signature: getString('signature'),
      agreementDate: getString('agreementDate'),
    };

    const idFile = formData.get('idFile') as File;
    const buffer = idFile && idFile.size > 0 ? Buffer.from(await idFile.arrayBuffer()) : null;

    const guard = await guardPublicSubmission(await requestIpHash(), fields.phone);
    if (!guard.allowed) {
      return {
        success: false,
        error:
          'Too many submissions from this connection. Please try again tomorrow, or call a TSA leader.',
      };
    }

    // Escape everything the submitter typed before it reaches the markup.
    const safe = escapeDeep(fields);

    const recorded = await recordSubmission({
      formType: 'MEMBERSHIP',
      data: fields,
      submitter: {
        name: `${fields.firstName} ${fields.lastName}`.trim(),
        email: fields.email,
        phone: fields.phone,
      },
      email: {
        subject: `New TSA Membership Application: ${safe.firstName} ${safe.lastName}`,
        attachments: buffer && idFile ? [{ filename: idFile.name, content: buffer }] : undefined,
        html: `
        <div style="font-family: sans-serif; max-width: 800px; margin: auto; border: 1px solid #eee; padding: 40px; line-height: 1.6; color: #333;">
          <div style="text-align: center; border-bottom: 3px solid #0056b3; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #0056b3; margin: 0; font-size: 24px;">TANZANIA SHARING ASSOCIATION (TSA)</h1>
            <p style="text-align: center; color: #666; margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Membership Application</p>
          </div>
          
          <h2 style="background: #f4f7f6; padding: 10px 15px; border-left: 5px solid #0056b3; margin-top: 30px; font-size: 18px;">1. Personal Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%; font-weight: bold;">Full Name:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.firstName} ${safe.lastName}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.email}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.phone}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Address:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.streetAddress}, ${safe.city}, ${safe.state} ${safe.zipCode}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date of Birth:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.dob}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Place of Birth:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.pob}</td></tr>
          </table>

          <h2 style="background: #f4f7f6; padding: 10px 15px; border-left: 5px solid #0056b3; margin-top: 30px; font-size: 18px;">2. Family Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
             <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%; font-weight: bold;">Spouse:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.spouseName} (${safe.spousePhone})</td></tr>
             <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Father:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.fatherName} (Age: ${safe.fatherAge}, Residence: ${safe.fatherResidence})</td></tr>
             <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Mother:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.motherName} (Age: ${safe.motherAge}, Residence: ${safe.motherResidence})</td></tr>
          </table>

          <h3 style="margin-top: 20px; color: #555; font-size: 16px;">Children</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name</th><th style="padding: 8px; text-align: left;">DOB</th></tr>
            </thead>
            <tbody>
              ${safe.children.map((c: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${c.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${c.dob}</td></tr>`).join('') || '<tr><td colspan="2" style="padding: 8px; text-align: center;">None listed</td></tr>'}
            </tbody>
          </table>

          <h3 style="margin-top: 20px; color: #555; font-size: 16px;">Siblings</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name</th><th style="padding: 8px; text-align: left;">Age</th><th style="padding: 8px; text-align: left;">Residence</th></tr>
            </thead>
            <tbody>
              ${safe.siblings.map((s: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${s.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${s.age}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${s.residence}</td></tr>`).join('') || '<tr><td colspan="3" style="padding: 8px; text-align: center;">None listed</td></tr>'}
            </tbody>
          </table>

          <h2 style="background: #f4f7f6; padding: 10px 15px; border-left: 5px solid #0056b3; margin-top: 30px; font-size: 18px;">3. Emergency & Witnesses</h2>
          <h3 style="color: #555; font-size: 16px;">Funeral Supervisors</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name</th><th style="padding: 8px; text-align: left;">Phone</th><th style="padding: 8px; text-align: left;">Residence</th></tr>
            </thead>
            <tbody>
              ${safe.funeralSupervisors.map((fs: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${fs.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fs.phone}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fs.residence}</td></tr>`).join('')}
            </tbody>
          </table>

          <h3 style="margin-top: 20px; color: #555; font-size: 16px;">Witnesses</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name</th><th style="padding: 8px; text-align: left;">Phone</th></tr>
            </thead>
            <tbody>
              ${safe.witnesses.map((w: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${w.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${w.phone}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2 style="background: #fffbeb; padding: 10px 15px; border-left: 5px solid #d97706; margin-top: 30px; font-size: 18px;">4. Digital Signature</h2>
          <div style="padding: 20px; border: 2px dashed #ddd; text-align: center; background: #fdfdfd;">
            <p style="margin: 0; font-size: 14px; color: #999;">Signed Dynamically by Member</p>
            <p style="font-family: 'Brush Script MT', cursive, serif; font-size: 32px; color: #0056b3; margin: 15px 0;">${safe.signature}</p>
            <p style="margin: 0; font-size: 14px; color: #666;">Date: ${safe.agreementDate}</p>
          </div>

          <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            This application was submitted via the TSA Official Website. All data is stored in the association's dynamic records.
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

export async function submitConstitution(values: Record<string, string | boolean>) {
  try {
    const str = (key: string) =>
      typeof values[key] === 'string' ? (values[key] as string) : undefined;

    const guard = await guardPublicSubmission(await requestIpHash(), str('phone'));
    if (!guard.allowed) {
      return {
        success: false,
        error:
          'Too many submissions from this connection. Please try again tomorrow, or call a TSA leader.',
      };
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      streetAddress,
      city,
      state,
      zipCode,
      signature,
      agreementDate,
    } = escapeDeep(values);

    const recorded = await recordSubmission({
      formType: 'CONSTITUTION',
      data: values,
      submitter: {
        name: `${str('firstName') ?? ''} ${str('lastName') ?? ''}`.trim(),
        email: str('email'),
        phone: str('phone'),
      },
      email: {
        subject: `Constitution Agreement Signed: ${firstName} ${lastName}`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px; color: #333;">
          <div style="text-align: center; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0; font-size: 24px;">TANZANIA SHARING ASSOCIATION (TSA)</h1>
            <p style="text-align: center; color: #666; margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase;">Constitution Agreement Signature</p>
          </div>
          
          <p>The following member has signed the TSA Constitution agreement digitally.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9f9f9;"><td style="padding: 12px; border: 1px solid #eee; font-weight: bold; width: 35%;">Member Name:</td><td style="padding: 12px; border: 1px solid #eee;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 12px; border: 1px solid #eee;">${email}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 12px; border: 1px solid #eee;">${phone}</td></tr>
            <tr><td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">Address:</td><td style="padding: 12px; border: 1px solid #eee;">${streetAddress}, ${city}, ${state} ${zipCode}</td></tr>
          </table>

          <div style="margin-top: 30px; padding: 30px; border: 2px dashed #059669; border-radius: 12px; background: #f0fdf4; text-align: center;">
            <p style="margin: 0; font-size: 0.9em; color: #059669; margin-bottom: 10px; font-weight: bold; text-transform: uppercase;">Digital Signature Verified:</p>
            <p style="margin: 0; font-family: 'Brush Script MT', cursive, serif; font-size: 36px; color: #1e293b;">${signature}</p>
            <p style="margin: 0; font-size: 0.8em; color: #64748b; margin-top: 10px;">Signed on: ${agreementDate}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.9em;">
            <p style="margin-top: 0; font-weight: bold; color: #475569;">Declarations:</p>
            <ul style="margin-bottom: 0; color: #475569;">
              <li>Mwanachama amesome na kuelewa Katiba ya TSA.</li>
              <li>Mwanachama anakubali masharti yote na naahidi kuitii Katiba na sheria zote za TSA.</li>
            </ul>
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

export async function submitRenewal(formData: FormData) {
  try {

    // Dev Note for New Grad: We use a helper to extract strings safely from FormData.
    // In a production app, always validate that the keys exist.
    const getString = (key: string) => formData.get(key) as string || 'N/A';
    
    // Dev Note: Arrays are sent as JSON strings in FormData. We parse them back to objects.
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
      address: getString('address'),
      phone: getString('phone'),
      witnesses: getArray('witnesses'),
      administrators: getArray('administrators'),
      signature: getString('signature'),
      agreementDate: getString('agreementDate'),
    };

    const guard = await guardPublicSubmission(await requestIpHash(), fields.phone);
    if (!guard.allowed) {
      return {
        success: false,
        error:
          'Too many submissions from this connection. Please try again tomorrow, or call a TSA leader.',
      };
    }

    const safe = escapeDeep(fields);

    const recorded = await recordSubmission({
      formType: 'RENEWAL',
      data: fields,
      submitter: { name: fields.fullName, phone: fields.phone },
      email: {
        subject: `TSA Renewal Form (2025-2030): ${safe.fullName}`,
        html: `
        <div style="font-family: sans-serif; max-width: 800px; margin: auto; border: 1px solid #eee; padding: 40px; line-height: 1.6; color: #333;">
          <div style="text-align: center; border-bottom: 3px solid #d97706; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin: 0; font-size: 24px;">TANZANIA SHARING ASSOCIATION (TSA)</h1>
            <p style="text-align: center; color: #666; margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Membership Renewal (2025-2030)</p>
          </div>
          
          <h2 style="background: #fffbeb; padding: 10px 15px; border-left: 5px solid #d97706; margin-top: 30px; font-size: 18px;">1. Personal Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%; font-weight: bold;">Full Name:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.fullName}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Address:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.address}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.phone}</td></tr>
          </table>

          <h2 style="background: #f4f7f6; padding: 10px 15px; border-left: 5px solid #0056b3; margin-top: 30px; font-size: 18px;">2. Witnesses</h2>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name</th><th style="padding: 8px; text-align: left;">Phone</th></tr>
            </thead>
            <tbody>
              ${safe.witnesses.map((w: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${w.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${w.phone}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2 style="background: #f4f7f6; padding: 10px 15px; border-left: 5px solid #0056b3; margin-top: 30px; font-size: 18px;">3. Administrators (Next of Kin)</h2>
          <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #eee;">
            <thead style="background: #eee;">
              <tr><th style="padding: 8px; text-align: left;">Name</th><th style="padding: 8px; text-align: left;">Relationship</th><th style="padding: 8px; text-align: left;">Phone</th></tr>
            </thead>
            <tbody>
              ${safe.administrators.map((a: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${a.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${a.relationship}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${a.phone}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2 style="background: #fffbeb; padding: 10px 15px; border-left: 5px solid #d97706; margin-top: 30px; font-size: 18px;">4. Digital Commitment</h2>
          <div style="padding: 20px; border: 2px dashed #d97706; border-radius: 8px; background: #fffdfa; margin-top: 10px;">
            <p style="margin: 0; font-size: 14px; color: #666; font-style: italic;">"I agree to join TSA for a five (5) year contract from April 2025 to March 2030... I promise to be faithful and follow all rules..."</p>
            <div style="text-align: center; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Digitally Signed By:</p>
              <p style="font-family: 'Brush Script MT', cursive, serif; font-size: 32px; color: #d97706; margin: 10px 0;">${safe.signature}</p>
              <p style="margin: 0; font-size: 14px; color: #666;">Date: ${safe.agreementDate}</p>
            </div>
          </div>

          <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            This renewal was submitted via the TSA Official Website. All data is stored in the association's dynamic records.
          </div>
        </div>
      `,
      },
    });

    return { success: true, reference: recorded.reference };
  } catch (err) {
    console.error('Renewal Submission Error:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
