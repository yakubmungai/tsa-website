/**
 * Fails when portal/admin UI uses raw Tailwind palette colours.
 *
 * The portal and officers' tools must look like tansha.org, which means theme
 * tokens only (bg-card, text-muted-foreground, text-success, bg-warning/15 …),
 * so light/dark mode and the brand colours stay in one place: globals.css.
 *
 *   npx tsx scripts/check-ui-tokens.ts
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();

/** Directories scanned in full. */
const DIRS = ['src/app/portal', 'src/app/admin', 'src/components/portal', 'src/components/admin'];

/** Legacy files outside those directories that have been moved onto tokens. */
const FILES = [
  'src/components/add-helper-form.tsx',
  'src/components/revoke-helper-button.tsx',
  'src/components/account-switcher.tsx',
  'src/components/acting-banner.tsx',
  'src/components/admin-submissions-list.tsx',
  'src/components/broadcast-composer.tsx',
  'src/components/admin-edit-member.tsx',
  'src/components/admin-delete-member.tsx',
  'src/components/admin-members-list.tsx',
  'src/components/navbar.tsx',
  'src/app/funeral-notice/page.tsx',
  'src/app/login/page.tsx',
  'src/components/phone-login-form.tsx',
  'src/components/login-form.tsx',
  'src/components/demo-sign-in.tsx',
  'src/components/demo-banner.tsx',
  'src/components/demo-reset.tsx',
];

/** Paths to skip. Empty: every portal and admin screen is on the theme. */
const IGNORE: string[] = [];

const PALETTE =
  /\b(?:bg|text|border|from|to|via|ring|fill|stroke|divide|outline|placeholder)-(?:slate|gray|zinc|neutral|stone|emerald|amber|rose|red|green|blue|sky|indigo|yellow|orange|lime|teal|cyan|violet|purple|fuchsia|pink)-\d{2,3}\b/g;

const EXT = /\.(tsx|ts|jsx|js)$/;

const norm = (p: string) => p.split(sep).join('/');
const ignored = (p: string) => IGNORE.some((dir) => p === dir || p.startsWith(`${dir}/`));

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = norm(relative(ROOT, full));
    if (ignored(rel)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(rel);
  }
}

const files = new Set<string>();
for (const dir of DIRS) {
  const full = join(ROOT, dir);
  if (existsSync(full)) {
    const found: string[] = [];
    walk(full, found);
    found.forEach((f) => files.add(f));
  }
}
for (const file of FILES) {
  if (existsSync(join(ROOT, file)) && !ignored(file)) files.add(file);
}

const problems: string[] = [];
for (const file of [...files].sort()) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const hits = line.match(PALETTE);
    if (hits) problems.push(`${file}:${i + 1}  ${[...new Set(hits)].join(', ')}`);
  });
}

if (problems.length > 0) {
  console.error(`Raw Tailwind palette colours found — use theme tokens instead:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\n${problems.length} line(s) in violation.`);
  process.exit(1);
}

console.log(`check-ui-tokens: ${files.size} files clean.`);
