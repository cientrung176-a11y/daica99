import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type AccessTokenPayload = {
  sub: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'TECH' | 'VIEW';
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.accessTokenSecret, { expiresIn: config.accessTokenTtlSeconds });
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.refreshTokenSecret, { expiresIn: config.refreshTokenTtlSeconds });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.accessTokenSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.refreshTokenSecret) as AccessTokenPayload;
}
