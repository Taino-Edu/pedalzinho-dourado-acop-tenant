ALTER TABLE "Vehicle"
ADD COLUMN "vehicleType" TEXT NOT NULL DEFAULT 'car';

CREATE INDEX "Vehicle_vehicleType_status_idx" ON "Vehicle"("vehicleType", "status");
