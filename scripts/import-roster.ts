/**
 * Loads the real roster and opening balances from the treasurer's spreadsheets
 * into an EMPTY database — the production database, once, at launch.
 *
 *   npm run import:roster                       # dry run: report only
 *   npm run import:roster -- --commit           # write
 *
 * Options:
 *   --roster <file>    default "Database for web.xlsx"   (names, phones, family)
 *   --balances <file>  default "Expense Report for web.xlsx" (Advance, Registration, Membership)
 *   --matches <file>   default "roster-matches.json"    (corrections, see below)
 *   --as-of YYYY-MM-DD default today — the date the opening balances are dated
 *
 * The balances sheet uses short names ("Faraja M."). Each one must match
 * exactly ONE member in the roster. Anything ambiguous or unmatched is listed,
 * never guessed — the previous import guessed, and ended up $70 and two members
 * away from the treasurer's figures. Corrections go in roster-matches.json:
 *
 *   {
 *     "match": { "Faraja M.": "Faraja Mungai" },
 *     "skip":  ["Name of a row that is not a member"]
 *   }
 *
 * --commit refuses to run unless every balance row is matched or skipped, and
 * unless the database has no members yet. Opening balances become OPENING
 * ledger entries; members then claim their account by phone at first sign-in.
 */
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { toE164 } from '../src/lib/phone';
import { formatUSD } from '../src/lib/money';
import { orgDateFromInput, orgIsoDate } from '../src/lib/finance/dates';
import { recomputeBalances } from '../src/lib/finance/ledger';

const db = new PrismaClient();
const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const commit = args.includes('--commit');
const rosterFile = opt('roster', 'Database for web.xlsx');
const balancesFile = opt('balances', 'Expense Report for web.xlsx');
const matchesFile = opt('matches', 'roster-matches.json');
const asOfInput = opt('as-of', orgIsoDate(new Date()));

/** Corrections carried over from the July import, where the short name differs. */
const KNOWN_MATCHES: Record<string, string> = {
  'benardette m.': 'Bernadette Mistri',
  'christer m.': 'Christher Mghamba',
  'dennis m.': 'Denis Mmanga',
  'joyce mlk.': 'Joyce Frederick Malika',
  'nuru mz.': 'Nuru Mazora',
  'rose mng.': 'Rose Charles Mungai',
  'mary mng.': "Mary D. Mwang'ombe",
  'sarah k.': 'Sara Kataraihya',
  'zitta m.': 'Zita Yassin Mtanga',
};

interface RosterMember {
  names: string;
  phone: string | null;
  address: string;
  parents: string[];
  spouse: string | null;
  children: string[];
  siblings: string[];
  witnesses: { name: string; phone: string | null }[];
  nextOfKin: { name: string; phone: string | null }[];
}

interface BalanceRow {
  line: number;
  number: number | null;
  name: string;
  advance: number;
  registration: number;
  membership: number;
  total: number;
}

const cell = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function sheetRows(file: string): unknown[][] {
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);
  const wb = XLSX.readFile(file);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as unknown[][];
}

/** Roster: one member per named row; rows below it with no name continue it. */
function parseRoster(rows: unknown[][]): RosterMember[] {
  const out: RosterMember[] = [];
  let cur: (Omit<RosterMember, 'address'> & { addressParts: string[] }) | null = null;
  const push = () => {
    if (cur) {
      const { addressParts, ...m } = cur;
      out.push({ ...m, address: addressParts.filter(Boolean).join(', ') });
    }
  };
  for (const row of rows.slice(1)) {
    const c = row.map(cell);
    if (c.every((x) => x === '')) {
      push();
      cur = null;
      continue;
    }
    if (c[0]) {
      push();
      cur = {
        names: c[0].replace(/\s+/g, ' '),
        phone: c[1] || null,
        addressParts: [c[2]],
        parents: [],
        spouse: c[4] || null,
        children: [],
        siblings: [],
        witnesses: [],
        nextOfKin: [],
      };
    } else if (!cur) {
      continue;
    } else if (c[2]) {
      cur.addressParts.push(c[2]);
    }
    if (!cur) continue;
    if (c[3]) cur.parents.push(c[3]);
    if (c[5]) cur.children.push(c[5]);
    if (c[6]) cur.siblings.push(c[6]);
    if (c[7]) cur.witnesses.push({ name: c[7], phone: c[8] || null });
    if (c[9]) cur.nextOfKin.push({ name: c[9], phone: c[10] || null });
  }
  push();
  return out;
}

function money(v: unknown): number {
  const s = cell(v).replace(/[$,]/g, '');
  if (s === '') return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Not a number: "${cell(v)}"`);
  return Math.round(n * 100);
}

function parseBalances(rows: unknown[][]): BalanceRow[] {
  const out: BalanceRow[] = [];
  rows.slice(1).forEach((row, i) => {
    const c = row.map(cell);
    if (!c[1]) return;
    out.push({
      line: i + 2,
      number: c[0] && /^\d+$/.test(c[0]) ? Number(c[0]) : null,
      name: c[1].replace(/\s+/g, ' '),
      advance: money(row[2]),
      registration: money(row[3]),
      membership: money(row[4]),
      total: money(row[5]),
    });
  });
  return out;
}

/** Roster members a short name could be: same first name, and a surname starting with the initial. */
function candidates(short: string, roster: RosterMember[]): RosterMember[] {
  const s = norm(short);
  const exact = roster.filter((m) => norm(m.names) === s);
  if (exact.length) return exact;
  const [first, ...rest] = s.split(' ');
  const initial = rest.join('').replace(/'/g, '');
  return roster.filter((m) => {
    const parts = norm(m.names).split(' ');
    if (parts[0] !== first) return false;
    if (!initial) return true;
    return parts.slice(1).some((p) => p.replace(/'/g, '').startsWith(initial));
  });
}

async function main() {
  const roster = parseRoster(sheetRows(rosterFile));
  const balances = parseBalances(sheetRows(balancesFile));
  const corrections = existsSync(matchesFile)
    ? (JSON.parse(readFileSync(matchesFile, 'utf8')) as { match?: Record<string, string>; skip?: string[] })
    : {};
  const manual = new Map<string, string>();
  for (const [k, v] of Object.entries(KNOWN_MATCHES)) manual.set(norm(k), v);
  for (const [k, v] of Object.entries(corrections.match ?? {})) manual.set(norm(k), v);
  const skip = new Set((corrections.skip ?? []).map(norm));

  console.log(`\nRoster: ${roster.length} members in "${rosterFile}"`);
  console.log(`Balances: ${balances.length} rows in "${balancesFile}"`);
  console.log(`Corrections: ${existsSync(matchesFile) ? matchesFile : '(none yet)'}; opening balances dated ${asOfInput}\n`);

  // Duplicate names in the roster would make any match ambiguous.
  const seen = new Map<string, number>();
  for (const m of roster) seen.set(norm(m.names), (seen.get(norm(m.names)) ?? 0) + 1);
  const dupNames = [...seen].filter(([, n]) => n > 1).map(([k]) => k);

  const matched = new Map<RosterMember, BalanceRow>();
  const problems: string[] = [];
  for (const b of balances) {
    if (skip.has(norm(b.name))) continue;
    let found: RosterMember[];
    const forced = manual.get(norm(b.name));
    if (forced) {
      found = roster.filter((m) => norm(m.names) === norm(forced));
      if (found.length === 0) problems.push(`line ${b.line} "${b.name}": correction points to "${forced}", which is not in the roster`);
    } else {
      found = candidates(b.name, roster);
    }
    if (found.length === 0) {
      if (!forced) problems.push(`line ${b.line} "${b.name}": no roster member matches`);
      continue;
    }
    if (found.length > 1) {
      problems.push(`line ${b.line} "${b.name}": could be ${found.map((m) => `"${m.names}"`).join(' or ')}`);
      continue;
    }
    const m = found[0];
    const already = matched.get(m);
    if (already) {
      problems.push(`line ${b.line} "${b.name}" and line ${already.line} "${already.name}" both match "${m.names}"`);
      continue;
    }
    matched.set(m, b);
  }

  const noBalance = roster.filter((m) => !matched.has(m));
  const sum = (f: (b: BalanceRow) => number, rows: BalanceRow[]) => rows.reduce((t, b) => t + f(b), 0);
  const allRows = balances.filter((b) => !skip.has(norm(b.name)));
  const matchedRows = [...matched.values()];
  console.log(`Matched: ${matched.size} of ${allRows.length} balance rows`);
  console.log(`Roster members with no balance row (imported at $0): ${noBalance.length}`);
  if (noBalance.length) console.log('  ' + noBalance.map((m) => m.names).join('; '));
  console.log('\nTotals            sheet           matched');
  for (const [label, f] of [
    ['Advance', (b: BalanceRow) => b.advance],
    ['Registration', (b: BalanceRow) => b.registration],
    ['Membership', (b: BalanceRow) => b.membership],
    ['Total column', (b: BalanceRow) => b.total],
  ] as const) {
    console.log(`  ${label.padEnd(14)} ${formatUSD(sum(f, allRows)).padStart(12)}  ${formatUSD(sum(f, matchedRows)).padStart(12)}`);
  }
  const rowMismatch = allRows.filter((b) => b.total !== b.advance + b.registration + b.membership && b.total !== 0);
  if (rowMismatch.length) {
    console.log(`\nRows whose Total is not Advance + Registration + Membership (check with the treasurer):`);
    for (const b of rowMismatch) console.log(`  line ${b.line} "${b.name}": total ${formatUSD(b.total)}`);
  }
  if (dupNames.length) problems.push(...dupNames.map((n) => `roster has "${n}" more than once`));

  if (problems.length) {
    console.log(`\nNEEDS A DECISION (${problems.length}) — add to ${matchesFile} under "match" or "skip":`);
    for (const p of problems) console.log(`  - ${p}`);
  } else {
    console.log('\nEvery balance row matches exactly one member.');
  }

  if (!commit) {
    console.log('\nDry run — nothing written. Re-run with --commit when the totals agree with the treasurer.\n');
    return;
  }
  if (problems.length) throw new Error('Refusing to write: resolve every item under NEEDS A DECISION first.');
  const existing = await db.member.count();
  if (existing > 0) throw new Error(`Refusing to write: the database already has ${existing} members. This is for an empty database.`);

  // Member numbers: the treasurer's "No" where there is one, then onward.
  const used = new Set<number>();
  const numberFor = new Map<RosterMember, number>();
  for (const [m, b] of matched) {
    if (b.number !== null && !used.has(b.number)) {
      numberFor.set(m, b.number);
      used.add(b.number);
    }
  }
  let next = Math.max(0, ...used) + 1;
  for (const m of [...roster].sort((a, z) => a.names.localeCompare(z.names))) {
    if (!numberFor.has(m)) numberFor.set(m, next++);
  }

  const occurredAt = orgDateFromInput(asOfInput);
  const members: Prisma.MemberCreateManyInput[] = [];
  const entries: Prisma.LedgerEntryCreateManyInput[] = [];
  for (const m of roster) {
    const id = randomUUID();
    const firstPhone = m.phone?.split(/[\/,;]/)[0]?.trim() || null;
    members.push({
      id,
      names: m.names,
      phone: m.phone,
      phoneE164: toE164(firstPhone),
      address: m.address || null,
      husbandWife: m.spouse,
      parents: m.parents,
      children: m.children,
      siblings: m.siblings,
      witnesses: m.witnesses as Prisma.InputJsonValue[],
      nextOfKin: m.nextOfKin as Prisma.InputJsonValue[],
      memberNumber: numberFor.get(m)!,
      joinedAt: null,
      joinedAtEstimated: true,
      status: 'ACTIVE',
    });
    const b = matched.get(m);
    if (!b) continue;
    const add = (account: 'ADVANCE_DEPOSIT' | 'ENTRY_FEE' | 'ANNUAL_DUES', cents: number, en: string, sw: string) => {
      if (cents === 0) return;
      entries.push({
        memberId: id,
        account,
        entryKind: 'OPENING',
        amountCents: cents,
        description: `Opening balance from the treasurer's records — ${en}`,
        descriptionSw: `Salio la mwanzo kutoka kumbukumbu za Mweka Hazina — ${sw}`,
        occurredAt,
        idempotencyKey: `import:${numberFor.get(m)}:${account}`,
      });
    };
    add('ADVANCE_DEPOSIT', b.advance, 'advance savings', 'akiba tangulizi');
    add('ENTRY_FEE', b.registration, 'entry fee', 'kiingilio');
    add('ANNUAL_DUES', b.membership, 'annual dues', 'ada ya mwaka');
  }

  await db.$transaction(
    async (tx) => {
      await tx.member.createMany({ data: members });
      await tx.ledgerEntry.createMany({ data: entries });
      await recomputeBalances(tx, members.map((m) => m.id as string));
    },
    { timeout: 120_000 }
  );
  const noPhone = members.filter((m) => !m.phoneE164).length;
  console.log(`\nImported ${members.length} members and ${entries.length} opening entries.`);
  if (noPhone) console.log(`${noPhone} members have no usable phone number and cannot sign in until an officer adds one.`);
  console.log('Next: npm run verify:ledger, then compare the totals with the treasurer.\n');
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
