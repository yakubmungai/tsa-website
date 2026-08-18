import { describe, it, expect } from 'vitest';
import { postTransactionSchema, memberFormSchema, phoneSchema } from './validations';

const MEMBER_ID = '0f2f8b1e-4a1e-4c5b-9f3d-2c7a1b8e5d40';

describe('postTransactionSchema', () => {
  it('accepts a normal admin entry and converts to exact cents', () => {
    const result = postTransactionSchema.parse({
      memberId: MEMBER_ID,
      amount: '25.00',
      type: 'MEMBERSHIP',
      description: 'April dues',
    });
    expect(result.amount).toBe(2500);
  });

  it('accepts a negative amount, since dues are posted as debits', () => {
    expect(postTransactionSchema.parse({
      memberId: MEMBER_ID,
      amount: '-100',
      type: 'ADVANCE',
      description: '',
    }).amount).toBe(-10_000);
  });

  it('rejects the inputs that previously reached a Decimal(10,2) column', () => {
    const bad = ['abc', '', '999999999999', 'NaN', 'Infinity', '1.2.3', '12.345'];
    for (const amount of bad) {
      const result = postTransactionSchema.safeParse({
        memberId: MEMBER_ID,
        amount,
        type: 'ADVANCE',
        description: '',
      });
      expect(result.success, `expected "${amount}" to be rejected`).toBe(false);
    }
  });

  it('rejects an unknown transaction type', () => {
    expect(
      postTransactionSchema.safeParse({
        memberId: MEMBER_ID,
        amount: '25',
        type: 'PAYOUT',
        description: '',
      }).success
    ).toBe(false);
  });

  it('rejects a non-uuid member reference', () => {
    expect(
      postTransactionSchema.safeParse({
        memberId: 'not-a-uuid',
        amount: '25',
        type: 'ADVANCE',
        description: '',
      }).success
    ).toBe(false);
  });

  it('rejects unknown keys rather than passing them to Prisma', () => {
    const result = postTransactionSchema.safeParse({
      memberId: MEMBER_ID,
      amount: '25',
      type: 'ADVANCE',
      description: '',
      role: 'ADMIN', // an attacker appending a field
    });
    expect(result.success).toBe(false);
  });
});

describe('memberFormSchema', () => {
  it('accepts a minimal profile and defaults the list fields', () => {
    const result = memberFormSchema.parse({ names: 'Amina Hassan' });
    expect(result.parents).toEqual([]);
    expect(result.witnesses).toEqual([]);
    expect(result.phone).toBeUndefined();
  });

  it('treats blank optional fields as absent rather than empty strings', () => {
    const result = memberFormSchema.parse({ names: 'Amina Hassan', phone: '   ' });
    expect(result.phone).toBeUndefined();
  });

  it('requires a real name', () => {
    expect(memberFormSchema.safeParse({ names: 'A' }).success).toBe(false);
    expect(memberFormSchema.safeParse({ names: '  ' }).success).toBe(false);
    expect(memberFormSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(
      memberFormSchema.safeParse({ names: 'Amina Hassan', archivedAt: null }).success
    ).toBe(false);
  });

  it('rejects a witness entry with no name', () => {
    expect(
      memberFormSchema.safeParse({
        names: 'Amina Hassan',
        witnesses: [{ name: '', phone: '555' }],
      }).success
    ).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('normalises to E.164', () => {
    expect(phoneSchema.parse('563-210-1022')).toBe('+15632101022');
  });

  it('rejects numbers it cannot parse confidently', () => {
    expect(phoneSchema.safeParse('349-460-602').success).toBe(false);
    expect(phoneSchema.safeParse('346-481-7991/832-677-5667').success).toBe(false);
  });
});
