-- CreateEnum
CREATE TYPE "LedgerAccount" AS ENUM ('OPENING_BALANCE', 'ENTRY_FEE', 'ANNUAL_DUES', 'ADVANCE_DEPOSIT', 'HARDSHIP_LEVY', 'DEATH_LEVY', 'BORROW_PENALTY', 'EXIT_REPAYMENT', 'BENEFIT_PAYOUT', 'MEMORIAL_GRANT', 'MILESTONE_GRANT', 'DONATION', 'FINDER_INCENTIVE', 'LEADERSHIP_MOTISHA', 'REIMBURSEMENT', 'PROCESSING_FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerEntryKind" AS ENUM ('OPENING', 'CHARGE', 'PAYMENT', 'PAYOUT', 'REVERSAL', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "account" "LedgerAccount" NOT NULL,
    "entryKind" "LedgerEntryKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "descriptionSw" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseEventId" TEXT,
    "assessmentId" TEXT,
    "paymentId" TEXT,
    "reversesId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "idempotencyKey" TEXT,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberBalance" (
    "memberId" TEXT NOT NULL,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "advanceCents" INTEGER NOT NULL DEFAULT 0,
    "entryFeeCents" INTEGER NOT NULL DEFAULT 0,
    "duesCents" INTEGER NOT NULL DEFAULT 0,
    "duesYear" INTEGER NOT NULL,
    "outstandingCents" INTEGER NOT NULL DEFAULT 0,
    "recomputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberBalance_pkey" PRIMARY KEY ("memberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_reversesId_key" ON "LedgerEntry"("reversesId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_memberId_occurredAt_idx" ON "LedgerEntry"("memberId", "occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_account_occurredAt_idx" ON "LedgerEntry"("account", "occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_caseEventId_idx" ON "LedgerEntry"("caseEventId");

-- CreateIndex
CREATE INDEX "LedgerEntry_assessmentId_idx" ON "LedgerEntry"("assessmentId");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberBalance" ADD CONSTRAINT "MemberBalance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

