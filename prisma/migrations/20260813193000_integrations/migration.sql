ALTER TABLE "Vehicle" ADD COLUMN "externalSource" TEXT,
ADD COLUMN "externalId" TEXT;

ALTER TABLE "FinanceApplication" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'Santander',
ADD COLUMN "externalId" TEXT;

CREATE TABLE "IntegrationEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vehicle_externalSource_externalId_key" ON "Vehicle"("externalSource", "externalId");
CREATE INDEX "IntegrationEvent_provider_createdAt_idx" ON "IntegrationEvent"("provider", "createdAt");
