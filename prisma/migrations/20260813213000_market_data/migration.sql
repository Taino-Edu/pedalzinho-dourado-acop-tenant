ALTER TABLE "Vehicle" ADD COLUMN "fipeCode" TEXT,
ADD COLUMN "fipePrice" INTEGER,
ADD COLUMN "fipeModel" TEXT,
ADD COLUMN "fipeReferenceMonth" TEXT,
ADD COLUMN "fipeUpdatedAt" TIMESTAMP(3);

CREATE TABLE "ExternalCache" (
  "key" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalCache_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "ExternalCache_provider_expiresAt_idx" ON "ExternalCache"("provider", "expiresAt");
