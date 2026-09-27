import { z } from 'zod';
import { parseUSDToCents, MoneyError } from './money';
import { toE164 } from './phone';
import { isIsoDate } from './finance/dates';

/**
 * Input schemas for server actions.
 *
 * Every server action must validate through one of these. Before this, actions
 * such as createMember(data: any) and the old postTransaction() spread client-supplied
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

/** A calendar date from a date input, "YYYY-MM-DD", read as a Houston date. */
export const isoDateInput = z
  .string()
  .trim()
  .refine((v) => isIsoDate(v), 'Choose a valid date');

/** The accounts an officer may post to by hand. Levies are posted by the case workflow. */
export const MANUAL_ACCOUNTS = ['ADVANCE_DEPOSIT', 'ENTRY_FEE', 'ANNUAL_DUES', 'ADJUSTMENT'] as const;

export const postLedgerEntrySchema = z
  .object({
    memberId: z.string().uuid('Invalid member reference'),
    account: z.enum(MANUAL_ACCOUNTS),
    /** IN is money received; OUT is money paid back or a charge. */
    direction: z.enum(['IN', 'OUT']),
    amount: centsFromInput.refine((c) => c > 0, 'Enter an amount greater than zero'),
    paidOn: isoDateInput,
    memo: z.string().trim().max(300).default(''),
  })
  .strict()
  .superRefine((v, ctx) => {
    // Money leaving a member's account always needs a reason on record.
    if (v.direction === 'OUT' && v.memo.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memo'], message: 'Say why' });
    }
  });

export const reverseLedgerEntrySchema = z
  .object({
    entryId: z.string().uuid('Invalid entry reference'),
    reason: z.string().trim().min(3, 'Give a short reason').max(300),
  })
  .strict();

// ── Claims (Stage 3) ────────────────────────────────────────────────────────

export const CLAIM_TYPE_VALUES = ['MEMBER_DEATH', 'CHILD_DEATH', 'RELATIVE_DEATH', 'HARDSHIP'] as const;
export const RELATIONSHIP_VALUES = ['SELF', 'SPOUSE', 'CHILD', 'PARENT_GUARDIAN', 'SIBLING'] as const;
export const HARDSHIP_VALUES = ['ILLNESS_CRITICAL', 'IMMIGRATION_DETENTION', 'FIRE'] as const;

const claimFields = z
  .object({
    type: z.enum(CLAIM_TYPE_VALUES),
    relationship: z.enum(RELATIONSHIP_VALUES),
    subjectName: z.string().trim().min(2, 'Name is required').max(160),
    subjectAge: z.coerce.number().int().min(0).max(125).optional(),
    subjectLivesInUsa: z.boolean().optional(),
    hardshipCategory: z.enum(HARDSHIP_VALUES).optional(),
    eventDate: isoDateInput,
    description: z.string().trim().min(3, 'Tell us briefly what happened').max(2000),
    contactPhone: optionalText(40),
    recipientName: optionalText(160),
    recipientPhone: optionalText(40),
    recipientRelationship: optionalText(80),
    memorialRequested: z.boolean().default(false),
    memorialDate: isoDateInput.optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  })
  .strict();

/** The rules that tie a case's type to who it can be about (Art 4.3, 4.4, 18.1). */
function claimRules(v: z.infer<typeof claimFields>, ctx: z.RefinementCtx) {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  if (v.type === 'MEMBER_DEATH') {
    if (v.relationship !== 'SELF') issue('relationship', 'A member death is about the member');
    if (!v.recipientName) issue('recipientName', 'Who receives support for the family?');
  }
  if (v.type === 'CHILD_DEATH' && v.relationship !== 'CHILD') issue('relationship', 'Choose the child');
  if (v.type === 'RELATIVE_DEATH' && v.relationship === 'SELF') issue('relationship', 'Choose the relative');
  if (v.type === 'HARDSHIP' && !v.hardshipCategory) issue('hardshipCategory', 'Choose the kind of hardship');
}

export const fileClaimSchema = claimFields.superRefine(claimRules);
export type FileClaimInput = z.infer<typeof fileClaimSchema>;

export const adminCreateClaimSchema = claimFields
  .extend({
    memberId: z.string().uuid('Choose a member'),
    sourceSubmissionId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine(claimRules);

export const claimIdSchema = z.object({ claimId: z.string().uuid() }).strict();

export const approveClaimSchema = z
  .object({
    claimId: z.string().uuid(),
    effectiveType: z.enum(CLAIM_TYPE_VALUES),
    benefit: centsFromInput.refine((c) => c > 0, 'Enter an amount greater than zero'),
    note: z.string().trim().max(1000).default(''),
  })
  .strict();

export const claimDecisionSchema = z
  .object({
    claimId: z.string().uuid(),
    note: z.string().trim().min(3, 'Give a short reason').max(1000),
  })
  .strict();

export const claimChecklistSchema = z
  .object({
    claimId: z.string().uuid(),
    field: z.enum(['documentsChecklist', 'payoutConditions']),
    key: z.string().trim().min(1).max(40).regex(/^[a-zA-Z]+$/),
    checked: z.boolean(),
  })
  .strict();

export const sharePaymentSchema = z
  .object({
    assessmentId: z.string().uuid(),
    amount: centsFromInput.refine((c) => c > 0, 'Enter an amount greater than zero'),
    paidOn: isoDateInput,
    memo: z.string().trim().max(300).default(''),
  })
  .strict();

export const excuseShareSchema = z
  .object({
    assessmentId: z.string().uuid(),
    /** Null removes the excuse. */
    note: z.string().trim().min(3, 'Say what notice was given').max(500).nullable(),
  })
  .strict();

export const payoutSchema = z
  .object({
    claimId: z.string().uuid(),
    kind: z.enum(['BENEFIT_PAYOUT', 'MEMORIAL_GRANT']),
    amount: centsFromInput.refine((c) => c > 0, 'Enter an amount greater than zero'),
    paidOn: isoDateInput,
    paidTo: z.string().trim().min(2, 'Who was paid?').max(200),
  })
  .strict();
