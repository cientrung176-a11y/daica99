import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

// GET /api/techlogs
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const q          = typeof req.query.q          === 'string' ? req.query.q          : '';
  const status     = typeof req.query.status     === 'string' ? req.query.status     : undefined;
  const deviceType = typeof req.query.deviceType === 'string' ? req.query.deviceType : undefined;
  const dateFrom   = typeof req.query.dateFrom   === 'string' ? req.query.dateFrom   : undefined;
  const dateTo     = typeof req.query.dateTo     === 'string' ? req.query.dateTo     : undefined;

  const where: any = {};
  if (q) {
    where.OR = [
      { issue:          { contains: q, mode: 'insensitive' } },
      { resolution:     { contains: q, mode: 'insensitive' } },
      { technicianName: { contains: q, mode: 'insensitive' } },
      { deviceName:     { contains: q, mode: 'insensitive' } },
      { location:       { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status)     where.status     = status;
  if (deviceType) where.deviceType = deviceType;
  if (dateFrom || dateTo) {
    where.happenedAt = {};
    if (dateFrom) where.happenedAt.gte = new Date(dateFrom);
    if (dateTo)  { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); where.happenedAt.lte = d; }
  }

  const items = await prisma.techLog.findMany({
    where,
    orderBy: { happenedAt: 'desc' },
    include: {
      user:     { select: { username: true, fullName: true } },
      computer: { select: { id: true, name: true } },
    },
    take: 200,
  });

  return res.json({ items });
});

const techLogSchema = z.object({
  happenedAt:     z.string().optional(),
  computerId:     z.string().optional().nullable(),
  deviceId:       z.string().optional().nullable(),
  deviceType:     z.string().optional().nullable(),
  deviceName:     z.string().optional().nullable(),
  location:       z.string().optional().nullable(),
  priority:       z.enum(['THAP', 'TRUNG_BINH', 'CAO', 'KHAN_CAP']).optional().nullable(),
  issue:          z.string().min(1, 'Vui lòng mô tả lỗi.'),
  cause:          z.string().optional().nullable(),
  resolution:     z.string().min(1, 'Vui lòng mô tả cách xử lý.'),
  durationMin:    z.number().int().positive().optional().nullable(),
  cost:           z.number().min(0).optional().nullable(),
  status:         z.enum(['HOAN_THANH', 'DANG_XU_LY', 'CHO_XU_LY']).optional(),
  technicianName: z.string().optional().nullable(),
  imageUrl:       z.string().optional().nullable(),
});

// POST /api/techlogs
router.post('/', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const parsed = techLogSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.';
    return res.status(400).json({ message: msg });
  }

  const d = parsed.data;
  const item = await prisma.techLog.create({
    data: {
      userId:         req.user!.id,
      computerId:     d.computerId  ?? undefined,
      deviceId:       d.deviceId    ?? undefined,
      deviceType:     d.deviceType  ?? undefined,
      deviceName:     d.deviceName  ?? undefined,
      location:       d.location    ?? undefined,
      priority:       d.priority    ?? 'TRUNG_BINH',
      happenedAt:     d.happenedAt  ? new Date(d.happenedAt) : undefined,
      issue:          d.issue,
      cause:          d.cause        ?? undefined,
      resolution:     d.resolution,
      durationMin:    d.durationMin  ?? undefined,
      cost:           d.cost         ?? undefined,
      status:         d.status       ?? 'HOAN_THANH',
      technicianName: d.technicianName || req.user!.username,
      imageUrl:       d.imageUrl       ?? undefined,
    },
    include: {
      user: { select: { username: true, fullName: true } },
      computer: { select: { id: true, name: true } },
    },
  });

  req.app.get('io')?.to('techlogs').emit('techlogs:changed', { type: 'created', id: item.id });
  return res.status(201).json({ item });
});

// PUT /api/techlogs/:id
router.put('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const parsed = techLogSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.';
    return res.status(400).json({ message: msg });
  }

  const d = parsed.data;
  const item = await prisma.techLog.update({
    where: { id: req.params.id },
    data: {
      computerId:     d.computerId  ?? undefined,
      deviceId:       d.deviceId    ?? undefined,
      deviceType:     d.deviceType  ?? undefined,
      deviceName:     d.deviceName  ?? undefined,
      location:       d.location    ?? undefined,
      priority:       d.priority    ?? undefined,
      happenedAt:     d.happenedAt  ? new Date(d.happenedAt) : undefined,
      issue:          d.issue,
      cause:          d.cause        ?? undefined,
      resolution:     d.resolution,
      durationMin:    d.durationMin  ?? undefined,
      cost:           d.cost         ?? undefined,
      status:         d.status       ?? 'HOAN_THANH',
      technicianName: d.technicianName ?? undefined,
      imageUrl:       d.imageUrl       ?? undefined,
    },
    include: {
      user: { select: { username: true, fullName: true } },
      computer: { select: { id: true, name: true } },
    },
  });

  req.app.get('io')?.to('techlogs').emit('techlogs:changed', { type: 'updated', id: item.id });
  return res.json({ item });
});

// DELETE /api/techlogs/:id
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  await prisma.techLog.delete({ where: { id: req.params.id } });
  req.app.get('io')?.to('techlogs').emit('techlogs:changed', { type: 'deleted', id: req.params.id });
  return res.json({ ok: true });
});

export default router;
