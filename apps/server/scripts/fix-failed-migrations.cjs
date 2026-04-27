'use strict';
/**
 * Runs before `prisma migrate deploy` to clean up any failed migration records
 * so the deploy can proceed cleanly. Also resets admin PIN if needed.
 */
async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Remove the failed migration record from _prisma_migrations
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name = '20260427220000_reset_admin_pin'`
    );
    if (deleted > 0) {
      console.log('[FIX] Removed failed migration record from _prisma_migrations');
    }

    // Reset admin PIN (delete row so it falls back to default 123456)
    try {
      const pinDeleted = await prisma.$executeRawUnsafe(
        `DELETE FROM "Setting" WHERE "key" = 'rustdesk_admin_pin'`
      );
      if (pinDeleted > 0) {
        console.log('[FIX] Admin PIN reset to default 123456');
      }
    } catch (_) {
      console.log('[FIX] PIN reset skipped (Setting table may not exist yet)');
    }
  } catch (e) {
    console.log('[FIX] Cleanup error (safe to continue):', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.log('[FIX] Unexpected error (continuing anyway):', e.message);
});
