import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, DeviceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const techPassword = await bcrypt.hash('Tech@123', 10);
  const viewPassword = await bcrypt.hash('View@123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Quản trị viên',
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
    },
  });

  await prisma.user.upsert({
    where: { username: 'kythuat' },
    update: {},
    create: {
      username: 'kythuat',
      fullName: 'Kỹ thuật viên',
      role: UserRole.TECH,
      passwordHash: techPassword,
    },
  });

  await prisma.user.upsert({
    where: { username: 'xem' },
    update: {},
    create: {
      username: 'xem',
      fullName: 'Chỉ xem',
      role: UserRole.VIEW,
      passwordHash: viewPassword,
    },
  });

  const devicesCount = await prisma.device.count();
  if (devicesCount === 0) {
    await prisma.device.createMany({
      data: [
        {
          name: 'Máy siêu âm',
          type: 'Chẩn đoán hình ảnh',
          brand: 'GE',
          model: 'LOGIQ',
          serial: 'GE-123456',
          department: 'Khám tổng quát',
          owner: 'Nguyễn Văn A',
          status: DeviceStatus.TOT,
          note: 'Thiết bị mẫu',
        },
        {
          name: 'Máy xét nghiệm',
          type: 'Xét nghiệm',
          brand: 'Roche',
          model: 'Cobas',
          serial: 'RC-999',
          department: 'Xét nghiệm',
          owner: 'Trần Thị B',
          status: DeviceStatus.CANH_BAO,
          note: 'Cần kiểm tra định kỳ',
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
