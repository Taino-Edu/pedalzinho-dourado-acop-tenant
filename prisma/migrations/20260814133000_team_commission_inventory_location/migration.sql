ALTER TABLE "TeamMember"
ADD COLUMN "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5;

ALTER TABLE "Vehicle"
ADD COLUMN "location" TEXT NOT NULL DEFAULT 'patio';

CREATE INDEX "Vehicle_location_idx" ON "Vehicle"("location");
