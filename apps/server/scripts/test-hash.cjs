'use strict';
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!user) { console.log('USER NOT FOUND'); return; }

  console.log('Username:', user.username);
  console.log('Hash:', user.passwordHash);
  console.log('Hash length:', user.passwordHash.length);
  console.log('isActive:', user.isActive);

  const ok = await bcryptjs.compare('Admin@123', user.passwordHash);
  console.log('bcryptjs.compare("Admin@123", hash) =', ok);

  // Test with fresh hash
  const freshHash = await bcryptjs.hash('Admin@123', 10);
  console.log('Fresh hash:', freshHash);
  const ok2 = await bcryptjs.compare('Admin@123', freshHash);
  console.log('Fresh hash compare =', ok2);

  // Fix all three users
  const users = [
    { username: 'admin',   password: 'Admin@123' },
    { username: 'kythuat', password: 'Tech@123' },
    { username: 'xem',     password: 'View@123' },
  ];

  for (const u of users) {
    const hash = await bcryptjs.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash, isActive: true },
      create: {
        username: u.username,
        fullName: u.username === 'admin' ? 'Quản trị viên' : u.username === 'kythuat' ? 'Kỹ thuật viên' : 'Chỉ xem',
        role: u.username === 'admin' ? 'ADMIN' : u.username === 'kythuat' ? 'TECH' : 'VIEW',
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log(`Updated ${u.username} with password ${u.password}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
