-- CreateTable BorrowLog
CREATE TABLE IF NOT EXISTS "BorrowLog" (
    "id"           TEXT NOT NULL,
    "deviceId"     TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt"   TIMESTAMP(3),
    "isReturned"   BOOLEAN NOT NULL DEFAULT false,
    "note"         TEXT,

    CONSTRAINT "BorrowLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'BorrowLog_deviceId_idx') THEN
        CREATE INDEX "BorrowLog_deviceId_idx" ON "BorrowLog"("deviceId");
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BorrowLog_deviceId_fkey') THEN
        ALTER TABLE "BorrowLog" ADD CONSTRAINT "BorrowLog_deviceId_fkey"
            FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add imageUrl to TechLog
ALTER TABLE "TechLog" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
