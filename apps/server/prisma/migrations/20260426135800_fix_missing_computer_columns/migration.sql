-- Comprehensive schema sync: add all missing columns/indexes not covered by previous migrations
-- Uses IF NOT EXISTS to be safe for partial states

-- ============================================================
-- Computer: missing columns
-- ============================================================
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "machineId" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "anyDeskId" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "rustDeskId" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "rustdeskPassword" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "cpuPercent" DOUBLE PRECISION;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "ramPercent" DOUBLE PRECISION;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "appVersion" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "pendingCommand" TEXT;

-- Unique index on machineId (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Computer_machineId_key'
    ) THEN
        CREATE UNIQUE INDEX "Computer_machineId_key" ON "Computer"("machineId");
    END IF;
END $$;

-- ============================================================
-- TechLog: missing columns
-- ============================================================
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "deviceType" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'TRUNG_BINH';
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "cause" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'HOAN_THANH';
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "technicianName" TEXT;

-- ============================================================
-- Missing foreign key: TechLog.computerId -> Computer.id
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TechLog_computerId_fkey'
    ) THEN
        ALTER TABLE "TechLog" ADD CONSTRAINT "TechLog_computerId_fkey"
            FOREIGN KEY ("computerId") REFERENCES "Computer"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- Missing indexes
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'TechLog_computerId_idx'
    ) THEN
        CREATE INDEX "TechLog_computerId_idx" ON "TechLog"("computerId");
    END IF;
END $$;
