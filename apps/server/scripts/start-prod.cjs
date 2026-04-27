'use strict';
/**
 * Production startup script for Render.
 * Runs migrations, seed, then starts the server with clear logging.
 */
const { execSync } = require('child_process');
const path = require('path');

function run(cmd, label) {
  console.log(`[STARTUP] ${label}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log(`[STARTUP] ${label} OK`);
    return true;
  } catch (e) {
    console.error(`[STARTUP] ${label} FAILED:`, e.message);
    return false;
  }
}

async function main() {
  console.log('[STARTUP] ==========================================');
  console.log('[STARTUP] Starting production server...');
  console.log('[STARTUP] Node version:', process.version);
  console.log('[STARTUP] CWD:', process.cwd());

  // Check required env vars
  const required = ['DATABASE_URL', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[STARTUP] MISSING ENV VAR: ${key}`);
      process.exit(1);
    }
  }
  console.log('[STARTUP] Required env vars present');

  // 1. Generate Prisma client (runtime safety)
  if (!run('npx prisma generate', 'Prisma generate')) {
    process.exit(1);
  }

  // 2a. Resolve any previously-failed migration so deploy can proceed
  run(
    'npx prisma migrate resolve --rolled-back 20260427220000_reset_admin_pin',
    'Resolve rolled-back migration (safe to ignore if not applicable)'
  );

  // 2b. Prisma migrate deploy
  if (!run('npx prisma migrate deploy', 'Prisma migrate deploy')) {
    process.exit(1);
  }

  // 3. Seed
  if (!run('node scripts/seed.cjs', 'Seed default users')) {
    process.exit(1);
  }

  // 4. Start server directly (not via npm start, to avoid npm error wrapping)
  console.log('[STARTUP] Starting server...');
  const serverPath = path.resolve(__dirname, '..', 'dist', 'index.js');
  console.log('[STARTUP] Server entry:', serverPath);

  // Spawn server as child so we can see its output directly
  const { spawn } = require('child_process');
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  server.on('exit', (code) => {
    console.log(`[STARTUP] Server exited with code ${code}`);
    process.exit(code ?? 1);
  });

  server.on('error', (err) => {
    console.error('[STARTUP] Server spawn error:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[STARTUP] Unhandled error:', err);
  process.exit(1);
});
