import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';

import { config } from './config.js';
import { prisma } from './prisma.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import computerRoutes from './routes/computers.js';
import techLogRoutes from './routes/techlogs.js';
import userRoutes from './routes/users.js';
import exportRoutes from './routes/export.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import { seedDefaultUsers } from './seed.js';

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  process.exit(1);
});

function isAllowedOrigin(origin: string | undefined): boolean {
  // undefined = server-to-server / curl; "null" = Electron file:// in production
  if (!origin || origin === 'null') return true;
  if (origin === config.clientOrigin) return true;
  // Cho phép mọi localhost / 127.0.0.1 ở bất kỳ port nào (dev environment)
  if (origin.startsWith('http://localhost:') || origin === 'http://localhost') return true;
  if (origin.startsWith('http://127.0.0.1:') || origin === 'http://127.0.0.1') return true;
  return false;
}

async function main() {
  console.log('Server starting...');

  // Kết nối database trước khi khởi động server
  try {
    await prisma.$connect();
    console.log('Database connected...');
  } catch (err) {
    console.error('[DB CONNECTION FAILED]', err);
    process.exit(1);
  }

  // Seed default users nếu database chưa có user nào
  try {
    await seedDefaultUsers();
  } catch (err) {
    console.error('[SEED FAILED]', err);
    process.exit(1);
  }

  const app = express();
  app.set('appName', config.appName);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, name: config.appName });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/computers', computerRoutes);
  app.use('/api/techlogs', techLogRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/settings', settingsRoutes);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    },
  });

  app.set('io', io);

  io.on('connection', (socket) => {
    socket.on('join', (room: string) => {
      socket.join(room);
    });
  });

  const PORT = Number(process.env.PORT) || 4000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
    console.log(`${config.appName} is ready at http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[STARTUP ERROR]', err);
  process.exit(1);
});
