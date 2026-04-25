'use strict';
/**
 * Production seed script - runs with plain Node.js (no tsx needed)
 * Usage: node scripts/seed.cjs
 */
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

const USERS = [
  { username: 'admin',   fullName: 'Quản trị viên',   role: 'ADMIN', password: 'Admin@123' },
  { username: 'kythuat', fullName: 'Kỹ thuật viên',   role: 'TECH',  password: 'Tech@123' },
  { username: 'xem',     fullName: 'Chỉ xem',           role: 'VIEW',  password: 'View@123' },
];

async function main() {
  console.log('[SEED] Starting password reset...');
  for (const u of USERS) {
    const hash = await bcryptjs.hash(u.password, 10);
    const updated = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash, isActive: true, fullName: u.fullName, role: u.role },
      create: {
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log(`[SEED] ${u.username} OK (role=${updated.role})`);
  }
  console.log('[SEED] Done');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[SEED] FAILED:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
