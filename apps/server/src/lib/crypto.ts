import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

function getKey(): Buffer {
  const secret = process.env.ACCESS_TOKEN_SECRET ?? 'dev-fallback-secret-must-32chars!';
  return createHash('sha256').update(secret).digest();
}

export function encryptText(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptText(stored: string): string {
  const sep = stored.indexOf(':');
  if (sep === -1) throw new Error('Định dạng dữ liệu mã hóa không hợp lệ.');
  const iv = Buffer.from(stored.slice(0, sep), 'hex');
  const encrypted = Buffer.from(stored.slice(sep + 1), 'hex');
  const key = getKey();
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
