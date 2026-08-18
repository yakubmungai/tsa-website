import { z } from 'zod';
import { parseUSDToCents, MoneyError } from './money';
import { toE164 } from './phone';

/**
 * Input schemas for server actions.
 *
 * Every server action must validate through one of these. Before this, actions
 * such as createMember(data: any) and postTransaction() spread client-supplied
 * objects straight into Prisma, so an unknown key, a NaN amount or a string
 * where an array belonged all reached the database.
 *
 * `.strict()` matters as much as the field rules: it rejects keys we did not
 * ask for, rather than letting them through to Prisma.
 */

/** Trim, and treat an empty string as "not provided". */
const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v));

const contactSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    phone: optionalText(40),
  })
  .strict();

export const memberFormSchema = z
  .object({
    names: z.string().trim().min(2, 'Full name must be at least 2 characters').max(160),
    phone: optionalText(40),
    address: optionalText(300),
    husbandWife: optionalText(160),
    spousePhone: optionalText(40),
    parents: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
    children: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
    siblings: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
    witnesses: z.array(contactSchema).max(10).default([]),
    nextOfKin: z.array(contactSchema).max(10).default([]),
  })
  .strict();

export type MemberFormInput = z.infer<typeof memberFormSchema>;

/**
 * A monetary amount supplied by a human, validated into integer cents.
 *
 * The admin transaction form is a free-text box, so "abc", "999999999999",
 * NaN and Infinity all previously reached a Decimal(10,2) column and surfaced
 * as a raw Prisma error.
 */
export const centsFromInput = z
  .union([z.string(), z.number()])
  .superRefine((value, ctx) => {
    try {
      parseUSDToCents(value);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof MoneyError ? err.message : 'Invalid amount',
      });
    }
  })
  .transform((value) => parseUSDToCents(value));

export const TRANSACTION_TYPES = ['ADVANCE', 'REGISTRATION', 'MEMBERSHIP', 'OTHER'] as const;

export const postTransactionSchema = z
  .object({
    memberId: z.string().uuid('Invalid member reference'),
    amount: centsFromInput,
    type: z.enum(TRANSACTION_TYPES),
    description: z.string().trim().max(500).default(''),
  })
  .strict();

export const archiveMemberSchema = z
  .object({
    memberId: z.string().uuid('Invalid member reference'),
    // Typed by the admin to confirm; checked against the record server-side.
    confirmName: z.string().trim().min(1, 'Type the member name to confirm').max(160),
  })
  .strict();

export const memberIdSchema = z
  .object({ memberId: z.string().uuid('Invalid member reference') })
  .strict();

export const submissionIdSchema = z
  .object({ submissionId: z.string().uuid('Invalid submission reference') })
  .strict();

/**
 * A phone number, normalised to E.164.
 *
 * Rejects rather than guesses: a number we cannot parse confidently must not
 * become someone's login identity.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((value, ctx) => {
    const e164 = toE164(value);
    if (!e164) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'That does not look like a valid phone number',
      });
      return z.NEVER;
    }
    return e164;
  });

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');
