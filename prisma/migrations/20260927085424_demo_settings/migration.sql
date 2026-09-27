-- CreateTable
CREATE TABLE "DemoSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoSetting_pkey" PRIMARY KEY ("key")
);
