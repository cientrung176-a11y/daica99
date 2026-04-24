import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';

const PIN_KEY = 'rustdesk_admin_pin';
const DEFAULT_PIN = '123456';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 phút

interface AttemptEntry { count: number; lockedUntil: number; }
const pinAttempts = new Map<string, AttemptEntry>();

export function checkPinRateLimit(userId: string): { locked: boolean; remainingSec?: number } {
  const entry = pinAttempts.get(userId);
  if (!entry || entry.lockedUntil <= Date.now()) return { locked: false };
  return { locked: true, remainingSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
}

export function recordPinFailure(userId: string): { locked: boolean; remainingSec?: number; attemptsLeft?: number } {
  const entry = pinAttempts.get(userId) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
    pinAttempts.set(userId, entry);
    return { locked: true, remainingSec: Math.ceil(LOCKOUT_MS / 1000) };
  }
  pinAttempts.set(userId, entry);
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - entry.count };
}

export function resetPinAttempts(userId: string): void {
  pinAttempts.delete(userId);
}

export async function getOrCreatePinHash(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: PIN_KEY } });
  if (row) return row.value;
  const hash = await bcrypt.hash(DEFAULT_PIN, 10);
  await prisma.setting.upsert({
    where: { key: PIN_KEY },
    update: { value: hash },
    create: { key: PIN_KEY, value: hash },
  });
  return hash;
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const hash = await getOrCreatePinHash();
  return bcrypt.compare(pin, hash);
}

export async function changeAdminPin(currentPin: string, newPin: string): Promise<{ ok: boolean; message?: string }> {
  const hash = await getOrCreatePinHash();
  const ok = await bcrypt.compare(currentPin, hash);
  if (!ok) return { ok: false, message: 'PIN hiện tại không đúng.' };
  const newHash = await bcrypt.hash(newPin, 10);
  await prisma.setting.upsert({
    where: { key: PIN_KEY },
    update: { value: newHash },
    create: { key: PIN_KEY, value: newHash },
  });
  return { ok: true };
}
