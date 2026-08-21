CREATE TABLE "PlatformClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "setupFeeCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "billingType" TEXT NOT NULL DEFAULT 'monthly',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformSubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priceOverrideCents" INTEGER,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "PlatformSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformDeployment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "projectName" TEXT NOT NULL,
    "appContainer" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastHealthAt" TIMESTAMP(3),
    "deployedAt" TIMESTAMP(3),
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformDeployment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformClient_slug_key" ON "PlatformClient"("slug");
CREATE UNIQUE INDEX "PlatformClient_domain_key" ON "PlatformClient"("domain");
CREATE INDEX "PlatformClient_status_idx" ON "PlatformClient"("status");
CREATE UNIQUE INDEX "PlatformService_code_key" ON "PlatformService"("code");
CREATE UNIQUE INDEX "PlatformSubscription_clientId_serviceId_key" ON "PlatformSubscription"("clientId", "serviceId");
CREATE INDEX "PlatformSubscription_status_idx" ON "PlatformSubscription"("status");
CREATE UNIQUE INDEX "PlatformDeployment_clientId_environment_key" ON "PlatformDeployment"("clientId", "environment");
CREATE INDEX "PlatformDeployment_status_idx" ON "PlatformDeployment"("status");

ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "PlatformClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "PlatformService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformDeployment" ADD CONSTRAINT "PlatformDeployment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "PlatformClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
