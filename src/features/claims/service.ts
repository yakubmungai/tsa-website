import 'server-only';
import { randomInt, randomUUID } from 'node:crypto';
import type { Claim, ClaimType, LedgerAccount, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { now } from '@/lib/clock';
import { CLAIM_TYPES, type ClaimTypeKey, type StandingTier } from '@/lib/finance/constants';
import { computeStanding, drawableFromAdvance } from '@/lib/finance/balance';
import { LEVY_ACCOUNTS, getMemberStanding, recomputeBalances } from '@/lib/finance/ledger';
import { assessEligibility, type EligibilityResult } from '@/lib/finance/eligibility';
import {
  assignBillingMonth,
  eligiblePayers,
  shareChargedAt,
  shareDueAt,
  splitLevy,
  type CapBucket,
  type ExistingShare,
} from '@/lib/finance/levy';
import { orgDateFromInput, orgMonthKey } from '@/lib/finance/dates';
import type { FileClaimInput } from '@/lib/validations';

type Tx = Prisma.TransactionClient;

/** Thrown for a refusal the officer should read, e.g. announcing twice. */
export class ClaimError extends Error {}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Short, phone-readable case reference, e.g. "TSA-C-4K2P9". */
export function claimReference(): string {
  let body = '';
  for (let i = 0; i < 5; i++) body += ALPHABET[randomInt(0, ALPHABET.length)];
  return `TSA-C-${body}`;
}

/** The rules a case is paid under — re-routed at approval if the reviewer said so. */
export function effectiveType(claim: Pick<Claim, 'type' | 'effectiveType'>): ClaimTypeKey {
  return (claim.effectiveType ?? claim.type) as ClaimTypeKey;
}

export function capBucketFor(type: ClaimType): CapBucket {
  return CLAIM_TYPES[type as ClaimTypeKey].capBucket;
}

/** Fields shared by a member's report and an officer's, ready for Prisma. */
export async function claimData(
  input: FileClaimInput,
  asOf: Date
): Promise<Omit<Prisma.ClaimUncheckedCreateInput, 'memberId' | 'reference'>> {
  return {
    type: input.type,
    relationship: input.relationship,
    subjectName: input.subjectName,
    subjectAge: input.subjectAge ?? null,
    subjectLivesInUsa: input.subjectLivesInUsa ?? null,
    hardshipCategory: input.type === 'HARDSHIP' ? (input.hardshipCategory ?? null) : null,
    eventDate: orgDateFromInput(input.eventDate),
    reportedAt: asOf,
    description: input.description,
    contactPhone: input.contactPhone ?? null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    recipientRelationship: input.recipientRelationship ?? null,
    memorialRequested: input.memorialRequested,
    memorialDate: input.memorialDate ? orgDateFromInput(input.memorialDate) : null,
  };
}

/** Create a case with a unique phone-readable reference, retrying on collision. */
export async function createClaimRow(
  tx: Prisma.TransactionClient,
  data: Omit<Prisma.ClaimUncheckedCreateInput, 'reference'>
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = claimReference();
    const clash = await tx.claim.findUnique({ where: { reference }, select: { id: true } });
    if (!clash) return tx.claim.create({ data: { ...data, reference } });
  }
  throw new Error('Could not allocate a case reference');
}

// ── Review ──────────────────────────────────────────────────────────────────

/**
 * Everything the reviewer needs, computed fresh: the member's standing on the
 * event date (Art 18.9) and the eligibility flags (Art 4.3–4.5).
 */
export async function reviewClaim(claimId: string): Promise<{
  claim: Claim;
  tierAtEvent: StandingTier;
  standingAtEventCents: number;
  eligibility: EligibilityResult;
}> {
  const claim = await db.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new ClaimError('Case not found.');
  const member = await db.member.findUniqueOrThrow({ where: { id: claim.memberId } });

  const standing = await getMemberStanding(claim.memberId, { asOf: claim.eventDate });
  const prior = await db.claim.findMany({
    where: {
      memberId: claim.memberId,
      id: { not: claim.id },
      status: { in: ['APPROVED', 'COLLECTING', 'PAID', 'CLOSED'] },
    },
    select: { eventDate: true },
  });

  const eligibility = assessEligibility({
    type: claim.type as ClaimTypeKey,
    relationship: claim.relationship,
    subjectName: claim.subjectName,
    subjectAge: claim.subjectAge,
    subjectLivesInUsa: claim.subjectLivesInUsa,
    hardshipCategory: claim.hardshipCategory,
    eventDate: claim.eventDate,
    reportedAt: claim.reportedAt,
    member: {
      joinedAt: member.joinedAt,
      joinedAtEstimated: member.joinedAtEstimated,
      husbandWife: member.husbandWife,
      parents: member.parents,
      children: member.children,
      siblings: member.siblings,
    },
    tierAtEvent: standing.tier,
    shortfallAtEventCents: standing.shortfallCents,
    priorCases: prior,
  });

  return { claim, tierAtEvent: standing.tier, standingAtEventCents: standing.standingCents, eligibility };
}

// ── Announce ────────────────────────────────────────────────────────────────

export interface AnnounceResult {
  payers: number;
  totalCents: number;
  /** The most common share, for the announcement message. */
  typicalShareCents: number;
  deferred: number;
  fromAdvanceCents: number;
}

/**
 * Announce an approved case: charge every contributing member their share.
 *
 * For each payer, in one transaction:
 *  - an Assessment row, in the first month their Art 17 cap allows;
 *  - a CHARGE on the levy account, dated when that month's share falls due;
 *  - if they have advance savings, a transfer from the advance that covers as
 *    much of the share as it can (drawableFromAdvance never overdraws — what
 *    it cannot cover stays owed, Art 17.4).
 *
 * The shares always add up to the pool exactly (splitLevy).
 */
export async function announceClaim(
  claimId: string,
  userId: string | null
): Promise<{ claim: Claim; result: AnnounceResult }> {
  const asOf = await now();

  return db.$transaction(
    async (tx) => {
      const claim = await tx.claim.findUnique({ where: { id: claimId } });
      if (!claim) throw new ClaimError('Case not found.');
      if (claim.status !== 'APPROVED') throw new ClaimError('Only an approved case can be announced.');
      if (!claim.levyPoolCents || claim.levyPoolCents <= 0) {
        throw new ClaimError('This case has no amount to collect. Mark it as kihiari instead.');
      }

      const type = effectiveType(claim);
      const rule = CLAIM_TYPES[type];
      const bucket = rule.capBucket;

      const candidates = await tx.member.findMany({
        select: { id: true, status: true, archivedAt: true, memberNumber: true, names: true },
      });
      const payers = eligiblePayers(
        candidates.map((c) => ({ ...c, archived: c.archivedAt !== null })),
        rule.divisor,
        claim.memberId
      );
      if (payers.length === 0) throw new ClaimError('There are no members to divide this case among.');
      const shares = splitLevy(claim.levyPoolCents, payers);
      const payerIds = payers.map((p) => p.id);

      // Existing shares this month onward, for the caps.
      const announceMonth = orgMonthKey(asOf);
      const existingRows = await tx.assessment.findMany({
        where: { memberId: { in: payerIds }, billingMonth: { gte: announceMonth } },
        select: { memberId: true, billingMonth: true, amountCents: true, claim: { select: { type: true, effectiveType: true } } },
      });
      const existingBy = new Map<string, ExistingShare[]>();
      for (const r of existingRows) {
        const list = existingBy.get(r.memberId) ?? [];
        list.push({ billingMonth: r.billingMonth, amountCents: r.amountCents, bucket: capBucketFor(effectiveType(r.claim)) });
        existingBy.set(r.memberId, list);
      }

      // Advance each payer holds, counting draws already committed for future
      // months — so two deferred shares cannot both spend the same savings.
      const advances = await tx.ledgerEntry.groupBy({
        by: ['memberId'],
        where: { memberId: { in: payerIds }, account: 'ADVANCE_DEPOSIT', voidedAt: null },
        _sum: { amountCents: true },
      });
      const advanceBy = new Map(advances.map((a) => [a.memberId as string, a._sum.amountCents ?? 0]));

      const assessments: Prisma.AssessmentCreateManyInput[] = [];
      const entries: Prisma.LedgerEntryCreateManyInput[] = [];
      const levyAccount = rule.levyAccount as LedgerAccount;
      const labelEn = `${claim.reference} — ${claim.subjectName}`;
      let deferred = 0;
      let fromAdvanceCents = 0;

      for (const payer of payers) {
        const share = shares.get(payer.id) ?? 0;
        if (share <= 0) continue;
        const billingMonth = assignBillingMonth(existingBy.get(payer.id) ?? [], bucket, share, announceMonth);
        if (billingMonth !== announceMonth) deferred++;
        const chargedAt = shareChargedAt(asOf, announceMonth, billingMonth);
        const dueAt = shareDueAt(asOf, announceMonth, billingMonth);
        const assessmentId = randomUUID();

        assessments.push({ id: assessmentId, claimId: claim.id, memberId: payer.id, amountCents: share, billingMonth, dueAt });
        const common = { memberId: payer.id, caseEventId: claim.id, assessmentId, occurredAt: chargedAt, createdByUserId: userId };
        entries.push({
          ...common,
          account: levyAccount,
          entryKind: 'CHARGE',
          amountCents: -share,
          description: `Contribution: ${labelEn}`,
          descriptionSw: `Mchango: ${labelEn}`,
          idempotencyKey: `levy:${claim.id}:${payer.id}`,
        });

        const draw = drawableFromAdvance(advanceBy.get(payer.id) ?? 0, share);
        if (draw > 0) {
          advanceBy.set(payer.id, (advanceBy.get(payer.id) ?? 0) - draw);
          fromAdvanceCents += draw;
          entries.push({
            ...common,
            account: 'ADVANCE_DEPOSIT',
            entryKind: 'ADJUSTMENT',
            amountCents: -draw,
            description: `Taken from advance savings for ${labelEn}`,
            descriptionSw: `Imetolewa kwenye akiba kwa ${labelEn}`,
            idempotencyKey: `levy:${claim.id}:${payer.id}:advance-out`,
          });
          entries.push({
            ...common,
            account: levyAccount,
            entryKind: 'PAYMENT',
            amountCents: draw,
            description: `Paid from advance savings`,
            descriptionSw: `Imelipwa kutoka akiba`,
            idempotencyKey: `levy:${claim.id}:${payer.id}:advance-in`,
          });
        }
      }

      await tx.assessment.createMany({ data: assessments });
      await tx.ledgerEntry.createMany({ data: entries });
      await recomputeBalances(tx, payerIds);

      const updated = await tx.claim.update({
        where: { id: claim.id },
        data: { status: 'COLLECTING', announcedAt: asOf, dueAt: shareDueAt(asOf, announceMonth, announceMonth) },
      });

      const counts = new Map<number, number>();
      for (const a of assessments) counts.set(a.amountCents, (counts.get(a.amountCents) ?? 0) + 1);
      const typicalShareCents = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

      return {
        claim: updated,
        result: {
          payers: assessments.length,
          totalCents: assessments.reduce((s, a) => s + a.amountCents, 0),
          typicalShareCents,
          deferred,
          fromAdvanceCents,
        },
      };
    },
    { timeout: 60_000, maxWait: 10_000 }
  );
}

// ── Shares: what each member owes on each case ──────────────────────────────

export type ShareState = 'UPCOMING' | 'OPEN' | 'OVERDUE' | 'PAID' | 'EXCUSED';

export interface ShareView {
  id: string;
  claimId: string;
  memberId: string;
  amountCents: number;
  billingMonth: string;
  dueAt: Date;
  excusedAt: Date | null;
  excuseNote: string | null;
  paidCents: number;
  fromAdvanceCents: number;
  outstandingCents: number;
  state: ShareState;
}

/**
 * Shares with what has been paid on each, derived from the ledger.
 */
export async function loadShares(
  where: Prisma.AssessmentWhereInput,
  asOf: Date,
  client: Tx | typeof db = db
): Promise<ShareView[]> {
  const rows = await client.assessment.findMany({ where, orderBy: [{ dueAt: 'asc' }] });
  if (rows.length === 0) return [];
  const entries = await client.ledgerEntry.findMany({
    where: { assessmentId: { in: rows.map((r) => r.id) }, voidedAt: null },
    select: { assessmentId: true, account: true, entryKind: true, amountCents: true, occurredAt: true, idempotencyKey: true },
  });
  const byAssessment = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = byAssessment.get(e.assessmentId!) ?? [];
    list.push(e);
    byAssessment.set(e.assessmentId!, list);
  }
  return rows.map((r) => {
    const mine = byAssessment.get(r.id) ?? [];
    const levy = mine.filter((e) => LEVY_ACCOUNTS.includes(e.account));
    const charged = levy.some((e) => e.entryKind === 'CHARGE' && e.occurredAt <= asOf);
    const balance = levy.filter((e) => e.occurredAt <= asOf).reduce((s, e) => s + e.amountCents, 0);
    const credits = levy.filter((e) => e.amountCents > 0);
    const fromAdvanceCents = credits
      .filter((e) => e.idempotencyKey?.endsWith(':advance-in'))
      .reduce((s, e) => s + e.amountCents, 0);
    const paidCents = credits.reduce((s, e) => s + e.amountCents, 0);
    const outstandingCents = charged ? Math.max(0, -balance) : r.amountCents - Math.min(r.amountCents, paidCents);

    let state: ShareState;
    if (r.excusedAt && outstandingCents > 0) state = 'EXCUSED';
    else if (charged && outstandingCents === 0) state = 'PAID';
    else if (!charged) state = outstandingCents === 0 ? 'PAID' : 'UPCOMING';
    else state = r.dueAt < asOf ? 'OVERDUE' : 'OPEN';

    return {
      id: r.id,
      claimId: r.claimId,
      memberId: r.memberId,
      amountCents: r.amountCents,
      billingMonth: r.billingMonth,
      dueAt: r.dueAt,
      excusedAt: r.excusedAt,
      excuseNote: r.excuseNote,
      paidCents,
      fromAdvanceCents,
      outstandingCents,
      state,
    };
  });
}

/**
 * Put money against one share. Used by the officer's "record payment" and by
 * confirmed payments in Stage 4.
 */
export async function applyToShare(
  tx: Tx,
  input: {
    assessmentId: string;
    amountCents: number;
    occurredAt: Date;
    userId: string | null;
    note: string;
    paymentId?: string | null;
    idempotencyKey?: string | null;
  }
) {
  const share = await tx.assessment.findUnique({
    where: { id: input.assessmentId },
    include: { claim: { select: { id: true, reference: true, subjectName: true, type: true, effectiveType: true } } },
  });
  if (!share) throw new ClaimError('Share not found.');
  const account = CLAIM_TYPES[effectiveType(share.claim)].levyAccount as LedgerAccount;
  await tx.ledgerEntry.create({
    data: {
      memberId: share.memberId,
      account,
      entryKind: 'PAYMENT',
      amountCents: input.amountCents,
      description: input.note || `Payment for ${share.claim.reference}`,
      descriptionSw: input.note || `Malipo ya ${share.claim.reference}`,
      occurredAt: input.occurredAt,
      caseEventId: share.claim.id,
      assessmentId: share.id,
      paymentId: input.paymentId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      createdByUserId: input.userId,
    },
  });
  return share;
}

// ── Payout ──────────────────────────────────────────────────────────────────

/** Total paid out on a case so far (payouts are negative entries). */
export async function paidOutCents(claimId: string, client: Tx | typeof db = db): Promise<number> {
  const agg = await client.ledgerEntry.aggregate({
    where: { caseEventId: claimId, account: { in: ['BENEFIT_PAYOUT', 'MEMORIAL_GRANT'] }, voidedAt: null },
    _sum: { amountCents: true },
  });
  return -(agg._sum.amountCents ?? 0);
}

/** Collected on a case so far: every payment and advance draw against its shares. */
export async function collectedCents(claimId: string, client: Tx | typeof db = db): Promise<number> {
  const agg = await client.ledgerEntry.aggregate({
    where: { caseEventId: claimId, account: { in: LEVY_ACCOUNTS }, entryKind: 'PAYMENT', voidedAt: null },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

/** A member's standing computed from entries already loaded — for many members at once. */
export function standingFromEntries(
  entries: { account: string; amountCents: number; occurredAt: Date; voidedAt: Date | null }[],
  asOf: Date
) {
  return computeStanding({ entries, joinedAt: null, asOf });
}
