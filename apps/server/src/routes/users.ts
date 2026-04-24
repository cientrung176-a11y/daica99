import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { hashPassword, verifyPassword } from '../auth/password.js';

const router = Router();

// GET /api/users — Danh sách người dùng (Admin)
router.get('/', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ users });
});

// POST /api/users — Tạo tài khoản mới (Admin)
router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const schema = z.object({
    username: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự.').max(32).regex(/^[a-z0-9_]+$/, 'Chỉ dùng chữ thường, số và dấu gạch dưới.'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự.'),
    fullName: z.string().min(1, 'Vui lòng nhập họ tên.'),
    role: z.enum(['ADMIN', 'TECH', 'VIEW']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ.' });
  }

  const { username, password, fullName, role } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash, fullName, role },
    select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
  });

  return res.status(201).json({ user });
});

// PUT /api/users/:id — Cập nhật thông tin người dùng (Admin)
router.put('/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(1).optional(),
    role: z.enum(['ADMIN', 'TECH', 'VIEW']).optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
  });

  return res.json({ user });
});

// PUT /api/users/:id/password — Đổi mật khẩu (Admin đổi của ai cũng được, user tự đổi của mình)
router.put('/:id/password', requireAuth, async (req, res) => {
  const isAdmin = req.user!.role === 'ADMIN';
  const isSelf = req.user!.id === req.params.id;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ message: 'Bạn không có quyền đổi mật khẩu người khác.' });
  }

  const schema = isAdmin
    ? z.object({ newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự.') })
    : z.object({
        currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
        newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự.'),
      });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại.' });

  if (!isAdmin) {
    const ok = await verifyPassword((parsed.data as any).currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng.' });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });

  return res.json({ ok: true });
});

// DELETE /api/users/:id — Vô hiệu hóa tài khoản (Admin)
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  if (req.user!.id === req.params.id) {
    return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình.' });
  }
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  return res.json({ ok: true });
});

export default router;
