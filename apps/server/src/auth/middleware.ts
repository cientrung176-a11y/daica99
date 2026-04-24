import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from './tokens.js';

export type AuthedUser = {
  id: string;
  username: string;
  role: 'ADMIN' | 'TECH' | 'VIEW';
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập để tiếp tục.' });
  }

  const token = auth.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

export function requireRole(roles: Array<AuthedUser['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Bạn cần đăng nhập để tiếp tục.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
    next();
  };
}
