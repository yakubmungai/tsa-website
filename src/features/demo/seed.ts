import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { db as defaultDb } from '@/lib/db';
import { computeStanding, duesYearFor } from '@/lib/finance/balance';

/**
 * Demo data for the leaders' test environment.
 *
 * Everything here is invented — no real member, phone number or balance. The
 * roster is built to exercise the cases leaders actually need to see:
 *
 *  - all four KATIBA Art 18.9 standing tiers, so the benefit entitlement each
 *    produces can be checked against the constitution
 *  - a couple sharing one handset. Six pairs do this in the real roster, and a
 *    loose phone match has already attached one member's login to another's
 *    ledger
 *  - a member in arrears, since roughly two thirds of the real membership will
 *    see a shortfall on day one
 *  - an elderly member whose daughter helps her, ready for delegated access
 *
 * Shared by `npm run seed:demo` and the in-app "reset demo data" action, so the
 * two can never drift apart.
 */

type Ledger = { advance: number; registration: number; membership: number };

export interface DemoMemberSpec {
  names: string;
  phone: string;
  address: string;
  husbandWife?: string;
  spousePhone?: string;
  parents?: string[];
  children?: string[];
  siblings?: string[];
  witnesses?: { name: string; phone: string }[];
  nextOfKin?: { name: string; phone: string }[];
  ledger: Ledger;
  /** Why this member is in the demo set — shown in the seed output. */
  note: string;
}

export const DEMO_MEMBERS: DemoMemberSpec[] = [
  {
    names: 'Amina Hassan Mrisho',
    phone: '+17135550101',
    address: '1420 Beechnut St, Houston, TX 77072',
    husbandWife: 'Rashid Mrisho',
    spousePhone: '+17135550102',
    parents: ['Hassan Mrisho', 'Zainabu Hassan'],
    children: ['Yusuf Mrisho', 'Layla Mrisho'],
    siblings: ['Salma Mrisho'],
    witnesses: [{ name: 'Baraka Mwakalinga', phone: '+17135550103' }],
    nextOfKin: [{ name: 'Rashid Mrisho', phone: '+17135550102' }],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: 'FULL tier — holds the $125 minimum. Entitled to $10,000 / $3,000.',
  },
  {
    names: 'Baraka Mwakalinga',
    phone: '+17135550103',
    address: '88 Wilcrest Dr, Houston, TX 77042',
    parents: ['Elias Mwakalinga', 'Tatu Elias'],
    children: ['Neema Mwakalinga'],
    nextOfKin: [{ name: 'Neema Mwakalinga', phone: '+17135550104' }],
    ledger: { advance: 150, registration: 100, membership: 25 },
    note: 'FULL tier, with surplus advance.',
  },
  {
    names: 'Zawadi Massawe',
    phone: '+17135550105',
    address: '317 Dairy Ashford Rd, Houston, TX 77079',
    parents: ['Method Massawe', 'Anna Method'],
    children: ['Upendo Massawe', 'Frank Massawe'],
    nextOfKin: [{ name: 'Upendo Massawe', phone: '+17135550106' }],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: 'FULL tier. Elderly member whose daughter helps her — delegation case.',
  },
  {
    names: 'Upendo Massawe',
    phone: '+17135550106',
    address: '317 Dairy Ashford Rd, Houston, TX 77079',
    parents: ['Zawadi Massawe'],
    nextOfKin: [{ name: 'Zawadi Massawe', phone: '+17135550105' }],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: "FULL tier. Zawadi's daughter — the helper persona.",
  },
  {
    names: 'Neema Kimaro',
    phone: '+17135550107',
    address: '2100 Eldridge Pkwy, Houston, TX 77077',
    husbandWife: 'Joseph Kimaro',
    children: ['Gloria Kimaro'],
    ledger: { advance: 60, registration: 100, membership: 25 },
    note: 'REDUCED tier — advance under $100, so $5,000 / $1,500 instead of full.',
  },
  {
    names: 'Joseph Mchome',
    phone: '+17135550108',
    address: '5401 Chimney Rock Rd, Houston, TX 77081',
    parents: ['Wilfred Mchome'],
    ledger: { advance: 35, registration: 0, membership: 25 },
    note: 'REDUCED tier, and the entry fee is unpaid.',
  },
  {
    names: 'Grace Ndosi',
    phone: '+17135550109',
    address: '910 Gessner Rd, Houston, TX 77024',
    children: ['Peter Ndosi'],
    ledger: { advance: 0, registration: 0, membership: 25 },
    note: 'MINIMAL tier — dues paid but no advance. $2,000 / $500 only.',
  },
  {
    names: 'Emmanuel Shirima',
    phone: '+17135550110',
    address: '44 Westheimer Rd, Houston, TX 77056',
    ledger: { advance: 0, registration: 0, membership: 25 },
    note: 'MINIMAL tier.',
  },
  {
    names: 'Fatuma Juma',
    phone: '+17135550111',
    address: '77 Bissonnet St, Houston, TX 77074',
    ledger: { advance: 0, registration: 0, membership: 0 },
    note: 'VOLUNTARY tier — nothing on account. Support is kihiari only.',
  },
  {
    names: 'Daniel Kileo',
    phone: '+17135550112',
    address: '1201 Fondren Rd, Houston, TX 77096',
    children: ['Esther Kileo'],
    ledger: { advance: -45, registration: 0, membership: 25 },
    note: 'In arrears — negative balance, so the shortfall view can be checked.',
  },
  {
    names: 'Salma Mrisho',
    phone: '+17135550113',
    address: '620 Sugar Creek Blvd, Sugar Land, TX 77478',
    husbandWife: 'Hamisi Mrisho',
    spousePhone: '+17135550113',
    siblings: ['Amina Hassan Mrisho'],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: 'Shares a handset with Hamisi — exercises the account chooser.',
  },
  {
    names: 'Hamisi Mrisho',
    phone: '+17135550113',
    address: '620 Sugar Creek Blvd, Sugar Land, TX 77478',
    husbandWife: 'Salma Mrisho',
    spousePhone: '+17135550113',
    ledger: { advance: 80, registration: 100, membership: 25 },
    note: 'Shares a handset with Salma, and is on a different tier to her.',
  },
];

/** Kept in step with DEMO_PERSONAS in src/lib/demo.ts. */
export const DEMO_ACCOUNTS = [
  { email: 'demo.admin@tsa.test', role: 'ADMIN' as const, linkTo: null },
  { email: 'demo.member@tsa.test', role: 'MEMBER' as const, linkTo: 'Amina Hassan Mrisho' },
  { email: 'demo.arrears@tsa.test', role: 'MEMBER' as const, linkTo: 'Daniel Kileo' },
  { email: 'demo.helper@tsa.test', role: 'MEMBER' as const, linkTo: 'Upendo Massawe' },
];

/** Noon Houston time on a date — the convention for dates with no time of day. */
function orgNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 18));
}

/**
 * The demo member's money, as ledger entries.
 *
 * Dated relative to when the seed runs, so the demo never goes stale: dues are
 * always for the current April cycle, and deposits predate them.
 */
function ledgerRows(
  memberId: string,
  ledger: Ledger,
  asOf: Date
): Prisma.LedgerEntryCreateManyInput[] {
  const cycle = duesYearFor(asOf);
  const joined = orgNoon(cycle - 2, 5, 1);
  const duesPaid = orgNoon(cycle, 4, 15);
  const rows: Prisma.LedgerEntryCreateManyInput[] = [];
  if (ledger.registration !== 0) {
    rows.push({
      memberId,
      account: 'ENTRY_FEE',
      entryKind: 'PAYMENT',
      amountCents: Math.round(ledger.registration * 100),
      description: 'Entry fee',
      descriptionSw: 'Kiingilio',
      occurredAt: joined,
    });
  }
  if (ledger.advance !== 0) {
    rows.push({
      memberId,
      account: 'ADVANCE_DEPOSIT',
      entryKind: ledger.advance > 0 ? 'PAYMENT' : 'ADJUSTMENT',
      amountCents: Math.round(ledger.advance * 100),
      description: ledger.advance > 0 ? 'Advance deposit' : 'Advance overdrawn by earlier cases',
      descriptionSw: ledger.advance > 0 ? 'Akiba tangulizi' : 'Akiba imepungua kwa michango ya awali',
      occurredAt: joined,
    });
  }
  if (ledger.membership !== 0) {
    rows.push({
      memberId,
      account: 'ANNUAL_DUES',
      entryKind: 'PAYMENT',
      amountCents: Math.round(ledger.membership * 100),
      description: `Annual dues ${cycle}/${String(cycle + 1).slice(2)}`,
      descriptionSw: `Ada ya mwaka ${cycle}/${String(cycle + 1).slice(2)}`,
      occurredAt: duesPaid,
    });
  }
  return rows;
}

/**
 * Remove everything. Ordered so the RESTRICT foreign keys on Member (the
 * ledger, and the legacy Transaction table) are cleared before members are.
 */
export async function clearAllData(client: PrismaClient = defaultDb as PrismaClient) {
  await client.auditLog.deleteMany({});
  await client.ledgerEntry.updateMany({ data: { reversesId: null } });
  await client.ledgerEntry.deleteMany({});
  await client.memberBalance.deleteMany({});
  await client.assessment.deleteMany({});
  await client.claim.deleteMany({});
  await client.transaction.deleteMany({});
  await client.formSubmission.deleteMany({});
  await client.actingSession.deleteMany({});
  await client.delegation.deleteMany({});
  await client.authTicket.deleteMany({});
  await client.user.deleteMany({});
  await client.verificationToken.deleteMany({});
  await client.member.deleteMany({});
  await client.demoSetting.deleteMany({});
}

export interface SeedResult {
  members: number;
  ledgerEntries: number;
  accounts: number;
}

/**
 * Insert the demo roster and sign-in accounts.
 *
 * Callers are responsible for clearing first — see `clearAllData`.
 */
export async function seedDemoData(
  client: PrismaClient = defaultDb as PrismaClient,
  log: (line: string) => void = () => {}
): Promise<SeedResult> {
  const byName = new Map<string, string>();
  const phoneByName = new Map<string, string>();
  const asOf = new Date();
  let memberNumber = 100;

  for (const m of DEMO_MEMBERS) {
    memberNumber += 1;
    const created = await client.member.create({
      data: {
        names: m.names,
        phone: m.phone,
        // Already E.164 in the demo set, so sign-in works without a backfill.
        phoneE164: m.phone,
        address: m.address,
        husbandWife: m.husbandWife ?? null,
        spousePhone: m.spousePhone ?? null,
        parents: m.parents ?? [],
        children: m.children ?? [],
        siblings: m.siblings ?? [],
        witnesses: (m.witnesses ?? []) as Prisma.InputJsonValue[],
        nextOfKin: (m.nextOfKin ?? []) as Prisma.InputJsonValue[],
        memberNumber,
        joinedAt: orgNoon(duesYearFor(asOf) - 2, 5, 1),
        joinedAtEstimated: false,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    const rows = ledgerRows(created.id, m.ledger, asOf);
    if (rows.length > 0) await client.ledgerEntry.createMany({ data: rows });
    await writeBalance(client, created.id, asOf);
    byName.set(m.names, created.id);
    phoneByName.set(m.names, m.phone);
    log(`  ${m.names.padEnd(24)} ${m.note}`);
  }

  await seedBackgroundRoster(client, asOf, memberNumber);
  log(`  + ${BACKGROUND_COUNT} background members, so shares come out near the real ~$20`);

  for (const account of DEMO_ACCOUNTS) {
    await client.user.create({
      data: {
        email: account.email,
        // No password hash, deliberately. These accounts are reachable only
        // through the `demo` auth provider, which is not registered unless
        // DEMO_MODE is on — so there is no credential that could leak.
        passwordHash: null,
        role: account.role,
        memberId: account.linkTo ? (byName.get(account.linkTo) ?? null) : null,
        // Mirror the member's number so phone sign-in resolves this account.
        phoneE164: account.linkTo ? (phoneByName.get(account.linkTo) ?? null) : null,
        phoneVerifiedAt: account.linkTo ? new Date() : null,
      },
    });
    log(`  ${account.email.padEnd(24)} ${account.role}${account.linkTo ? ` -> ${account.linkTo}` : ''}`);
  }

  const ledgerEntries = await client.ledgerEntry.count();
  return {
    members: DEMO_MEMBERS.length,
    ledgerEntries,
    accounts: DEMO_ACCOUNTS.length,
  };
}

/** The cached balance, computed the same way the ledger service does. */
async function writeBalance(client: PrismaClient, memberId: string, asOf: Date) {
  const entries = await client.ledgerEntry.findMany({
    where: { memberId },
    select: { account: true, amountCents: true, occurredAt: true, voidedAt: true },
  });
  const s = computeStanding({ entries, joinedAt: null, asOf });
  const levy = entries
    .filter((e) => e.voidedAt === null && (e.account === 'HARDSHIP_LEVY' || e.account === 'DEATH_LEVY'))
    .reduce((t, e) => t + e.amountCents, 0);
  await client.memberBalance.upsert({
    where: { memberId },
    create: {
      memberId,
      netCents: s.netCents,
      advanceCents: s.advanceCents,
      entryFeeCents: s.entryFeeCents,
      duesCents: s.duesCents,
      duesYear: s.duesYear,
      outstandingCents: Math.max(0, -levy),
    },
    update: {
      netCents: s.netCents,
      advanceCents: s.advanceCents,
      entryFeeCents: s.entryFeeCents,
      duesCents: s.duesCents,
      duesYear: s.duesYear,
      outstandingCents: Math.max(0, -levy),
      recomputedAt: new Date(),
    },
  });
}

// ── Background roster ───────────────────────────────────────────────────────

/**
 * How many invented members sit behind the twelve named ones.
 *
 * TSA has about 154 members, and every figure a leader checks depends on it:
 * $3,000 over 12 members is $272 a head — more than anyone's savings — while
 * over 153 it is $19.61, which the advance covers. Testing with twelve would
 * show nothing like what members will actually see.
 */
export const BACKGROUND_COUNT = 142;

const FIRST = ['Asha', 'Juma', 'Rehema', 'Hamisi', 'Neema', 'Said', 'Mwajuma', 'Omari', 'Halima', 'Petro',
  'Furaha', 'Idd', 'Zuhura', 'Bakari', 'Tumaini', 'Mussa', 'Pendo', 'Salim', 'Imani', 'Ramadhani'];
const LAST = ['Mushi', 'Swai', 'Lyimo', 'Mollel', 'Kweka', 'Mbwambo', 'Temba', 'Minja', 'Shayo', 'Massawe',
  'Urassa', 'Kimaro', 'Mlay', 'Macha', 'Ngowi'];

/**
 * Deterministic, so a reset always gives the same roster: mostly members with
 * the full $125, with the spread of shortfalls the real roster has.
 */
async function seedBackgroundRoster(client: PrismaClient, asOf: Date, lastNumber: number) {
  const cycle = duesYearFor(asOf);
  const joined = new Date(Date.UTC(cycle - 3, 3, 1, 18));
  const duesPaid = new Date(Date.UTC(cycle, 3, 20, 18));

  const members: Prisma.MemberCreateManyInput[] = [];
  const entries: (Prisma.LedgerEntryCreateManyInput & { memberId: string })[] = [];
  for (let i = 0; i < BACKGROUND_COUNT; i++) {
    const id = randomUUID();
    const names = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]} (${String(i + 13).padStart(3, '0')})`;
    members.push({
      id,
      names,
      phone: `+1713555${String(2000 + i)}`,
      phoneE164: `+1713555${String(2000 + i)}`,
      address: 'Houston, TX',
      memberNumber: lastNumber + 1 + i,
      joinedAt: joined,
      joinedAtEstimated: false,
      status: 'ACTIVE',
    });
    const band = i % 10;
    const advance = band <= 5 ? 100 + (i % 3) * 25 : band === 6 ? 100 : band === 7 ? 45 : band === 8 ? 0 : 15;
    const dues = band === 9 ? 0 : 25;
    const row = (account: 'ENTRY_FEE' | 'ADVANCE_DEPOSIT' | 'ANNUAL_DUES', dollars: number, at: Date, sw: string) =>
      entries.push({
        memberId: id,
        account,
        entryKind: 'PAYMENT',
        amountCents: dollars * 100,
        description: sw,
        descriptionSw: sw,
        occurredAt: at,
      });
    row('ENTRY_FEE', 100, joined, 'Kiingilio');
    if (advance > 0) row('ADVANCE_DEPOSIT', advance, joined, 'Akiba tangulizi');
    if (dues > 0) row('ANNUAL_DUES', dues, duesPaid, 'Ada ya mwaka');
  }
  await client.member.createMany({ data: members });
  await client.ledgerEntry.createMany({ data: entries });

  // Cached balances in one write, computed exactly as the ledger service does.
  const balances: Prisma.MemberBalanceCreateManyInput[] = members.map((m) => {
    const mine = entries
      .filter((e) => e.memberId === m.id)
      .map((e) => ({ account: e.account as string, amountCents: e.amountCents, occurredAt: e.occurredAt as Date, voidedAt: null }));
    const st = computeStanding({ entries: mine, joinedAt: null, asOf });
    return {
      memberId: m.id as string,
      netCents: st.netCents,
      advanceCents: st.advanceCents,
      entryFeeCents: st.entryFeeCents,
      duesCents: st.duesCents,
      duesYear: st.duesYear,
      outstandingCents: 0,
      recomputedAt: asOf,
    };
  });
  await client.memberBalance.createMany({ data: balances });
}
