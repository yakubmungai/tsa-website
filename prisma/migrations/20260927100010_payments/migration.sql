-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ZELLE', 'CASHAPP', 'BANK_TRANSFER', 'CHECK', 'CASH', 'CARD', 'ACH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REPORTED', 'MATCHED', 'CONFIRMED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REPORTED',
    "amountCents" INTEGER NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "payerName" TEXT,
    "memo" TEXT,
    "preference" TEXT NOT NULL DEFAULT 'AUTO',
    "reportedByUserId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'portal',
    "providerRef" TEXT,
    "feeCents" INTEGER,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "assessmentId" TEXT,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT,
    "rowCount" INTEGER NOT NULL,
    "newRows" INTEGER NOT NULL,
    "matchedRows" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowHash" TEXT NOT NULL,
    "postedOn" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "senderName" TEXT,
    "memo" TEXT,
    "matchedPaymentId" TEXT,
    "suggestedMemberId" TEXT,
    "matchConfidence" TEXT,
    "ignoredAt" TIMESTAMP(3),
    "ignoredReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'REMINDER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_memberId_createdAt_idx" ON "Payment"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_rowHash_key" ON "BankTransaction"("rowHash");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_matchedPaymentId_key" ON "BankTransaction"("matchedPaymentId");

-- CreateIndex
CREATE INDEX "BankTransaction_postedOn_idx" ON "BankTransaction"("postedOn");

-- CreateIndex
CREATE UNIQUE INDEX "PayLink_tokenHash_key" ON "PayLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PayLink_memberId_idx" ON "PayLink"("memberId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "BankImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_matchedPaymentId_fkey" FOREIGN KEY ("matchedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayLink" ADD CONSTRAINT "PayLink_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
