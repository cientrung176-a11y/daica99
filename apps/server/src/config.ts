import dotenv from 'dotenv';

dotenv.config();

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  appName: process.env.APP_NAME ?? 'ĐẠI CA 99 BẮC NINH',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  databaseUrl: mustGet('DATABASE_URL'),

  accessTokenSecret: mustGet('ACCESS_TOKEN_SECRET'),
  refreshTokenSecret: mustGet('REFRESH_TOKEN_SECRET'),
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 28800),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 1209600),

  encryptionKey: process.env.ENCRYPTION_KEY ?? 'DefaultKey_ChangeMe_32BytesLong!!',
} as const;
