'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { defineAction, actionError } from '@/lib/action';
import { isDemoMode } from '@/lib/demo';
import { CLOCK_OFFSET_KEY, getClockOffsetMs, now } from '@/lib/clock';
import { getSessionUser } from '@/lib/session';
import { centsFromInput } from '@/lib/validations';
import { orgIsoDate } from '@/lib/finance/dates';
import { recomputeBalances } from '@/lib/finance/ledger';
import { parseBankCsv } from '@/lib/finance/bank-csv';
import { rematchBank } from '@/features/payments/service';

/**
 * Tools for the leaders' test environment. Every action here refuses to run
 * unless DEMO_MODE is on — and isDemoMode() throws outright on tansha.org.
 */

function demoOnly() {
  if (!isDemoMode()) actionError('Only available in the test environment.');
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * The time machine. Moves the test system's clock forward so two-week
 * deadlines, missed contributions and the six-month wait can be seen without
 * waiting. Balances are rebuilt as of the new date.
 */
export const setDemoClock = defineAction({
  name: 'setDemoClock',
  guard: 'admin',
  schema: z.object({ addDays: z.number().int().min(0).max(365).nullable() }).strict(),
  async handler(input): Promise<{ today: string }> {
    demoOnly();
    const current = await getClockOffsetMs();
    const next = input.addDays === null ? 0 : current + input.addDays * DAY;
    await db.demoSetting.upsert({
      where: { key: CLOCK_OFFSET_KEY },
      create: { key: CLOCK_OFFSET_KEY, value: next },
      update: { value: next },
    });
    const members = await db.member.findMany({ select: { id: true } });
    await db.$transaction((tx) => recomputeBalances(tx, members.map((m) => m.id)), { timeout: 120_000 });
    revalidatePath('/', 'layout');
    return { today: orgIsoDate(new Date(Date.now() + next)) };
  },
});

/** Pretend a member's Zelle arrived at the bank — it appears for the Treasurer to match. */
export const simulateZelleDeposit = defineAction({
  name: 'simulateZelleDeposit',
  guard: 'admin',
  schema: z
    .object({
      memberId: z.string().uuid(),
      amount: centsFromInput.refine((c) => c > 0, 'Enter an amount'),
      withReference: z.boolean().default(true),
    })
    .strict(),
  async handler(input, ctx): Promise<{ ok: true }> {
    demoOnly();
    const member = await db.member.findUniqueOrThrow({ where: { id: input.memberId } });
    const today = await now();
    const [y, m, d] = orgIsoDate(today).split('-');
    const ref = input.withReference && member.memberNumber ? ` TSA-${member.memberNumber}` : '';
    const line = `"${m}/${d}/${y}","${(input.amount / 100).toFixed(2)}","*","","ZELLE FROM ${member.names.toUpperCase()} ON ${m}/${d} REF # DEMO${Date.now().toString(36).toUpperCase()}${ref}"`;
    const [row] = parseBankCsv(line).rows;
    const imp = await db.bankImport.create({
      data: { fileName: 'demo-simulated-deposit', uploadedById: ctx.userId, rowCount: 1, newRows: 1, matchedRows: 0 },
    });
    await db.bankTransaction.create({
      data: { importId: imp.id, rowHash: row.rowHash, postedOn: row.postedOn, amountCents: row.amountCents, description: row.description, senderName: row.senderName, memo: row.memo },
    });
    await rematchBank();
    revalidatePath('/admin/payments');
    revalidatePath('/admin');
    return { ok: true };
  },
});

/**
 * "Toa maoni" — a tester's note, with the page and who they were signed in as,
 * collected on the demo page instead of scattered across WhatsApp.
 */
export const submitDemoFeedback = defineAction({
  name: 'submitDemoFeedback',
  guard: 'public',
  schema: z.object({ page: z.string().max(300), comment: z.string().trim().min(3, 'Write a few words').max(2000) }).strict(),
  async handler(input): Promise<{ ok: true }> {
    demoOnly();
    const user = await getSessionUser();
    const count = await db.formSubmission.count({ where: { formType: 'DEMO_FEEDBACK' } });
    await db.formSubmission.create({
      data: {
        reference: `TSA-FB-${String(count + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-3).toUpperCase()}`,
        formType: 'DEMO_FEEDBACK',
        status: 'PENDING',
        source: 'web',
        submitterName: user?.email ?? 'not signed in',
        data: { page: input.page, comment: input.comment, persona: user?.email ?? null, role: user?.role ?? null, at: new Date().toISOString() },
      },
    });
    revalidatePath('/admin/demo');
    return { ok: true };
  },
});

export const resolveDemoFeedback = defineAction({
  name: 'resolveDemoFeedback',
  guard: 'admin',
  schema: z.object({ id: z.string().uuid() }).strict(),
  async handler(input): Promise<{ ok: true }> {
    demoOnly();
    await db.formSubmission.update({ where: { id: input.id }, data: { status: 'APPROVED', reviewedAt: new Date() } });
    revalidatePath('/admin/demo');
    return { ok: true };
  },
});
