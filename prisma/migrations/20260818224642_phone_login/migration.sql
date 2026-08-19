-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "phoneE164" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "phoneE164" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AuthTicket" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "candidates" JSONB NOT NULL,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "providerRef" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthTicket_tokenHash_key" ON "AuthTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthTicket_expiresAt_idx" ON "AuthTicket"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpRequest_phoneE164_createdAt_idx" ON "OtpRequest"("phoneE164", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_createdAt_idx" ON "OtpRequest"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_key_windowStart_key" ON "RateLimitBucket"("scope", "key", "windowStart");

-- CreateIndex
CREATE INDEX "Member_phoneE164_idx" ON "Member"("phoneE164");

-- CreateIndex
CREATE INDEX "User_phoneE164_idx" ON "User"("phoneE164");
