import { Router } from 'express';

import { prisma } from '../prisma.js';
import { requireAuth } from '../auth/middleware.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  // Đánh dấu máy offline nếu quá 90 giây không gửi heartbeat
  const threshold = new Date(Date.now() - 90_000);
  await prisma.computer.updateMany({
    where: { isOnline: true, lastSeenAt: { lt: threshold } },
    data: { isOnline: false },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalDevices,
    totalComputers,
    onlineComputers,
    devicesError,
    devicesWarning,
    techLogThisMonth,
    techLogPending,
  ] = await Promise.all([
    prisma.device.count(),
    prisma.computer.count(),
    prisma.computer.count({ where: { isOnline: true } }),
    prisma.device.count({ where: { status: 'LOI' } }),
    prisma.device.count({ where: { status: 'CANH_BAO' } }),
    prisma.techLog.count({ where: { happenedAt: { gte: startOfMonth } } }),
    prisma.techLog.count({ where: { status: { in: ['DANG_XU_LY', 'CHO_XU_LY'] } } }),
  ]);

  const byDepartment = await prisma.device.groupBy({
    by: ['department'],
    _count: { _all: true },
    orderBy: { department: 'asc' },
  });

  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { happenedAt: 'desc' },
    take: 15,
    select: { id: true, happenedAt: true, action: true, detail: true, userId: true },
  });

  const recentTechLogs = await prisma.techLog.findMany({
    orderBy: { happenedAt: 'desc' },
    take: 5,
    include: {
      user: { select: { fullName: true, username: true } },
      computer: { select: { name: true } },
    },
  });

  return res.json({
    totalDevices,
    totalComputers,
    onlineComputers,
    offlineComputers: Math.max(0, totalComputers - onlineComputers),
    devicesError,
    devicesWarning,
    techLogThisMonth,
    techLogPending,
    byDepartment: byDepartment.map((x) => ({
      department: x.department ?? 'Chưa phân loại',
      count: x._count._all,
    })),
    recentAudit,
    recentTechLogs,
    appName: req.app.get('appName'),
  });
});

export default router;
