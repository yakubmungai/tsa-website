-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('PENDING_OWNER_APPROVAL', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DelegationOrigin" AS ENUM ('SELF_SERVICE', 'ADMIN_PROVISIONED');

-- CreateEnum
CREATE TYPE "DelegationPermission" AS ENUM ('VIEW_FINANCES', 'MAKE_PAYMENTS', 'SUBMIT_FORMS', 'EDIT_PROFILE');

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "ownerMemberId" TEXT NOT NULL,
    "delegateUserId" TEXT,
    "delegatePhoneE164" TEXT NOT NULL,
    "delegateName" TEXT NOT NULL,
    "relationship" TEXT,
    "permissions" "DelegationPermission"[],
    "status" "DelegationStatus" NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL',
    "origin" "DelegationOrigin" NOT NULL,
    "createdByUserId" TEXT,
    "authorizedByUserId" TEXT,
    "authorizationNote" TEXT,
    "ownerConsentAt" TIMESTAMP(3),
    "ownerConsentMethod" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActingSession" (
    "id" TEXT NOT NULL,
    "delegationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "ownerMemberId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,

    CONSTRAINT "ActingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Delegation_ownerMemberId_status_idx" ON "Delegation"("ownerMemberId", "status");

-- CreateIndex
CREATE INDEX "Delegation_delegateUserId_status_idx" ON "Delegation"("delegateUserId", "status");

-- CreateIndex
CREATE INDEX "Delegation_delegatePhoneE164_status_idx" ON "Delegation"("delegatePhoneE164", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_ownerMemberId_delegatePhoneE164_key" ON "Delegation"("ownerMemberId", "delegatePhoneE164");

-- CreateIndex
CREATE INDEX "ActingSession_actorUserId_endedAt_idx" ON "ActingSession"("actorUserId", "endedAt");

-- CreateIndex
CREATE INDEX "ActingSession_ownerMemberId_endedAt_idx" ON "ActingSession"("ownerMemberId", "endedAt");

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActingSession" ADD CONSTRAINT "ActingSession_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActingSession" ADD CONSTRAINT "ActingSession_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

