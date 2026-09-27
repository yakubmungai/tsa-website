/**
 * CLI entry point for seeding the leaders' test environment.
 *
 *   npm run seed:demo
 *
 * The data itself lives in src/features/demo/seed.ts, so the in-app "reset demo
 * data" action and this script can never drift apart.
 *
 * This deletes data, so it refuses to run unless DEMO_MODE is on and the
 * environment does not point at the live site.
 */
import { PrismaClient } from '@prisma/client';
import { clearAllData, seedDemoData } from '../src/features/demo/seed';

const PRODUCTION_HOSTS = ['tansha.org', 'www.tansha.org'];

function assertSafeTarget() {
  if (process.env.DEMO_MODE !== 'true') {
    throw new Error(
      'Refusing to seed: DEMO_MODE is not "true". This deletes all data and is ' +
        "only for the leaders' test environment."
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  if (siteUrl) {
    let host: string | null = null;
    try {
      host = new URL(siteUrl).hostname.toLowerCase();
    } catch {
      host = null;
    }
    if (host && PRODUCTION_HOSTS.includes(host)) {
      throw new Error(`Refusing to seed: this environment points at "${host}".`);
    }
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
}

async function main() {
  assertSafeTarget();

  const db = new PrismaClient();
  try {
    console.log(`\nTarget database: ${new URL(process.env.DATABASE_URL!).hostname}`);

    const existingMembers = await db.member.count();
    const existingEntries = await db.ledgerEntry.count();
    console.log(
      `Clearing existing data (${existingMembers} members, ${existingEntries} ledger entries)...\n`
    );
    await clearAllData(db);

    console.log('Members:');
    const result = await seedDemoData(db, (line) => console.log(line));

    console.log(
      `\nDone. ${result.members} members, ${result.ledgerEntries} ledger entries, ` +
        `${result.accounts} sign-in accounts.`
    );
    console.log('Sign in at /login using the demo buttons.\n');
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
