# Tanzania Sharing Association — website & member portal

Public site, member portal and admin dashboard for the Tanzania Sharing
Association (TSA), a Tanzanian diaspora mutual-aid nonprofit registered in
Houston, Texas.

The association's rules — contribution amounts, benefit tiers, eligibility —
come from the constitution at `public/documents/TSA_KATIBA_2025.pdf`. **It is the
authoritative source for every monetary figure in this codebase.** Where code
encodes a rule, it cites the article (e.g. `// Art 17.2`).

- **Stack:** Next.js 16 (App Router, RSC) · React 19 · Prisma → PostgreSQL (Neon)
  · NextAuth v4 (JWT) · Tailwind v3 + shadcn/ui · Resend · Vercel
- **Languages:** English and Swahili. Association business is conducted in
  Swahili; most members are older adults.

---

## Getting started

```bash
cp .env.example .env.local   # then fill it in — see the notes in that file
npm install                  # runs prisma generate via postinstall
npx prisma migrate deploy    # bring your database up to date
npm run dev
```

`NEXTAUTH_SECRET` is required. The app **throws at boot** without it, deliberately:
there is no fallback, because a predictable secret makes every session JWT
forgeable, including admin sessions.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then `next build` |
| `npm run typecheck` | `tsc --noEmit` — must be clean; build errors are **not** suppressed |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |

Run `typecheck`, `test` and `build` before pushing. There is no CI yet.

---

## Architecture notes

### Server actions
Every server action goes through `defineAction()` in `src/lib/action.ts`, which
applies the guard, validates with a zod schema from `src/lib/validations.ts`, and
returns a uniform `ActionResult`.

Server actions are **public HTTP endpoints**. Anyone who discovers an action id
can call it with any payload, so authorisation belongs in the action itself,
never in the page that renders the button. Do not add an action that takes `any`.

### Money
All new monetary code uses **integer cents** (`src/lib/money.ts`) — never floats,
never Prisma `Decimal`. Stripe's API is natively in minor units, `Decimal` is not
serialisable across the RSC boundary, and the KATIBA divides fixed pools among
members ($3,000 ÷ 154), which needs exact remainder distribution.

When migrating a legacy `Decimal` column use `centsFromDecimalString(d.toString())`.
`Number(d) * 100` is wrong: `0.1 * 100 === 10.000000000000002`.

### Phone numbers
Phone is the only identifier the roster holds for **every** member — there is no
email column at all — so it is the primary login identity. `src/lib/phone.ts`
normalises to E.164 and **refuses to guess**: the roster contains Tanzanian
(+255) numbers, a cell with two numbers in it, and several that cannot be
recovered. A wrong guess locks a member out, or points at another member's
account. That has already happened once here: two members share a handset, and a
loose `contains` match attached one member's login to the other's ledger.

### Financial history is never deleted
`Transaction.member` is `ON DELETE RESTRICT`. Members are **archived**
(`Member.archivedAt`), never hard-deleted. KATIBA Art 6.1 gives every member the
right to inspect the association's records.

Anything that moves money or changes member data writes an `AuditLog` row inside
the same transaction, via `writeAudit({ tx, ... })`, so a change cannot commit
without a record of who made it. **The audit log is append-only — never update or
delete rows in it.** To correct a mistake, record the correction.

---

## Database

Neon PostgreSQL, managed with **Prisma Migrate**.

```bash
npx prisma migrate dev --name what_changed --create-only   # write the migration
# read the generated SQL by hand and confirm it contains no unintended DROP
npx prisma migrate deploy                                   # apply it
```

**Never run `prisma db push`.** It cannot express the constraints and triggers
this schema relies on, and running it against a database holding member money
risks silent data loss.

`migrate deploy` is deliberately **not** in the Vercel build command: builds run
for every preview deploy, and a preview build would otherwise migrate whatever
database it is pointed at. Apply migrations as an explicit release step.

### Environments
`DATABASE_URL` must be set **separately per environment**. Sharing one database
between Production and Preview means every preview deploy and every local command
writes to live member data. `ADMIN_EMAIL` in preview must be a developer address,
never the officers' inbox, so test submissions never reach real people.

---

## Backup and restore

Do this **before** any migration and before any release that touches money.

### Take a backup
```bash
pg_dump --format=custom --no-owner --no-privileges \
  --dbname "$DATABASE_URL" --file "tsa-$(date +%Y%m%d-%H%M).dump"
```
Neon also provides point-in-time restore; the dump is a second, independent copy
that does not depend on the provider.

### Restore into a scratch database and verify
```bash
pg_restore --clean --if-exists --no-owner --dbname "$SCRATCH_DATABASE_URL" tsa-YYYYMMDD-HHMM.dump
```

Then confirm the restore is real, not just exit code 0:

```sql
SELECT count(*) FROM "Member";        -- expected member count
SELECT count(*) FROM "Transaction";   -- expected transaction count
SELECT sum(amount) FROM "Transaction";-- must match the treasurer's total
```

> **An untested backup is not a backup.** Run this drill end to end, point a
> preview deployment at the restored database, sign in, and check that a member's
> balance is correct. Record how long it took here — that number is what you tell
> the board when something goes wrong.
>
> **Last verified restore:** _not yet run — do this before launch._

---

## Leaders' test environment

A separate deployment where the board can exercise the portal against invented
data before it is opened to members.

### Setting it up

1. **A separate database.** On Neon, create a branch or a second project. It must
   not be the production database — the seed deletes everything.
2. **Environment variables** for that deployment:
   ```
   DEMO_MODE=true
   NEXT_PUBLIC_SITE_URL=https://<your-staging-host>
   DATABASE_URL=<the separate database>
   NEXTAUTH_SECRET=<a different secret from production>
   ADMIN_EMAIL=<a developer address, never tansha.hq@gmail.com>
   ```
3. **Seed it:** `npm run seed:demo`
4. **Turn on Vercel Deployment Protection** so the staging URL is not public or
   indexed.

### What protects the live site

- `isDemoMode()` **throws** if `DEMO_MODE` is set while `NEXT_PUBLIC_SITE_URL`
  points at `tansha.org`. A misconfigured deployment fails loudly instead of
  quietly showing demo sign-in to members. The check is by hostname, not
  `NODE_ENV`, because Vercel preview deployments also run `NODE_ENV=production`.
- `npm run seed:demo` refuses unless `DEMO_MODE=true` and the host is not
  production.
- Demo accounts have **no password hash**. They are reachable only through the
  `demo` auth provider, which is not registered unless demo mode is on.
- The persona list reaches the sign-in component as props rather than an import,
  so demo account identifiers are not in the production client bundle.

### Signing in

`/login` shows four one-tap roles: Administrator, a member in good standing, a
member in arrears, and a member who helps a relative. No passwords.

`/admin/demo` has a bilingual walkthrough and **Reset demo data**, which rebuilds
the roster exactly as it started so a scenario can be run again.

### The demo roster

Twelve invented members covering all four KATIBA Art 18.9 standing tiers, so
each one's benefit entitlement can be checked against the constitution:

| Tier | Standing | Death / hardship entitlement | Members |
|---|---|---|---|
| FULL | $125+ | $10,000 / $3,000 | 5 |
| REDUCED | advance under $100 | $5,000 / $1,500 | 3 |
| MINIMAL | dues only, no advance | $2,000 / $500 | 3 |
| VOLUNTARY | nothing on account | kihiari only | 1 |

It also includes a couple sharing one handset — six pairs do this in the real
roster — and a member in arrears, since most of the real membership will see a
shortfall on day one.

## Known issues

- `src/components/language-context.tsx` sets state synchronously in an effect
  (ESLint flags it). This causes the English flash on load and means Server
  Components cannot read the language at all. Fixed by moving the locale to a
  cookie.
- `FormSubmission` is never written: all four public forms only send email, so
  the admin forms queue is permanently empty and `approveSubmission` is
  unreachable.
- `deepmerge-ts` carries three high advisories via `@prisma/config`. The only fix
  is Prisma 7, a major upgrade that should be its own piece of work. It is a
  build-time config merger with no runtime request surface.
- Self-service signup is disabled. `/signup` directs members to contact a leader
  until phone verification replaces the removed flow.
