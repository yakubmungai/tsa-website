import type { Prisma, PrismaClient } from '@prisma/client';
import { addDays } from '@/lib/finance/dates';
import { recomputeBalances } from '@/lib/finance/ledger';
import { CLAIM_TYPES, type ClaimTypeKey } from '@/lib/finance/constants';
import { announceClaim, createClaimRow, loadShares, reviewClaim } from '@/features/claims/service';

/**
 * The situations leaders need to practise on, built with the real engine —
 * the same code that announces and collects real cases — just dated in the
 * past. After a reset the demo holds one case at every step:
 *
 *   closed      Baraka's father, 11 weeks ago — announced, collected, paid, closed
 *   closed      Upendo's hospital stay, 6 weeks ago — the same
 *   collecting  Zawadi's father, 3 weeks ago — overdue for a few members
 *   collecting  Hamisi's illness, 3 days ago — still within the two weeks
 *   submitted   Grace's son, yesterday — waiting for review (MINIMAL tier)
 *   in review   Neema's mother — reported late, relative not on her contract
 *   kihiari     Rose's father — she joined two months ago (Art 4.5)
 *
 * which leaves Daniel with one missed contribution (a warning), Fatuma with
 * three (listed for the Board), two Zelle payments reported and waiting for
 * the Treasurer, and a public funeral notice to turn into a case.
 */

type Db = PrismaClient;

async function member(db: Db, names: string) {
  return db.member.findFirstOrThrow({ where: { names } });
}

async function approve(db: Db, claimId: string, at: Date) {
  const review = await reviewClaim(claimId);
  const benefit = review.eligibility.suggestVoluntary ? 0 : review.eligibility.suggestedBenefitCents;
  await db.claim.update({
    where: { id: claimId },
    data: {
      status: 'APPROVED',
      effectiveType: review.eligibility.effectiveType,
      tierAtEvent: review.tierAtEvent,
      standingAtEventCents: review.standingAtEventCents,
      eligibility: review.eligibility as unknown as Prisma.InputJsonValue,
      benefitCents: benefit,
      levyPoolCents: benefit,
      reviewStartedAt: at,
      approvedAt: at,
      documentsChecklist: { deathCertificate: true, birthCertificate: true },
    },
  });
}

/**
 * Everyone who still owes on a case pays it — except the members named.
 *
 * One bulk insert rather than a write per member: a reset runs inside a
 * single request on the host, and a case has ~150 shares.
 */
async function collect(db: Db, claimId: string, at: Date, except: string[]) {
  const claim = await db.claim.findUniqueOrThrow({ where: { id: claimId } });
  const account = CLAIM_TYPES[(claim.effectiveType ?? claim.type) as ClaimTypeKey].levyAccount;
  const shares = await loadShares({ claimId }, addDays(at, 1));
  const paying = shares.filter((s) => !except.includes(s.memberId));
  // Art 6.2 — members restore their savings within 30 days of a case taking
  // from them. Without this every case would push the whole roster under $125.
  await db.ledgerEntry.createMany({
    data: paying
      .filter((s) => s.fromAdvanceCents > 0)
      .map((s) => ({
        memberId: s.memberId,
        account: 'ADVANCE_DEPOSIT' as const,
        entryKind: 'PAYMENT' as const,
        amountCents: s.fromAdvanceCents,
        description: 'Restoring advance savings — Zelle',
        descriptionSw: 'Kurejesha akiba tangulizi — Zelle',
        occurredAt: at,
      })),
  });
  await db.ledgerEntry.createMany({
    data: paying
      .filter((s) => s.outstandingCents > 0)
      .map((s) => ({
        memberId: s.memberId,
        account,
        entryKind: 'PAYMENT' as const,
        amountCents: s.outstandingCents,
        description: `Payment for ${claim.reference} — Zelle`,
        descriptionSw: `Malipo ya ${claim.reference} — Zelle`,
        occurredAt: at,
        caseEventId: claim.id,
        assessmentId: s.id,
      })),
  });
}

async function payOut(db: Db, claimId: string, at: Date, paidTo: string, close: boolean) {
  const claim = await db.claim.findUniqueOrThrow({ where: { id: claimId } });
  await db.ledgerEntry.create({
    data: {
      memberId: claim.memberId,
      account: 'BENEFIT_PAYOUT',
      entryKind: 'PAYOUT',
      amountCents: -(claim.benefitCents ?? 0),
      description: `${claim.reference} — paid to ${paidTo}`,
      descriptionSw: `${claim.reference} — amelipwa ${paidTo}`,
      occurredAt: at,
      caseEventId: claim.id,
    },
  });
  await db.claim.update({
    where: { id: claimId },
    data: {
      status: close ? 'CLOSED' : 'PAID',
      paidAt: at,
      closedAt: close ? addDays(at, 2) : null,
      payoutConditions: { muhasibuChecked: true, muhakikiApproved: true, idSeen: true, receiptSigned: true },
    },
  });
}

async function newCase(db: Db, data: Omit<Prisma.ClaimUncheckedCreateInput, 'reference'>) {
  return db.$transaction((tx) => createClaimRow(tx, data));
}

export async function seedScenarios(db: Db, asOf: Date, log: (line: string) => void = () => {}) {
  const days = (n: number) => addDays(asOf, -n);
  const [baraka, upendo, zawadi, hamisi, grace, neema, rose, fatuma, daniel, joseph, emmanuel] = await Promise.all(
    [
      'Baraka Mwakalinga',
      'Upendo Massawe',
      'Zawadi Massawe',
      'Hamisi Mrisho',
      'Grace Ndosi',
      'Neema Kimaro',
      'Rose Mwakyusa',
      'Fatuma Juma',
      'Daniel Kileo',
      'Joseph Mchome',
      'Emmanuel Shirima',
    ].map((n) => member(db, n))
  );

  // ── Upendo helps her mother Zawadi (delegated access) ────────────────────
  const helperUser = await db.user.findFirst({ where: { memberId: upendo.id } });
  if (helperUser) {
    await db.delegation.create({
      data: {
        ownerMemberId: zawadi.id,
        delegateUserId: helperUser.id,
        delegatePhoneE164: upendo.phoneE164 ?? upendo.phone ?? '',
        delegateName: upendo.names,
        relationship: 'binti',
        permissions: ['VIEW_FINANCES', 'MAKE_PAYMENTS', 'SUBMIT_FORMS', 'EDIT_PROFILE'],
        status: 'ACTIVE',
        origin: 'ADMIN_PROVISIONED',
        ownerConsentAt: days(30),
        ownerConsentMethod: 'IN_PERSON',
        authorizationNote: 'Demo: Zawadi agreed in person at the September meeting.',
      },
    });
  }

  // ── Two closed cases, weeks ago ──────────────────────────────────────────
  const x1 = await newCase(db, {
    memberId: baraka.id,
    type: 'RELATIVE_DEATH',
    relationship: 'PARENT_GUARDIAN',
    subjectName: 'Elias Mwakalinga',
    eventDate: days(78),
    reportedAt: days(77),
    description: 'Baba yangu alifariki Mbeya.',
  });
  await approve(db, x1.id, days(76));
  await announceClaim(x1.id, null, days(75));
  await collect(db, x1.id, days(70), [fatuma.id]);
  await payOut(db, x1.id, days(68), baraka.names, true);

  const x2 = await newCase(db, {
    memberId: upendo.id,
    type: 'HARDSHIP',
    hardshipCategory: 'ILLNESS_CRITICAL',
    relationship: 'SELF',
    subjectName: upendo.names,
    eventDate: days(48),
    reportedAt: days(47),
    description: 'Nimelazwa hospitali wiki tatu.',
  });
  await approve(db, x2.id, days(46));
  await announceClaim(x2.id, null, days(45));
  await collect(db, x2.id, days(40), [fatuma.id]);
  await payOut(db, x2.id, days(38), upendo.names, true);

  // ── Collecting, and overdue for a few ────────────────────────────────────
  const a = await newCase(db, {
    memberId: zawadi.id,
    type: 'RELATIVE_DEATH',
    relationship: 'PARENT_GUARDIAN',
    subjectName: 'Method Massawe',
    eventDate: days(25),
    reportedAt: days(24),
    description: 'Baba yangu alifariki Moshi. Mazishi yalikuwa Jumamosi.',
    filedByUserId: helperUser?.id ?? null,
    filedOnBehalf: true,
  });
  await approve(db, a.id, days(23));
  await announceClaim(a.id, null, days(22));
  await collect(db, a.id, days(15), [fatuma.id, daniel.id, joseph.id, emmanuel.id]);
  await db.claim.update({
    where: { id: a.id },
    data: { payoutConditions: { muhasibuChecked: true, muhakikiApproved: true } },
  });

  // ── Collecting, still inside the two weeks ───────────────────────────────
  const b = await newCase(db, {
    memberId: hamisi.id,
    type: 'HARDSHIP',
    hardshipCategory: 'ILLNESS_CRITICAL',
    relationship: 'SELF',
    subjectName: hamisi.names,
    eventDate: days(5),
    reportedAt: days(4),
    description: 'Upasuaji wa moyo, hospitali Methodist.',
  });
  await approve(db, b.id, days(3));
  await announceClaim(b.id, null, days(3));

  // ── Waiting for review ───────────────────────────────────────────────────
  await newCase(db, {
    memberId: grace.id,
    type: 'CHILD_DEATH',
    relationship: 'CHILD',
    subjectName: 'Peter Ndosi',
    subjectAge: 16,
    subjectLivesInUsa: true,
    eventDate: days(2),
    reportedAt: days(1),
    description: 'Mwanangu Peter alifariki kwa ajali ya gari.',
    contactPhone: grace.phone,
    memorialRequested: true,
    memorialDate: addDays(asOf, 12),
  });

  // ── Under review: reported late, and not on the contract ─────────────────
  const e = await newCase(db, {
    memberId: neema.id,
    type: 'RELATIVE_DEATH',
    relationship: 'PARENT_GUARDIAN',
    subjectName: 'Mama Kimaro',
    eventDate: days(15),
    reportedAt: days(2),
    description: 'Mama yangu alifariki Arusha.',
  });
  await db.claim.update({ where: { id: e.id }, data: { status: 'UNDER_REVIEW', reviewStartedAt: days(1) } });

  // ── Kihiari: a new member ────────────────────────────────────────────────
  const f = await newCase(db, {
    memberId: rose.id,
    type: 'RELATIVE_DEATH',
    relationship: 'PARENT_GUARDIAN',
    subjectName: 'Anyitike Mwakyusa',
    eventDate: days(20),
    reportedAt: days(19),
    description: 'Baba yangu alifariki Tukuyu.',
  });
  const fr = await reviewClaim(f.id);
  await db.claim.update({
    where: { id: f.id },
    data: {
      status: 'VOLUNTARY',
      tierAtEvent: fr.tierAtEvent,
      standingAtEventCents: fr.standingAtEventCents,
      eligibility: fr.eligibility as unknown as Prisma.InputJsonValue,
      benefitCents: 0,
      levyPoolCents: 0,
      approvedAt: days(18),
      decisionNote: 'Mwanachama mpya (chini ya miezi 6) — msaada wa hiari, Ibara 4.5.',
    },
  });

  // ── Payments waiting for the Treasurer ───────────────────────────────────
  const jShare = (await loadShares({ claimId: a.id, memberId: joseph.id }, asOf))[0];
  await db.payment.createMany({
    data: [
      {
        memberId: joseph.id,
        method: 'ZELLE',
        amountCents: Math.ceil((jShare?.outstandingCents ?? 2000) / 100) * 100,
        paidOn: days(1),
        payerName: joseph.names,
        memo: 'TSA-' + (joseph.memberNumber ?? ''),
        source: 'portal',
      },
      {
        memberId: emmanuel.id,
        method: 'CASHAPP',
        amountCents: 2500,
        paidOn: days(1),
        payerName: 'Lucy Shirima',
        source: 'paylink',
      },
    ],
  });

  // ── A public funeral notice, to turn into a case ─────────────────────────
  await db.formSubmission.create({
    data: {
      reference: 'TSA-F-DEMO1',
      formType: 'FUNERAL_ASSISTANCE',
      status: 'PENDING',
      submitterName: 'Rashid Mrisho',
      submitterPhone: '+17135550102',
      source: 'web',
      data: {
        fullName: 'Rashid Mrisho',
        deceasedName: 'Juma Mrisho',
        relation: 'Baba wa Salma Mrisho',
        placeOfPassing: 'Tanga',
        dateTimeOfPassing: days(1).toISOString().slice(0, 16),
        causeOfDeath: 'Ugonjwa',
        emergencyContacts: [{ fullName: 'Rashid Mrisho', phoneNumber: '+17135550102' }],
        burialLocation: 'Tanga',
        burialDate: addDays(asOf, 3).toISOString().slice(0, 10),
      },
      memberId: null,
    },
  });

  // Balances as of now, after all the dated activity above.
  const all = await db.member.findMany({ select: { id: true } });
  await db.$transaction((tx) => recomputeBalances(tx, all.map((m) => m.id)), { timeout: 120_000 });
  log('  + scenarios: 7 cases at every step, 2 payments waiting, 1 funeral notice');
}
