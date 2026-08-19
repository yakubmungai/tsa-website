/**
 * Checks that form submissions are persisted, escaped and de-duplicated.
 *
 *   npx tsx --conditions=react-server scripts/verify-form-submissions.ts
 *
 * The behaviour under test is the one that was missing entirely: every
 * application used to be emailed and nothing else, so the review queue was
 * permanently empty and the data existed only in a mailbox.
 */
import { PrismaClient } from '@prisma/client';
import { recordSubmission } from '../src/features/forms/record';
import { findDuplicateCandidates, memberDataFromApplication } from '../src/features/forms/promote';
import { escapeDeep, esc } from '../src/lib/html';

const db = new PrismaClient();
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  ok ? passed++ : failed++;
}

async function main() {
  console.log('\nForm submission verification\n');

  // ── Escaping ─────────────────────────────────────────────────────────────
  console.log('Escaping');
  const hostile = '<img src=x onerror=alert(1)>"\'&';
  check('script markup is neutralised', !esc(hostile).includes('<img'));
  check('quotes and ampersands are encoded', esc(hostile).includes('&quot;') && esc(hostile).includes('&amp;'));

  const deep = escapeDeep({
    name: '<b>Bad</b>',
    nested: [{ phone: '<script>' }],
    keep: 42,
  });
  check('nested values are escaped', deep.nested[0].phone === '&lt;script&gt;');
  check('non-strings pass through unchanged', deep.keep === 42);

  // ── Persistence ──────────────────────────────────────────────────────────
  console.log('\nPersistence');
  const before = await db.formSubmission.count();

  const recorded = await recordSubmission({
    formType: 'MEMBERSHIP',
    data: {
      firstName: 'Testy',
      lastName: 'McVerify',
      phone: '713-555-0190',
      email: 'testy@example.test',
      dob: '1970-04-01',
      pob: 'Arusha',
      streetAddress: '1 Test Way',
      city: 'Houston',
      state: 'TX',
      zipCode: '77072',
      fatherName: 'Baba Test',
      motherName: 'Mama Test',
      children: [{ name: 'Mtoto Test' }],
      siblings: [{ name: 'Ndugu Test' }],
      witnesses: [{ name: 'Shahidi Test', phone: '713-555-0191' }],
      funeralSupervisors: [{ name: 'Msimamizi Test', phone: '713-555-0192' }],
    },
    submitter: { name: 'Testy McVerify', phone: '713-555-0190', email: 'testy@example.test' },
    email: { subject: 'verification run', html: '<p>verification run</p>' },
  });

  const after = await db.formSubmission.count();
  check('a submission row is written', after === before + 1);
  check('a quotable reference is issued', /^TSA-F-[0-9A-Z]{5}$/.test(recorded.reference), recorded.reference);
  check(
    'the reference avoids ambiguous letters',
    !/[ILOU]/.test(recorded.reference.replace('TSA-F-', ''))
  );

  const row = await db.formSubmission.findUnique({ where: { id: recorded.submissionId } });
  check('it lands in the review queue as pending', row?.status === 'PENDING');
  check('the submitter phone is normalised for matching', row?.submitterPhone === '+17135550190');
  check(
    'a failed notification does not lose the record',
    row !== null && (row.emailSentAt !== null || row.emailError !== null)
  );

  // ── Field retention ──────────────────────────────────────────────────────
  console.log('\nFields the form used to discard');
  const payload = row!.data as Record<string, unknown>;
  for (const field of ['dob', 'pob', 'fatherName', 'motherName']) {
    check(`${field} is retained`, payload[field] !== undefined);
  }

  const built = memberDataFromApplication(payload);
  check('date of birth is parsed', built.dateOfBirth instanceof Date);
  check('place of birth is carried over', built.placeOfBirth === 'Arusha');
  check('parents are collected', built.parents.length === 2, built.parents.join(', '));
  check('phone is normalised', built.phoneE164 === '+17135550190');
  check('the address reads properly', built.address === '1 Test Way, Houston, TX 77072', String(built.address));

  const sparse = memberDataFromApplication({ firstName: 'Solo', lastName: 'Person' });
  check(
    'a missing address does not become "undefined, undefined"',
    sparse.address === null,
    String(sparse.address)
  );

  // ── Duplicate detection ──────────────────────────────────────────────────
  console.log('\nDuplicate detection');
  const existing = await db.member.findFirst({ where: { archivedAt: null } });
  if (existing) {
    const byPhone = await findDuplicateCandidates('Someone Else', existing.phoneE164);
    check(
      'an existing member is found by phone',
      byPhone.some((c) => c.id === existing.id && c.reason === 'phone'),
      `${byPhone.length} candidate(s)`
    );

    const byName = await findDuplicateCandidates(existing.names, null);
    check(
      'an existing member is found by surname',
      byName.some((c) => c.id === existing.id),
      `${byName.length} candidate(s)`
    );
  }

  const none = await findDuplicateCandidates('Zzyzx Nonexistent', '+17135559999');
  check('an unrelated applicant matches nobody', none.length === 0, `${none.length} found`);

  // clean up
  await db.formSubmission.delete({ where: { id: recorded.submissionId } });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('\nVerification error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
