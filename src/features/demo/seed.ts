import type { Prisma, PrismaClient } from '@prisma/client';
import { db as defaultDb } from '@/lib/db';

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
    phone: '+15550100001',
    address: '1420 Beechnut St, Houston, TX 77072',
    husbandWife: 'Rashid Mrisho',
    spousePhone: '+15550100002',
    parents: ['Hassan Mrisho', 'Zainabu Hassan'],
    children: ['Yusuf Mrisho', 'Layla Mrisho'],
    siblings: ['Salma Mrisho'],
    witnesses: [{ name: 'Baraka Mwakalinga', phone: '+15550100003' }],
    nextOfKin: [{ name: 'Rashid Mrisho', phone: '+15550100002' }],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: 'FULL tier — holds the $125 minimum. Entitled to $10,000 / $3,000.',
  },
  {
    names: 'Baraka Mwakalinga',
    phone: '+15550100003',
    address: '88 Wilcrest Dr, Houston, TX 77042',
    parents: ['Elias Mwakalinga', 'Tatu Elias'],
    children: ['Neema Mwakalinga'],
    nextOfKin: [{ name: 'Neema Mwakalinga', phone: '+15550100004' }],
    ledger: { advance: 150, registration: 100, membership: 25 },
    note: 'FULL tier, with surplus advance.',
  },
  {
    names: 'Zawadi Massawe',
    phone: '+15550100005',
    address: '317 Dairy Ashford Rd, Houston, TX 77079',
    parents: ['Method Massawe', 'Anna Method'],
    children: ['Upendo Massawe', 'Frank Massawe'],
    nextOfKin: [{ name: 'Upendo Massawe', phone: '+15550100006' }],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: 'FULL tier. Elderly member whose daughter helps her — delegation case.',
  },
  {
    names: 'Upendo Massawe',
    phone: '+15550100006',
    address: '317 Dairy Ashford Rd, Houston, TX 77079',
    parents: ['Zawadi Massawe'],
    nextOfKin: [{ name: 'Zawadi Massawe', phone: '+15550100005' }],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: "FULL tier. Zawadi's daughter — the helper persona.",
  },
  {
    names: 'Neema Kimaro',
    phone: '+15550100007',
    address: '2100 Eldridge Pkwy, Houston, TX 77077',
    husbandWife: 'Joseph Kimaro',
    children: ['Gloria Kimaro'],
    ledger: { advance: 60, registration: 100, membership: 25 },
    note: 'REDUCED tier — advance under $100, so $5,000 / $1,500 instead of full.',
  },
  {
    names: 'Joseph Mchome',
    phone: '+15550100008',
    address: '5401 Chimney Rock Rd, Houston, TX 77081',
    parents: ['Wilfred Mchome'],
    ledger: { advance: 35, registration: 0, membership: 25 },
    note: 'REDUCED tier, and the entry fee is unpaid.',
  },
  {
    names: 'Grace Ndosi',
    phone: '+15550100009',
    address: '910 Gessner Rd, Houston, TX 77024',
    children: ['Peter Ndosi'],
    ledger: { advance: 0, registration: 0, membership: 25 },
    note: 'MINIMAL tier — dues paid but no advance. $2,000 / $500 only.',
  },
  {
    names: 'Emmanuel Shirima',
    phone: '+15550100010',
    address: '44 Westheimer Rd, Houston, TX 77056',
    ledger: { advance: 0, registration: 0, membership: 25 },
    note: 'MINIMAL tier.',
  },
  {
    names: 'Fatuma Juma',
    phone: '+15550100011',
    address: '77 Bissonnet St, Houston, TX 77074',
    ledger: { advance: 0, registration: 0, membership: 0 },
    note: 'VOLUNTARY tier — nothing on account. Support is kihiari only.',
  },
  {
    names: 'Daniel Kileo',
    phone: '+15550100012',
    address: '1201 Fondren Rd, Houston, TX 77096',
    children: ['Esther Kileo'],
    ledger: { advance: -45, registration: 0, membership: 25 },
    note: 'In arrears — negative balance, so the shortfall view can be checked.',
  },
  {
    names: 'Salma Mrisho',
    phone: '+15550100013',
    address: '620 Sugar Creek Blvd, Sugar Land, TX 77478',
    husbandWife: 'Hamisi Mrisho',
    spousePhone: '+15550100013',
    siblings: ['Amina Hassan Mrisho'],
    ledger: { advance: 100, registration: 100, membership: 25 },
    note: 'Shares a handset with Hamisi — exercises the account chooser.',
  },
  {
    names: 'Hamisi Mrisho',
    phone: '+15550100013',
    address: '620 Sugar Creek Blvd, Sugar Land, TX 77478',
    husbandWife: 'Salma Mrisho',
    spousePhone: '+15550100013',
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

function ledgerRows(ledger: Ledger): Prisma.TransactionCreateWithoutMemberInput[] {
  const rows: Prisma.TransactionCreateWithoutMemberInput[] = [];
  if (ledger.advance !== 0) {
    rows.push({
      amount: ledger.advance.toFixed(2),
      type: 'ADVANCE',
      description: 'Akiba tangulizi / Advance deposit',
    });
  }
  if (ledger.registration !== 0) {
    rows.push({
      amount: ledger.registration.toFixed(2),
      type: 'REGISTRATION',
      description: 'Kiingilio / Entry fee',
    });
  }
  if (ledger.membership !== 0) {
    rows.push({
      amount: ledger.membership.toFixed(2),
      type: 'MEMBERSHIP',
      description: 'Ada ya mwaka 2026 / Annual dues 2026',
    });
  }
  return rows;
}

/** Remove everything. Ordered so Transaction's RESTRICT on Member is respected. */
export async function clearAllData(client: PrismaClient = defaultDb as PrismaClient) {
  await client.auditLog.deleteMany({});
  await client.transaction.deleteMany({});
  await client.formSubmission.deleteMany({});
  await client.user.deleteMany({});
  await client.verificationToken.deleteMany({});
  await client.member.deleteMany({});
}

export interface SeedResult {
  members: number;
  transactions: number;
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

  for (const m of DEMO_MEMBERS) {
    const created = await client.member.create({
      data: {
        names: m.names,
        phone: m.phone,
        address: m.address,
        husbandWife: m.husbandWife ?? null,
        spousePhone: m.spousePhone ?? null,
        parents: m.parents ?? [],
        children: m.children ?? [],
        siblings: m.siblings ?? [],
        witnesses: (m.witnesses ?? []) as Prisma.InputJsonValue[],
        nextOfKin: (m.nextOfKin ?? []) as Prisma.InputJsonValue[],
        transactions: { create: ledgerRows(m.ledger) },
      },
      select: { id: true },
    });
    byName.set(m.names, created.id);
    log(`  ${m.names.padEnd(24)} ${m.note}`);
  }

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
      },
    });
    log(`  ${account.email.padEnd(24)} ${account.role}${account.linkTo ? ` -> ${account.linkTo}` : ''}`);
  }

  const transactions = await client.transaction.count();
  return {
    members: DEMO_MEMBERS.length,
    transactions,
    accounts: DEMO_ACCOUNTS.length,
  };
}
