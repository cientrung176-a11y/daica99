import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

const DEFAULT_USERS = [
  { username: 'admin',   fullName: 'Quản trị viên', role: 'ADMIN' as const, password: 'Admin@123' },
  { username: 'kythuat', fullName: 'Kỹ thuật viên', role: 'TECH'  as const, password: 'Tech@123' },
  { username: 'xem',     fullName: 'Chỉ xem',         role: 'VIEW'  as const, password: 'View@123' },
];

export async function seedDefaultUsers() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`[SEED] Database already has ${count} user(s), skipping default seed.`);
    return;
  }

  console.log('[SEED] No users found. Creating default users...');
  for (const u of DEFAULT_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log(`[SEED] Created user ${u.username} (${u.role})`);
  }
  console.log('[SEED] Default users created successfully.');
}
