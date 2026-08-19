-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'DECEASED');

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'sw',
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'web',
ADD COLUMN     "submitterEmail" TEXT,
ADD COLUMN     "submitterName" TEXT,
ADD COLUMN     "submitterPhone" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "joinedAtEstimated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "memberNumber" INTEGER,
ADD COLUMN     "placeOfBirth" TEXT,
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'sw',
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_reference_key" ON "FormSubmission"("reference");

-- CreateIndex
CREATE INDEX "FormSubmission_status_createdAt_idx" ON "FormSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_formType_status_idx" ON "FormSubmission"("formType", "status");

-- CreateIndex
CREATE INDEX "FormSubmission_submitterPhone_idx" ON "FormSubmission"("submitterPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberNumber_key" ON "Member"("memberNumber");

