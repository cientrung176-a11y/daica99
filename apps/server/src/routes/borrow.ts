import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

// GET /api/borrow/:deviceId — lịch sử mượn của thiết bị
router.get('/:deviceId', requireAuth, async (req: Request, res: Response) => {
  const items = await (prisma as any).borrowLog.findMany({
    where: { deviceId: req.params.deviceId },
    orderBy: { borrowedAt: 'desc' },
    take: 50,
  });
  return res.json({ items });
});

// POST /api/borrow — ghi nhận mượn
router.post('/', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const schema = z.object({
    deviceId:     z.string().min(1),
    borrowerName: z.string().min(1),
    borrowedAt:   z.string().optional(),
    note:         z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const item = await (prisma as any).borrowLog.create({
    data: {
      deviceId:     parsed.data.deviceId,
      borrowerName: parsed.data.borrowerName,
      borrowedAt:   parsed.data.borrowedAt ? new Date(parsed.data.borrowedAt) : undefined,
      note:         parsed.data.note ?? undefined,
    },
  });
  return res.status(201).json({ item });
});

// PATCH /api/borrow/:id/return — đánh dấu đã trả
router.patch('/:id/return', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const item = await (prisma as any).borrowLog.update({
    where: { id: req.params.id },
    data: { isReturned: true, returnedAt: new Date() },
  });
  return res.json({ item });
});

// DELETE /api/borrow/:id
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  await (prisma as any).borrowLog.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

export default router;
