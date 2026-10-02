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

## Status

| Stage | What | State |
|---|---|---|
| 1 | Ledger schema, KATIBA constants, standing engine | Done |
| 2 | Balances read from the ledger; shared portal UI on the site theme | Done |
| 3 | Cases (shida/msiba): report → review → announce → collect → pay out | Done |
| 4 | Payments: Nimelipa, bank-statement matching, pay links; Stripe built but off | Done |
| 5 | Leaders' test environment with scenarios, time machine and guided walkthrough | Done |

Before members use it, see [Going live](#going-live). Questions waiting for the
Board are listed in `src/lib/finance/constants.ts` and under
[Known issues](#known-issues).

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
| `npm run lint` | ESLint, then `lint:ui` (fails on raw palette colours in the portal/admin) |
| `npm run seed:demo` | **Test environment only.** Wipes and reseeds the demo roster and scenarios |
| `npm run migrate:ledger` | Legacy `Transaction` → ledger. Dry run; `-- --commit` to write |
| `npm run verify:ledger` | Cached balances vs raw ledger — exits non-zero on drift |
| `npm run verify:claims` | **Test environment only.** Walks cases through the engine (20 checks) |
| `npm run verify:payments` | **Test environment only.** Report → bank match → confirm (15 checks) |

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

### The ledger
`LedgerEntry` is the association's books: append-only, signed integer cents
(positive = money the member holds with TSA). Mistakes are corrected with
`reverseEntry`, which posts the opposite entry and keeps both, never an edit.
**Only `src/lib/finance/ledger.ts` writes to it**, and every write recomputes the
member's `MemberBalance` cache in the same transaction. `computeStanding`
(`balance.ts`) turns entries into a standing as of any date. Art 18.9 tiers are
taken on the date of the event, so a later top-up cannot raise them.

Every constitutional figure is in `src/lib/finance/constants.ts` with its
article. An amendment should be a one-file diff.

### Cases (shida/msiba)
`Claim` is a case; `Assessment` is one member's share of it. The arithmetic is
pure and tested (`levy.ts`, `eligibility.ts`):
- benefit by type and tier on the event date: $10,000/$5,000/$2,000 for a
  member or a child under 21 in the USA; $3,000/$1,500/$500 for a registered
  relative or a hardship; kihiari with nothing on account
- the levy equals the benefit paid, divided exactly (hardships among active
  members, deaths among all), with the claimant excluded
- Art 17 monthly caps per bucket, with overflow moving to the next month
- savings cover a share first (`drawableFromAdvance`) and are never overdrawn
- missed contributions are *derived*: past due, unpaid, not excused. Paying
  clears them. Three means the member is listed for the Board; the software
  never suspends anyone.

Eligibility flags (late report, six-month wait, 5-in-5-years, relative not on
the contract, and so on) inform the reviewer and never decide.

### Payments
A member's "Nimelipa" creates a `Payment` in REPORTED; nothing moves. The
Treasurer uploads the Wells Fargo CSV (`bank-csv.ts`), deposits are matched
(`match.ts`), and confirming is the **only** way a payment reaches the ledger.
`confirmPaymentTx` allocates it (overdue shares, then open shares, dues, entry
fee, savings) and posts one entry per part keyed `payment:<id>:<n>`, so a repeat
confirm posts nothing. Pay links (`/lipa/<token>`) need no sign-in; only a hash
of the token is stored. Stripe Checkout is built behind `isCardPaymentEnabled()`.

### Portal UI
Portal and admin screens use the public site's theme tokens and the shared
components in `src/components/portal/` (`PageShell`, `StatusHero`, `SectionCard`,
`ChoiceLink`, `WizardShell`, …) and `AdminShell`. Raw Tailwind palette colours
fail `npm run lint`. Member-facing strings live in
`src/lib/translations-portal.ts`, Swahili first; the type makes English match it
key for key. Tap targets are 48px, body text is 18px, and every page works at
360px wide.

### Performance
Pages render in well under 100 ms of our own code; what members feel is
database round trips. Keep it that way:
- **Same region as the database.** `vercel.json` pins functions to `pdx1`
  (Portland), next to Neon in `us-west-2`. If the database ever moves, move this
  with it — a cross-country hop is ~70 ms *per query*.
- **Fewer, parallel queries.** Independent lookups go in one `Promise.all`;
  writes for many members are one statement (`recomputeBalances`), never a loop.
- **Frames in layouts.** The navbar, footer and admin tabs live in the `portal`,
  `admin` and `lipa` layouts, so navigation swaps only the content, and each
  section's `loading.tsx` shows a skeleton the instant a link is tapped.
- **Small images.** Pictures are pre-sized WebP in `public/images`; the
  navbar logo is 9 KB. `og-image.jpg` stays under 300 KB so WhatsApp shows the
  preview. Re-export at display size before adding a large photo.
- `npm run dev` compiles each page on first visit (seconds). Judge speed on a
  production build (`npm run build && npm start`) or the deployed site.

### Phone sign-in
Members sign in with a code sent to their phone. Three steps, with a
server-minted ticket in between:

```
requestPhoneCode(phone)        -> a code is delivered
verifyPhoneCode(phone, code)   -> ticket + the accounts this number may unlock
signIn('phone-otp', { ticket, selectionId, selectionKind })
```

**The ticket is the security boundary.** `verifyPhoneCode` resolves the
candidate accounts server-side from the number that was just proved, and records
them on the ticket. `completePhoneLogin` then refuses any selection not on that
list. The flow this replaced let the client name the member at the final step
with nothing binding it to the code, so knowing a member's phone number was
enough to claim their profile and ledger.

The ticket is also a practical necessity: Twilio Verify consumes a verification
on the first successful check, so the account chooser that shared handsets need
cannot re-verify and must rely on something the server already vouched for.

`requestPhoneCode` answers identically whether or not the number belongs to a
member, and pads its response time, so it cannot be used to enumerate members.

**Delivery** is pluggable (`src/lib/verification/`). Twilio Verify when
configured; otherwise a demo transport that shows the code on screen instead of
sending it — refused on the production host. That means the flow can be built,
tested and demonstrated before a Twilio account exists.

Run `npm run verify:phone-login` against the demo database to exercise the
security properties, including the takeover regression tests.

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

## Going live

The portal, cases and payments are built and tested, but the production
database has not been touched. In order:

1. **Back up** production (see below).
2. `npx prisma migrate deploy` against production. Every migration since the
   ledger is additive (new tables only).
3. `npm run migrate:ledger`: a dry run that prints what it would post. Then
   `npm run migrate:ledger -- --commit`. Each member's ledger must equal their
   legacy totals to the cent, or that member is rolled back.
4. `npm run verify:ledger` must report no drift.
5. Set `ROSTER_CONFIRMED=true` only once the leaders confirm the roster and the
   opening balances reconcile with the treasurer's spreadsheet. Until then the
   portal shows the figures without saying who is "uko sawa" or short.
6. Upload one real (redacted) Wells Fargo export on staging and check that
   sender names and memos are read correctly (`src/lib/finance/bank-csv.ts`).
7. **Speed settings outside the code:**
   - In Vercel, set `DATABASE_URL` to Neon's **pooled** connection string (the
     host with `-pooler`). Serverless functions open many short connections;
     the pooler makes each one cheap.
   - Neon's free plan suspends the database after 5 idle minutes, so the first
     visit afterwards waits ~1 second while it wakes. On a paid plan, set the
     production branch's compute to never suspend.
   - Confirm the Neon project really is in `us-west-2` (it is today), so the
     `pdx1` region in `vercel.json` sits next to it.

### Turning on card payments

Card, Apple Pay and bank-debit buttons, the checkout action and
`/api/stripe/webhook` all stay hidden until all three settings are in place:

1. Open a Stripe account under TSA's EIN, paying out to the Wells Fargo account.
2. In Vercel, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (test keys on
   staging first).
3. In the Stripe dashboard, add a webhook to `https://<site>/api/stripe/webhook`
   for `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   and `checkout.session.async_payment_failed`.
4. Set `STRIPE_ENABLED=true` and redeploy. Try the test card
   `4242 4242 4242 4242` on staging before production. Card fees are posted to
   `PROCESSING_FEE`, never deducted from what the member is credited.

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
   ROSTER_CONFIRMED=true        # so testers see green/amber/red and benefits
   # Optional, to test card payments: Stripe TEST keys + STRIPE_ENABLED=true
   ```
3. **Migrate and seed it:** `npx prisma migrate deploy`, then `npm run seed:demo`
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

`/login` shows six one-tap roles: Administrator (Katibu and Treasurer), a member
in good standing, a member who owes, a member who helps her mother, a new
member (kihiari), and a member with dues only. No passwords.

`/admin/demo` is the leaders' guide:
- ten bilingual scenarios, each saying who to sign in as, what to do and what
  should happen, ticked off as they go
- **Songa mbele** (time machine): moves the test clock 1, 7 or 15 days so
  deadlines, missed contributions and warnings can be seen without waiting
- a practice bank statement to download and upload, and a simulated Zelle deposit
- testers' notes from the **Toa maoni** box on the test banner (kept across resets)
- **Reset demo data**, which rebuilds everything, including the clock

**What to send the leaders:** the staging URL, how to get past Deployment
Protection (a bypass link or the shared password), and: *"Bonyeza jukumu kwenye
ukurasa wa kuingia, kisha fungua Majaribio"* (tap a role on the sign-in page,
then open the Majaribio tab).

### The demo roster

Thirteen named, invented members covering all four KATIBA Art 18.9 standing
tiers, plus 142 background members so that shares come out near the real ~$20
(over 12 members a $3,000 case would be $272 each). A reset also builds a case
at every step (closed, collecting and overdue, collecting, waiting for review,
under review, kihiari), two reported payments and a funeral notice. The named
members:

| Tier | Standing | Death / hardship entitlement | Members |
|---|---|---|---|
| FULL | $125+ | $10,000 / $3,000 | 6 (one joined two months ago: kihiari until six months) |
| REDUCED | advance under $100 | $5,000 / $1,500 | 3 |
| MINIMAL | dues only, no advance | $2,000 / $500 | 3 |
| VOLUNTARY | nothing on account | kihiari only | 1 |

It also includes a couple sharing one handset — six pairs do this in the real
roster — and a member in arrears, since most of the real membership will see a
shortfall on day one.

## Known issues

- **Waiting for the Board** (each is one constant in `constants.ts`):
  - whether members in arrears count when dividing a case;
  - whether a child under 21 living outside the USA gets the child tier
    (currently the relative tier);
  - whether the Art 18.4 $200 motisha comes out of the benefit or out of the
    collections;
  - how to record the Art 6.2 10% borrowing penalty (manually for now).
- The Wells Fargo CSV layout comes from the bank's documented export and has
  not yet been checked against TSA's own file.
- Supporting documents for a case are collected on WhatsApp and ticked off by
  the Katibu; there is no upload yet.
- `deepmerge-ts` carries three high advisories via `@prisma/config`. The only fix
  is Prisma 7, a major upgrade that should be its own piece of work. It is a
  build-time config merger with no runtime request surface.
- Self-service signup is disabled. `/signup` directs members to contact a leader
  until phone verification replaces the removed flow.
