import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

const schema = z.object({
  title:       z.string().min(1),
  computerId:  z.string().optional().nullable(),
  deviceId:    z.string().optional().nullable(),
  scheduledAt: z.string().min(1),
  repeatDays:  z.number().int().positive().optional().nullable(),
  note:        z.string().optional().nullable(),
  isDone:      z.boolean().optional(),
});

// GET /api/maintenance
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  const items = await prisma.maintenanceSchedule.findMany({
    orderBy: [{ isDone: 'asc' }, { scheduledAt: 'asc' }],
    include: {
      computer: { select: { id: true, name: true } },
      device:   { select: { id: true, name: true } },
    },
  });
  return res.json({ items });
});

// POST /api/maintenance
router.post('/', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const item = await prisma.maintenanceSchedule.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
    include: {
      computer: { select: { id: true, name: true } },
      device:   { select: { id: true, name: true } },
    },
  });
  return res.status(201).json({ item });
});

// PUT /api/maintenance/:id
router.put('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const item = await prisma.maintenanceSchedule.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
    include: {
      computer: { select: { id: true, name: true } },
      device:   { select: { id: true, name: true } },
    },
  });
  return res.json({ item });
});

// PATCH /api/maintenance/:id/done — toggle isDone
router.patch('/:id/done', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const current = await prisma.maintenanceSchedule.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ message: 'Không tìm thấy.' });

  const item = await prisma.maintenanceSchedule.update({
    where: { id: req.params.id },
    data: { isDone: !current.isDone },
  });
  return res.json({ item });
});

// DELETE /api/maintenance/:id
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  await prisma.maintenanceSchedule.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

export default router;
