import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { encryptText, decryptText } from '../lib/crypto.js';
import { verifyAdminPin, checkPinRateLimit, recordPinFailure, resetPinAttempts } from '../lib/adminPin.js';

const router = Router();

// Đánh dấu máy offline nếu không gửi heartbeat quá 90 giây
async function markOfflineStale() {
  const threshold = new Date(Date.now() - 90_000);
  await prisma.computer.updateMany({
    where: { isOnline: true, lastSeenAt: { lt: threshold } },
    data: { isOnline: false },
  });
}

// GET /api/computers — Lấy danh sách máy tính
router.get('/', requireAuth, async (req: Request, res: Response) => {
  await markOfflineStale();
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const where: any = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { currentUser: { contains: q, mode: 'insensitive' } },
          { ipInternal: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const raw = await prisma.computer.findMany({
    where,
    orderBy: [{ isOnline: 'desc' }, { name: 'asc' }],
  });

  const items = raw.map(({ rustdeskPassword, ...rest }) => ({
    ...rest,
    hasRustdesk: !!(rest.rustDeskId || rustdeskPassword),
  }));

  return res.json({ items });
});

const computerSchema = z.object({
  name: z.string().min(1),
  ipInternal: z.string().optional().nullable(),
  ipPublic: z.string().optional().nullable(),
  mac: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  currentUser: z.string().optional().nullable(),
  windows: z.string().optional().nullable(),
  cpu: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  disk: z.string().optional().nullable(),
  antivirus: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

// POST /api/computers — Thêm máy tính mới
router.post('/', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const parsed = computerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const item = await prisma.computer.create({ data: parsed.data });
  req.app.get('io')?.to('computers').emit('computers:changed', { type: 'created', id: item.id });
  return res.status(201).json({ item });
});

// PUT /api/computers/:id — Cập nhật máy tính
router.put('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const parsed = computerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const item = await prisma.computer.update({ where: { id: req.params.id }, data: parsed.data });
  req.app.get('io')?.to('computers').emit('computers:changed', { type: 'updated', id: item.id });
  return res.json({ item });
});

// DELETE /api/computers/:id — Xóa máy tính
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  await prisma.computer.delete({ where: { id: req.params.id } });
  req.app.get('io')?.to('computers').emit('computers:changed', { type: 'deleted', id: req.params.id });
  return res.json({ ok: true });
});

// POST /api/computers/:id/rustdesk/reveal — Xem thông tin RustDesk (ADMIN, cần PIN)
router.post('/:id/rustdesk/reveal', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const schema = z.object({ pin: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'PIN không được để trống.' });

  const userId = req.user!.id;
  const rateCheck = checkPinRateLimit(userId);
  if (rateCheck.locked) {
    return res.status(429).json({
      message: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${rateCheck.remainingSec} giây.`,
      lockedUntil: Date.now() + rateCheck.remainingSec! * 1000,
      remainingSec: rateCheck.remainingSec,
    });
  }

  const pinOk = await verifyAdminPin(parsed.data.pin);
  if (!pinOk) {
    const failure = recordPinFailure(userId);
    await prisma.auditLog.create({
      data: { userId, action: 'PIN_FAILED', detail: `Nhập sai PIN xem RustDesk máy ID: ${req.params.id}`, ip: req.ip },
    });
    if (failure.locked) {
      return res.status(429).json({
        message: `PIN không đúng. Tài khoản bị khóa ${failure.remainingSec} giây.`,
        lockedUntil: Date.now() + failure.remainingSec! * 1000,
        remainingSec: failure.remainingSec,
      });
    }
    return res.status(401).json({ message: `PIN không đúng. Còn ${failure.attemptsLeft} lần thử.` });
  }

  resetPinAttempts(userId);

  const computer = await prisma.computer.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, rustDeskId: true, rustdeskPassword: true },
  });
  if (!computer) return res.status(404).json({ message: 'Không tìm thấy máy.' });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'VIEW_RUSTDESK',
      detail: `Xem thông tin RustDesk của máy "${computer.name}"`,
      ip: req.ip,
    },
  });

  const rustdeskPassword = computer.rustdeskPassword
    ? (() => { try { return decryptText(computer.rustdeskPassword!); } catch { return null; } })()
    : null;

  return res.json({ ok: true, rustdeskId: computer.rustDeskId, rustdeskPassword });
});

// PUT /api/computers/:id/rustdesk — Lưu thông tin RustDesk (ADMIN only)
router.put('/:id/rustdesk', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const schema = z.object({
    rustdeskId: z.string().optional().nullable(),
    rustdeskPassword: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const updateData: any = {};
  if (parsed.data.rustdeskId !== undefined) {
    updateData.rustDeskId = parsed.data.rustdeskId || null;
  }
  if (parsed.data.rustdeskPassword) {
    updateData.rustdeskPassword = encryptText(parsed.data.rustdeskPassword);
  }

  await prisma.computer.update({ where: { id: req.params.id }, data: updateData });
  return res.json({ ok: true });
});

// POST /api/computers/heartbeat — Agent gửi heartbeat (không cần đăng nhập, dùng machineId)
router.post('/heartbeat', async (req: Request, res: Response) => {
  const schema = z.object({
    machineId: z.string().min(1),
    hostname: z.string().min(1),
    ipInternal: z.string().optional(),
    cpuPercent: z.number().min(0).max(100).optional(),
    ramPercent: z.number().min(0).max(100).optional(),
    appVersion: z.string().optional(),
    currentUser: z.string().optional(),
    cpuModel:  z.string().optional(),   // tên CPU (ví dụ: "Intel Core i7-12700H")
    totalRam:  z.string().optional(),   // tổng RAM (ví dụ: "16 GB")
    osVersion: z.string().optional(),   // phiên bản OS (ví dụ: "Windows 10 Pro")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu heartbeat không hợp lệ.' });

  const { machineId, hostname, ipInternal, cpuPercent, ramPercent,
          appVersion, currentUser, cpuModel, totalRam, osVersion } = parsed.data;

  const computer = await prisma.computer.upsert({
    where: { machineId },
    update: {
      name: hostname,
      ipInternal:  ipInternal  ?? undefined,
      cpuPercent:  cpuPercent  ?? undefined,
      ramPercent:  ramPercent  ?? undefined,
      appVersion:  appVersion  ?? undefined,
      currentUser: currentUser ?? undefined,
      cpu:         cpuModel    ?? undefined,
      ram:         totalRam    ?? undefined,
      windows:     osVersion   ?? undefined,
      isOnline: true,
      lastSeenAt: new Date(),
    },
    create: {
      machineId,
      name: hostname,
      ipInternal:  ipInternal  ?? undefined,
      cpuPercent:  cpuPercent  ?? undefined,
      ramPercent:  ramPercent  ?? undefined,
      appVersion:  appVersion  ?? undefined,
      currentUser: currentUser ?? undefined,
      cpu:         cpuModel    ?? undefined,
      ram:         totalRam    ?? undefined,
      windows:     osVersion   ?? undefined,
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });

  req.app.get('io')?.to('computers').emit('computers:changed', { type: 'heartbeat', id: computer.id });
  return res.json({ ok: true, id: computer.id });
});

export default router;
