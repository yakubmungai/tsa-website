-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('MEMBER_DEATH', 'CHILD_DEATH', 'RELATIVE_DEATH', 'HARDSHIP');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COLLECTING', 'PAID', 'CLOSED', 'REJECTED', 'VOLUNTARY');

-- CreateEnum
CREATE TYPE "ClaimRelationship" AS ENUM ('SELF', 'SPOUSE', 'CHILD', 'PARENT_GUARDIAN', 'SIBLING');

-- CreateEnum
CREATE TYPE "HardshipCategory" AS ENUM ('ILLNESS_CRITICAL', 'IMMIGRATION_DETENTION', 'FIRE');

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "ClaimType" NOT NULL,
    "effectiveType" "ClaimType",
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "subjectName" TEXT NOT NULL,
    "relationship" "ClaimRelationship" NOT NULL,
    "subjectAge" INTEGER,
    "subjectLivesInUsa" BOOLEAN,
    "hardshipCategory" "HardshipCategory",
    "eventDate" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientRelationship" TEXT,
    "filedByUserId" TEXT,
    "filedOnBehalf" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'sw',
    "tierAtEvent" TEXT,
    "standingAtEventCents" INTEGER,
    "eligibility" JSONB,
    "documentsChecklist" JSONB NOT NULL DEFAULT '{}',
    "payoutConditions" JSONB NOT NULL DEFAULT '{}',
    "benefitCents" INTEGER,
    "levyPoolCents" INTEGER,
    "memorialRequested" BOOLEAN NOT NULL DEFAULT false,
    "memorialDate" TIMESTAMP(3),
    "reviewedById" TEXT,
    "decisionNote" TEXT,
    "reviewStartedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "announcedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "sourceSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "excusedAt" TIMESTAMP(3),
    "excuseNote" TEXT,
    "excusedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_reference_key" ON "Claim"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_sourceSubmissionId_key" ON "Claim"("sourceSubmissionId");

-- CreateIndex
CREATE INDEX "Claim_status_createdAt_idx" ON "Claim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Claim_memberId_eventDate_idx" ON "Claim"("memberId", "eventDate");

-- CreateIndex
CREATE INDEX "Assessment_memberId_dueAt_idx" ON "Assessment"("memberId", "dueAt");

-- CreateIndex
CREATE INDEX "Assessment_memberId_billingMonth_idx" ON "Assessment"("memberId", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_claimId_memberId_key" ON "Assessment"("claimId", "memberId");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
