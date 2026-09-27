import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Payment, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { now } from '@/lib/clock';
import { ANNUAL_DUES_CENTS, ENTRY_FEE_CENTS } from '@/lib/finance/constants';
import { getMemberStanding, recomputeBalance } from '@/lib/finance/ledger';
import { allocatePayment, type Allocation } from '@/lib/finance/allocation';
import { parseBankCsv } from '@/lib/finance/bank-csv';
import { matchDeposits } from '@/lib/finance/match';
import { addDays } from '@/lib/finance/dates';
import { applyToShare, loadShares } from '@/features/claims/service';

type Tx = Prisma.TransactionClient;

export class PaymentError extends Error {}

// ── What a member owes right now ────────────────────────────────────────────

export async function memberOwing(memberId: string) {
  const asOf = await now();
  const [standing, shares] = await Promise.all([
    getMemberStanding(memberId, { asOf }),
    loadShares({ memberId }, asOf),
  ]);
  const open = shares.filter((s) => s.state === 'OPEN' || s.state === 'OVERDUE');
  return {
    asOf,
    standing,
    shares: open.map((s) => ({
      assessmentId: s.id,
      outstandingCents: s.outstandingCents,
      dueAt: s.dueAt,
      overdue: s.state === 'OVERDUE',
    })),
    outstandingCents: open.reduce((t, s) => t + s.outstandingCents, 0),
    duesOwedCents: Math.max(0, ANNUAL_DUES_CENTS - standing.duesCents),
    entryFeeOwedCents: Math.max(0, ENTRY_FEE_CENTS - standing.entryFeeCents),
  };
}

// ── Confirming: the only way a payment reaches the ledger ───────────────────

const LABELS: Record<Exclude<Allocation['target'], 'SHARE'>, { account: 'ANNUAL_DUES' | 'ENTRY_FEE' | 'ADVANCE_DEPOSIT'; en: string; sw: string }> = {
  ANNUAL_DUES: { account: 'ANNUAL_DUES', en: 'Annual dues', sw: 'Ada ya mwaka' },
  ENTRY_FEE: { account: 'ENTRY_FEE', en: 'Entry fee', sw: 'Kiingilio' },
  ADVANCE_TOPUP: { account: 'ADVANCE_DEPOSIT', en: 'Advance savings', sw: 'Akiba tangulizi' },
};

const METHOD_LABEL: Record<string, string> = {
  ZELLE: 'Zelle',
  CASHAPP: 'CashApp',
  BANK_TRANSFER: 'Bank transfer',
  CHECK: 'Check',
  CASH: 'Cash',
  CARD: 'Card',
  ACH: 'Bank (ACH)',
};

/**
 * Confirm a payment: work out where it goes, post one ledger entry per part,
 * and mark it confirmed — all in the caller's transaction.
 *
 * Every entry carries the idempotency key `payment:<id>:<n>`, so confirming
 * twice (a double click, a retried webhook) posts nothing the second time.
 */
export async function confirmPaymentTx(
  tx: Tx,
  paymentId: string,
  userId: string | null
): Promise<{ payment: Payment; allocations: Allocation[] }> {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new PaymentError('Payment not found.');
  if (payment.status === 'CONFIRMED') {
    const existing = await tx.paymentAllocation.findMany({ where: { paymentId } });
    return {
      payment,
      allocations: existing.map((a) => ({
        target: a.target as Allocation['target'],
        assessmentId: a.assessmentId ?? undefined,
        amountCents: a.amountCents,
      })),
    };
  }
  if (payment.status === 'REJECTED' || payment.status === 'FAILED') {
    throw new PaymentError('This payment was rejected and cannot be confirmed.');
  }

  const owing = await memberOwing(payment.memberId);
  const allocations = allocatePayment({
    amountCents: payment.amountCents,
    preference: payment.preference === 'ADVANCE' ? 'ADVANCE' : 'AUTO',
    shares: owing.shares,
    duesOwedCents: owing.duesOwedCents,
    entryFeeOwedCents: owing.entryFeeOwedCents,
  });

  const method = METHOD_LABEL[payment.method] ?? payment.method;
  for (const [n, a] of allocations.entries()) {
    const key = `payment:${payment.id}:${n}`;
    if (a.target === 'SHARE' && a.assessmentId) {
      await applyToShare(tx, {
        assessmentId: a.assessmentId,
        amountCents: a.amountCents,
        occurredAt: payment.paidOn,
        userId,
        note: `${method}${payment.memo ? ` — ${payment.memo}` : ''}`,
        paymentId: payment.id,
        idempotencyKey: key,
      });
    } else if (a.target !== 'SHARE') {
      const label = LABELS[a.target];
      const exists = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: key } });
      if (!exists) {
        await tx.ledgerEntry.create({
          data: {
            memberId: payment.memberId,
            account: label.account,
            entryKind: 'PAYMENT',
            amountCents: a.amountCents,
            description: `${label.en} — ${method}`,
            descriptionSw: `${label.sw} — ${method}`,
            occurredAt: payment.paidOn,
            paymentId: payment.id,
            idempotencyKey: key,
            createdByUserId: userId,
          },
        });
      }
    }
  }

  // Card fees are the association's cost, recorded apart — never netted off
  // what the member is credited.
  if (payment.feeCents && payment.feeCents > 0) {
    const key = `payment:${payment.id}:fee`;
    const exists = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: key } });
    if (!exists) {
      await tx.ledgerEntry.create({
        data: {
          memberId: null,
          account: 'PROCESSING_FEE',
          entryKind: 'PAYOUT',
          amountCents: -payment.feeCents,
          description: `Card processing fee for payment ${payment.id}`,
          occurredAt: payment.paidOn,
          paymentId: payment.id,
          idempotencyKey: key,
        },
      });
    }
  }

  await tx.paymentAllocation.createMany({
    data: allocations.map((a) => ({
      paymentId: payment.id,
      target: a.target,
      assessmentId: a.assessmentId ?? null,
      amountCents: a.amountCents,
    })),
  });
  const updated = await tx.payment.update({
    where: { id: payment.id },
    data: { status: 'CONFIRMED', confirmedAt: await now(), confirmedById: userId },
  });
  await recomputeBalance(tx, payment.memberId);
  return { payment: updated, allocations };
}

// ── Pay links ───────────────────────────────────────────────────────────────

export const PAY_LINK_DAYS = 30;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A new personal pay link. Only the hash is stored; the token is shown once. */
export async function mintPayLink(memberId: string, userId: string | null, purpose = 'REMINDER'): Promise<string> {
  const token = randomBytes(18).toString('base64url');
  await db.payLink.create({
    data: {
      tokenHash: hashToken(token),
      memberId,
      purpose,
      expiresAt: addDays(await now(), PAY_LINK_DAYS),
      createdById: userId,
    },
  });
  return token;
}

export async function resolvePayLink(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const link = await db.payLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { member: { select: { id: true, names: true, memberNumber: true, archivedAt: true } } },
  });
  if (!link || link.member.archivedAt || link.expiresAt < (await now())) return null;
  return link;
}

// ── Bank statement import ───────────────────────────────────────────────────

export interface ImportSummary {
  importId: string;
  rows: number;
  newRows: number;
  duplicates: number;
  skippedDebits: number;
  errors: { line: number; message: string }[];
  matched: number;
  suggested: number;
  unmatched: number;
}

/**
 * Read a statement file, keep the deposits not seen before, and match them —
 * against every deposit still waiting, not only this file's, so a report made
 * after the upload is still picked up on the next one.
 */
export async function importBankStatement(text: string, fileName: string, userId: string | null): Promise<ImportSummary> {
  const parsed = parseBankCsv(text);
  const existing = new Set(
    (
      await db.bankTransaction.findMany({
        where: { rowHash: { in: parsed.rows.map((r) => r.rowHash) } },
        select: { rowHash: true },
      })
    ).map((r) => r.rowHash)
  );
  const fresh = parsed.rows.filter((r) => !existing.has(r.rowHash));

  const imp = await db.bankImport.create({
    data: { fileName, uploadedById: userId, rowCount: parsed.rows.length, newRows: fresh.length, matchedRows: 0 },
  });
  if (fresh.length > 0) {
    await db.bankTransaction.createMany({
      data: fresh.map((r) => ({
        importId: imp.id,
        rowHash: r.rowHash,
        postedOn: r.postedOn,
        amountCents: r.amountCents,
        description: r.description,
        senderName: r.senderName,
        memo: r.memo,
      })),
    });
  }

  const outcome = await rematchBank();
  await db.bankImport.update({ where: { id: imp.id }, data: { matchedRows: outcome.matched } });
  return {
    importId: imp.id,
    rows: parsed.rows.length,
    newRows: fresh.length,
    duplicates: parsed.rows.length - fresh.length,
    skippedDebits: parsed.skippedDebits,
    errors: parsed.errors,
    ...outcome,
  };
}

/** Match every open deposit against every open report. Safe to run any time. */
export async function rematchBank(): Promise<{ matched: number; suggested: number; unmatched: number }> {
  const [lines, reported, members] = await Promise.all([
    db.bankTransaction.findMany({ where: { matchedPaymentId: null, ignoredAt: null } }),
    db.payment.findMany({ where: { status: 'REPORTED' } }),
    db.member.findMany({ where: { archivedAt: null }, select: { id: true, names: true, memberNumber: true } }),
  ]);
  const matches = matchDeposits(lines, reported, members);
  let matched = 0;
  let suggested = 0;
  for (const m of matches) {
    if (m.kind === 'PAYMENT') {
      matched++;
      await db.$transaction([
        db.bankTransaction.update({
          where: { id: m.bankId },
          data: { matchedPaymentId: m.paymentId, matchConfidence: 'STRONG', suggestedMemberId: null },
        }),
        db.payment.update({ where: { id: m.paymentId }, data: { status: 'MATCHED' } }),
      ]);
    } else if (m.kind === 'MEMBER') {
      suggested++;
      await db.bankTransaction.update({
        where: { id: m.bankId },
        data: { suggestedMemberId: m.memberId, matchConfidence: 'LIKELY' },
      });
    }
  }
  return { matched, suggested, unmatched: matches.length - matched - suggested };
}
