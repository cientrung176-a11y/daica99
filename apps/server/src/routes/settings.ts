import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { verifyAdminPin, changeAdminPin, checkPinRateLimit, recordPinFailure, resetPinAttempts } from '../lib/adminPin.js';
import { prisma } from '../prisma.js';

const router = Router();

// POST /api/settings/admin-pin/verify — Xác thực PIN (mọi user đã đăng nhập)
router.post('/admin-pin/verify', requireAuth, async (req: Request, res: Response) => {
  try {
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

    const ok = await verifyAdminPin(parsed.data.pin);
    if (!ok) {
      const failure = recordPinFailure(userId);
      try {
        await prisma.auditLog.create({
          data: { userId, action: 'PIN_FAILED', detail: 'Nhập sai PIN quản trị', ip: req.ip },
        });
      } catch { /* audit log failure is non-fatal */ }
      if (failure.locked) {
        return res.status(429).json({
          message: `PIN không đúng. Tài khoản bị khóa ${failure.remainingSec} giây.`,
          lockedUntil: Date.now() + failure.remainingSec! * 1000,
          remainingSec: failure.remainingSec,
        });
      }
      return res.status(401).json({ ok: false, message: `PIN không đúng. Còn ${failure.attemptsLeft} lần thử.` });
    }

    resetPinAttempts(userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PIN VERIFY ERROR]', err);
    return res.status(500).json({ message: 'Lỗi server khi xác thực PIN.' });
  }
});

// PUT /api/settings/admin-pin — Đổi PIN (ADMIN only)
router.put('/admin-pin', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      currentPin: z.string().min(1),
      newPin: z.string().min(4, 'PIN tối thiểu 4 ký tự.').max(20),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });

    const result = await changeAdminPin(parsed.data.currentPin, parsed.data.newPin);
    if (!result.ok) return res.status(401).json({ message: result.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PIN CHANGE ERROR]', err);
    return res.status(500).json({ message: 'Lỗi server khi đổi PIN.' });
  }
});

export default router;
