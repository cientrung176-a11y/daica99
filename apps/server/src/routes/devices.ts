import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const q          = typeof req.query.q         === 'string' ? req.query.q         : '';
  const status     = typeof req.query.status    === 'string' ? req.query.status    : undefined;
  const borrowing  = req.query.borrowing === 'true';

  const where: any = {};
  if (q) {
    where.OR = [
      { name:       { contains: q, mode: 'insensitive' } },
      { type:       { contains: q, mode: 'insensitive' } },
      { brand:      { contains: q, mode: 'insensitive' } },
      { model:      { contains: q, mode: 'insensitive' } },
      { serial:     { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
      { owner:      { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (borrowing) where.borrowLogs = { some: { isReturned: false } };

  const items = await (prisma as any).device.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      borrowLogs: {
        where: { isReturned: false },
        orderBy: { borrowedAt: 'desc' },
        take: 1,
      },
    },
  });

  return res.json({ items });
});

router.post('/', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    serial: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    owner: z.string().optional().nullable(),
    purchaseDate: z.string().optional().nullable(),
    warrantyUntil: z.string().optional().nullable(),
    status: z.enum(['TOT', 'LOI', 'CANH_BAO', 'BAO_TRI']).optional(),
    note: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const d = parsed.data;

  const created = await prisma.device.create({
    data: {
      name: d.name,
      type: d.type,
      brand: d.brand ?? undefined,
      model: d.model ?? undefined,
      serial: d.serial ?? undefined,
      department: d.department ?? undefined,
      owner: d.owner ?? undefined,
      purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : undefined,
      warrantyUntil: d.warrantyUntil ? new Date(d.warrantyUntil) : undefined,
      status: (d.status as any) ?? 'TOT',
      note: d.note ?? undefined,
      imageUrl: d.imageUrl ?? undefined,
    },
  });

  req.app.get('io')?.to('devices').emit('devices:changed', { type: 'created', id: created.id });

  return res.status(201).json({ item: created });
});

router.put('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    serial: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    owner: z.string().optional().nullable(),
    purchaseDate: z.string().optional().nullable(),
    warrantyUntil: z.string().optional().nullable(),
    status: z.enum(['TOT', 'LOI', 'CANH_BAO', 'BAO_TRI']).optional(),
    note: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const d = parsed.data;

  const updated = await prisma.device.update({
    where: { id: req.params.id },
    data: {
      name: d.name,
      type: d.type,
      brand: d.brand ?? undefined,
      model: d.model ?? undefined,
      serial: d.serial ?? undefined,
      department: d.department ?? undefined,
      owner: d.owner ?? undefined,
      purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : undefined,
      warrantyUntil: d.warrantyUntil ? new Date(d.warrantyUntil) : undefined,
      status: (d.status as any) ?? undefined,
      note: d.note ?? undefined,
      imageUrl: d.imageUrl ?? undefined,
    },
  });

  req.app.get('io')?.to('devices').emit('devices:changed', { type: 'updated', id: updated.id });

  return res.json({ item: updated });
});

router.delete('/:id', requireAuth, requireRole(['ADMIN', 'TECH']), async (req: Request, res: Response) => {
  await prisma.device.delete({ where: { id: req.params.id } });
  req.app.get('io')?.to('devices').emit('devices:changed', { type: 'deleted', id: req.params.id });
  return res.json({ ok: true });
});

export default router;
