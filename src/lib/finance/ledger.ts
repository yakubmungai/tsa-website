import 'server-only';
import { Prisma, type LedgerAccount, type LedgerEntry, type LedgerEntryKind } from '@prisma/client';
import { db } from '@/lib/db';
import { now } from '@/lib/clock';
import { computeStanding, duesYearFor, type MemberStanding } from './balance';
import { orgIsoDate } from './dates';

/**
 * The only code that writes to the ledger.
 *
 * Every function takes the caller's transaction client, so a ledger entry, the
 * cached balance and the audit row describing them commit or roll back
 * together. Nothing here writes audit rows itself: only the caller knows what
 * the entry is for and who asked for it.
 */

type Tx = Prisma.TransactionClient;

/** The two levy accounts. What a member still owes on a case lives here. */
export const LEVY_ACCOUNTS: LedgerAccount[] = ['HARDSHIP_LEVY', 'DEATH_LEVY'];

export interface PostEntryInput {
  memberId: string | null;
  account: LedgerAccount;
  entryKind: LedgerEntryKind;
  amountCents: number;
  description: string;
  descriptionSw?: string | null;
  occurredAt: Date;
  caseEventId?: string | null;
  assessmentId?: string | null;
  paymentId?: string | null;
  /** Makes a retried post a no-op instead of a second entry. */
  idempotencyKey?: string | null;
  createdByUserId?: string | null;
}

/**
 * Post one entry.
 *
 * With an idempotency key, posting the same thing twice returns the first entry
 * rather than failing or duplicating — a double-clicked button, a retried
 * webhook, or a migration run twice all land once.
 */
export async function postEntry(tx: Tx, input: PostEntryInput): Promise<LedgerEntry> {
  if (!Number.isInteger(input.amountCents)) {
    throw new Error(`Ledger amounts are whole cents, got ${input.amountCents}`);
  }

  if (input.idempotencyKey) {
    const existing = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;
  }

  return tx.ledgerEntry.create({
    data: {
      memberId: input.memberId,
      account: input.account,
      entryKind: input.entryKind,
      amountCents: input.amountCents,
      description: input.description,
      descriptionSw: input.descriptionSw ?? null,
      occurredAt: input.occurredAt,
      caseEventId: input.caseEventId ?? null,
      assessmentId: input.assessmentId ?? null,
      paymentId: input.paymentId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

/**
 * Undo an entry by posting its opposite.
 *
 * Nothing is deleted or edited: the original stays in the history, a REVERSAL
 * row points at it, and both are marked voided so neither counts toward any
 * balance. A member reading their history sees the mistake and its correction,
 * which is what Art 6.1's right to inspect the records is for.
 */
export async function reverseEntry(
  tx: Tx,
  input: { entryId: string; reason: string; userId: string | null }
): Promise<{ original: LedgerEntry; reversal: LedgerEntry }> {
  const original = await tx.ledgerEntry.findUnique({ where: { id: input.entryId } });
  if (!original) throw new LedgerError('That entry does not exist.');
  if (original.entryKind === 'REVERSAL') throw new LedgerError('A reversal cannot be reversed.');
  if (original.voidedAt) throw new LedgerError('That entry has already been reversed.');

  const at = await now();
  const reversal = await tx.ledgerEntry.create({
    data: {
      memberId: original.memberId,
      account: original.account,
      entryKind: 'REVERSAL',
      amountCents: -original.amountCents,
      description: `Reversal: ${input.reason}`,
      descriptionSw: `Marekebisho: ${input.reason}`,
      occurredAt: at,
      caseEventId: original.caseEventId,
      assessmentId: original.assessmentId,
      paymentId: original.paymentId,
      reversesId: original.id,
      voidedAt: at,
      createdByUserId: input.userId,
    },
  });

  const voided = await tx.ledgerEntry.update({
    where: { id: original.id },
    data: { voidedAt: at },
  });

  return { original: voided, reversal };
}

/** A refusal meant for the person who asked, not an internal failure. */
export class LedgerError extends Error {}

/**
 * Outstanding levies: what the levy accounts say the member still owes.
 *
 * Only entries dated on or before `asOf`: a share pushed into next month by the
 * Art 17 cap is charged on the first of that month, and is not owed before.
 */
export function outstandingFrom(
  entries: { account: string; amountCents: number; occurredAt: Date; voidedAt: Date | null }[],
  asOf: Date
) {
  const levy = entries
    .filter(
      (e) => e.voidedAt === null && e.occurredAt <= asOf && LEVY_ACCOUNTS.includes(e.account as LedgerAccount)
    )
    .reduce((total, e) => total + e.amountCents, 0);
  return Math.max(0, -levy);
}

/**
 * Rebuild the cached balance for one member from their raw entries.
 *
 * Call inside the same transaction as the write that changed them, so the cache
 * is never observed out of step with the ledger.
 */
export async function recomputeBalance(tx: Tx, memberId: string): Promise<void> {
  await recomputeBalances(tx, [memberId]);
}

/** The same, for many members at once — announcing a case touches everyone. */
export async function recomputeBalances(tx: Tx, memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) return;
  const asOf = await now();
  const entries = await tx.ledgerEntry.findMany({
    where: { memberId: { in: memberIds } },
    select: { memberId: true, account: true, amountCents: true, occurredAt: true, voidedAt: true },
  });
  const byMember = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!e.memberId) continue;
    const list = byMember.get(e.memberId) ?? [];
    list.push(e);
    byMember.set(e.memberId, list);
  }
  const rows = memberIds.map((memberId) => {
    const mine = byMember.get(memberId) ?? [];
    const standing = computeStanding({ entries: mine, joinedAt: null, asOf });
    return Prisma.sql`(${memberId}, ${standing.netCents}, ${standing.advanceCents}, ${standing.entryFeeCents},
      ${standing.duesCents}, ${duesYearFor(asOf)}, ${outstandingFrom(mine, asOf)}, ${asOf})`;
  });

  // One statement for every member, not one per member: announcing a case or
  // the first page view of a new month touches ~155 rows, and each round trip
  // to the database costs tens of milliseconds.
  //
  // recomputedAt is the org clock, not the wall clock, so the demo time machine
  // and the staleness check in refreshStaleBalances agree.
  await tx.$executeRaw`
    INSERT INTO "MemberBalance"
      ("memberId", "netCents", "advanceCents", "entryFeeCents", "duesCents", "duesYear", "outstandingCents", "recomputedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("memberId") DO UPDATE SET
      "netCents" = EXCLUDED."netCents",
      "advanceCents" = EXCLUDED."advanceCents",
      "entryFeeCents" = EXCLUDED."entryFeeCents",
      "duesCents" = EXCLUDED."duesCents",
      "duesYear" = EXCLUDED."duesYear",
      "outstandingCents" = EXCLUDED."outstandingCents",
      "recomputedAt" = EXCLUDED."recomputedAt"`;
}

/**
 * Rebuild cached balances that predate the current month.
 *
 * Deferred shares become owed on the first of their month without any write
 * happening, so a cache built last month can be behind. Cheap to call on the
 * pages that list many members.
 */
export async function refreshStaleBalances(): Promise<void> {
  const asOf = await now();
  const monthStart = new Date(`${orgIsoDate(asOf).slice(0, 7)}-01T00:00:00.000Z`);
  const stale = await db.memberBalance.findMany({
    where: { recomputedAt: { lt: monthStart } },
    select: { memberId: true },
  });
  if (stale.length === 0) return;
  await db.$transaction((tx) => recomputeBalances(tx, stale.map((s) => s.memberId)), { timeout: 60_000 });
}

export interface MemberStandingView extends MemberStanding {
  asOf: Date;
}

/**
 * A member's full position, computed from the ledger rather than the cache.
 *
 * Pass `asOf` to see the position on a past date — how Art 18.9 decides the
 * tier for an event.
 */
export async function getMemberStanding(
  memberId: string,
  opts: { asOf?: Date } = {}
): Promise<MemberStandingView> {
  const asOf = opts.asOf ?? (await now());
  const [member, entries, missed] = await Promise.all([
    db.member.findUnique({ where: { id: memberId }, select: { joinedAt: true } }),
    db.ledgerEntry.findMany({
      where: { memberId },
      select: { account: true, amountCents: true, occurredAt: true, voidedAt: true },
    }),
    countMissedContributions(memberId, asOf),
  ]);
  const standing = computeStanding({
    entries,
    joinedAt: member?.joinedAt ?? null,
    asOf,
    outstandingCents: outstandingFrom(entries, asOf),
    missedContributions: missed,
  });
  return { ...standing, asOf };
}

/**
 * Art 17.4 — contributions past their deadline, unpaid, and not excused.
 *
 * Worked out from the ledger each time rather than stored: paying what was
 * missed clears it at once, which is exactly "adhabu hizi zitaisha … iwapo
 * mwanachama atarudisha michango yote aliokosa kuchangia".
 */
export async function countMissedContributions(memberId: string, asOf: Date): Promise<number> {
  const overdue = await db.assessment.findMany({
    where: { memberId, dueAt: { lt: asOf }, excusedAt: null },
    select: { id: true },
  });
  if (overdue.length === 0) return 0;
  const sums = await db.ledgerEntry.groupBy({
    by: ['assessmentId'],
    where: {
      assessmentId: { in: overdue.map((a) => a.id) },
      account: { in: LEVY_ACCOUNTS },
      voidedAt: null,
      occurredAt: { lte: asOf },
    },
    _sum: { amountCents: true },
  });
  return sums.filter((s) => (s._sum.amountCents ?? 0) < 0).length;
}
