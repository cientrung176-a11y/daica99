import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import crypto from 'crypto';
import type { Request, Response } from 'express';

import { prisma } from '../prisma.js';
import { verifyPassword } from '../auth/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/tokens.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn đăng nhập quá nhiều lần. Vui lòng thử lại sau.' },
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    remember: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu đăng nhập không hợp lệ.' });

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.log(`[AUTH] Login failed: user "${username}" not found`);
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  }
  if (!user.isActive) {
    console.log(`[AUTH] Login failed: user "${username}" inactive`);
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    console.log(`[AUTH] Login failed: user "${username}" password mismatch (hash length=${user.passwordHash.length})`);
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  }
  console.log(`[AUTH] Login success: ${username} (${user.role})`);

  const payload = { sub: user.id, username: user.username, fullName: user.fullName, role: user.role } as const;

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'AUTH_LOGIN',
      detail: `Đăng nhập: ${user.username}`,
      ip: req.ip,
    },
  });

  return res.json({
    user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    accessToken,
    refreshToken,
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const schema = z.object({ refreshToken: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const { refreshToken } = parsed.data;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn.' });
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const record = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.sub,
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return res.status(401).json({ message: 'Refresh token đã bị thu hồi.' });

  const accessToken = signAccessToken(payload);
  return res.json({ accessToken });
});

router.post('/logout', async (req: Request, res: Response) => {
  const schema = z.object({ refreshToken: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });

  const { refreshToken } = parsed.data;

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.updateMany({
      where: { userId: payload.sub, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.sub,
        action: 'AUTH_LOGOUT',
        detail: `Đăng xuất: ${payload.username}`,
        ip: req.ip,
      },
    });
  } catch {
    // ignore
  }

  return res.json({ ok: true });
});

export default router;
