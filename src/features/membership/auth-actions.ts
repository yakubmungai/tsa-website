'use server';

import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';
import { hashPassword } from '@/lib/crypto';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// Send 6-digit verification code to email
export async function sendVerificationCode(email: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    // 2. Save/Update VerificationToken
    await db.verificationToken.upsert({
      where: {
        target_token: {
          target: cleanEmail,
          token: code,
        },
      },
      create: {
        target: cleanEmail,
        token: code,
        expiresAt,
      },
      update: {
        expiresAt,
      },
    });

    // 3. Send email using Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'TSA Portal <portal@mail.tansha.org>',
        to: [cleanEmail],
        subject: `Your TSA Verification Code: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #0056b3; text-align: center;">Tanzania Sharing Association</h2>
            <p>Hello,</p>
            <p>You requested a verification code to access the TSA Member Portal. Please use the 6-digit code below to complete your verification. This code will expire in 15 minutes.</p>
            <div style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; letter-spacing: 5px; color: #0056b3; background: #f8fafc; border-radius: 6px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 13px;">If you did not make this request, you can safely ignore this email.</p>
          </div>
        `,
      });
    } else {
      console.log(`[DEV/MOCK] OTP code for ${cleanEmail}: ${code}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    return { success: false, error: err.message || 'Failed to send verification code' };
  }
}

// Lookup profile by phone or email
export async function lookupMemberProfile(phoneOrEmail: string) {
  try {
    const term = phoneOrEmail.trim();
    if (!term) return { success: false, error: 'Please enter your phone number or email.' };

    // Search by phone or email
    const member = await db.member.findFirst({
      where: {
        OR: [
          { phone: { equals: term } },
          { phone: { contains: term } },
          { user: { email: { equals: term.toLowerCase() } } },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      return { success: false, error: 'No member profile found with that phone number or email. If you are a new member, please fill in the onboarding application.' };
    }

    if (member.user) {
      return { success: false, error: 'This profile is already registered. Please go to the Login page to sign in.' };
    }

    return { success: true, memberId: member.id, names: member.names };
  } catch (err: any) {
    console.error('Profile lookup error:', err);
    return { success: false, error: 'An error occurred during lookup.' };
  }
}

// Verify OTP code and register password
export async function verifyOTPAndRegister(values: {
  memberId: string;
  email: string;
  code: string;
  passwordHash: string;
}) {
  try {
    const { memberId, email, code, passwordHash } = values;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify code
    const tokenRecord = await db.verificationToken.findFirst({
      where: {
        target: cleanEmail,
        token: code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      return { success: false, error: 'Invalid or expired verification code.' };
    }

    // 2. Verify Member is not already registered
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { memberId: memberId },
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: 'This member profile or email is already registered.' };
    }

    // 3. Create User account linked to Member
    const hashedPassword = hashPassword(passwordHash);
    await db.user.create({
      data: {
        email: cleanEmail,
        passwordHash: hashedPassword,
        role: 'MEMBER',
        memberId: memberId,
      },
    });

    // 4. Delete token after successful use
    await db.verificationToken.delete({
      id: tokenRecord.id,
    } as any).catch(() => {}); // ignore delete failure

    return { success: true };
  } catch (err: any) {
    console.error('OTP Registration error:', err);
    return { success: false, error: err.message || 'Failed to complete registration.' };
  }
}
