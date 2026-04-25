-- Add missing columns to TechLog (safe for existing data)
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "deviceType" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'TRUNG_BINH';
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "cause" TEXT;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION;
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'HOAN_THANH';
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "technicianName" TEXT;

-- Add missing columns to Computer (safe for existing data)
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "currentUser" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "windows" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "cpu" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "ram" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "disk" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "anyDeskId" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "rustDeskId" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "rustdeskPassword" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "antivirus" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "pingMs" INTEGER;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "cpuPercent" DOUBLE PRECISION;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "ramPercent" DOUBLE PRECISION;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "appVersion" TEXT;
ALTER TABLE "Computer" ADD COLUMN IF NOT EXISTS "pendingCommand" TEXT;

-- Add missing foreign key for TechLog.computerId -> Computer.id
-- Only add if it does not already exist
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
