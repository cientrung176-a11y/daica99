-- CreateTable
CREATE TABLE IF NOT EXISTS "MaintenanceSchedule" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "computerId"  TEXT,
    "deviceId"    TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "repeatDays"  INTEGER,
    "note"        TEXT,
    "isDone"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MaintenanceSchedule_scheduledAt_idx') THEN
        CREATE INDEX "MaintenanceSchedule_scheduledAt_idx" ON "MaintenanceSchedule"("scheduledAt");
    END IF;
END $$;

-- AddForeignKey (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceSchedule_computerId_fkey') THEN
        ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_computerId_fkey"
            FOREIGN KEY ("computerId") REFERENCES "Computer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceSchedule_deviceId_fkey') THEN
        ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_deviceId_fkey"
            FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
