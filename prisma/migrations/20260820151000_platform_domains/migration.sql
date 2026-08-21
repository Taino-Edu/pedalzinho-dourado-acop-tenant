ALTER TABLE "PlatformClient"
ADD COLUMN "platformDomain" TEXT,
ADD COLUMN "customDomain" TEXT,
ADD COLUMN "domainMode" TEXT NOT NULL DEFAULT 'platform',
ADD COLUMN "domainStatus" TEXT NOT NULL DEFAULT 'pending';

UPDATE "PlatformClient" SET "platformDomain" = "domain";

ALTER TABLE "PlatformClient" ALTER COLUMN "platformDomain" SET NOT NULL;

ALTER TABLE "PlatformDeployment"
ADD COLUMN "appPort" INTEGER,
ADD COLUMN "postgresPort" INTEGER,
ADD COLUMN "installPath" TEXT,
ADD COLUMN "lastError" TEXT;

CREATE UNIQUE INDEX "PlatformClient_platformDomain_key" ON "PlatformClient"("platformDomain");
CREATE UNIQUE INDEX "PlatformClient_customDomain_key" ON "PlatformClient"("customDomain");
