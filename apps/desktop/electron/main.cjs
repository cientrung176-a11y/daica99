const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const isDev = process.env.ELECTRON_DEV === '1';
const APP_VERSION = require('../package.json').version;

let mainWindow = null;

// ─── Machine ID ──────────────────────────────────────────────────────────────
function getMachineId() {
  const idFile = path.join(app.getPath('userData'), 'machine-id.txt');
  try {
    if (fs.existsSync(idFile)) return fs.readFileSync(idFile, 'utf8').trim();
  } catch { /* ignore */ }
  const id = crypto.randomUUID();
  try { fs.writeFileSync(idFile, id, 'utf8'); } catch { /* ignore */ }
  return id;
}

// ─── Network helpers ─────────────────────────────────────────────────────────
function getInternalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

// ─── CPU usage (sampled over 500 ms) ─────────────────────────────────────────
function getCpuSample() {
  return os.cpus().map(c => ({ ...c.times }));
}

function calcCpuPercent(s1, s2) {
  let idle = 0, total = 0;
  for (let i = 0; i < s1.length; i++) {
    const d = {};
    for (const k of Object.keys(s1[i])) d[k] = s2[i][k] - s1[i][k];
    idle += d.idle;
    total += Object.values(d).reduce((a, b) => a + b, 0);
  }
  return total === 0 ? 0 : Math.round(((total - idle) / total) * 100);
}

// ─── RAM usage ───────────────────────────────────────────────────────────────
function getRamPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100);
}

// ─── Static hardware info (chỉ đọc 1 lần khi khởi động) ─────────────────────
function getHardwareInfo() {
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0
    ? cpus[0].model.replace(/\s+/g, ' ').trim()
    : 'Unknown CPU';

  const totalBytes = os.totalmem();
  const totalGB = Math.round(totalBytes / (1024 ** 3));
  const ramStr = `${totalGB} GB`;

  // os.version() trả về "Windows 10 Pro" trên Windows (Node >= 13.11)
  const osVersion = typeof os.version === 'function'
    ? os.version()
    : `${os.type()} ${os.release()}`;

  return { cpuModel, ramStr, osVersion };
}

const HARDWARE = getHardwareInfo();

// ─── Get server URL from userData settings ───────────────────────────────────
function getServerUrl() {
  const settingsFile = path.join(app.getPath('userData'), 'settings.json');
  try {
    const raw = fs.readFileSync(settingsFile, 'utf8');
    const s = JSON.parse(raw);
    if (s && s.serverUrl) return s.serverUrl.replace(/\/$/, '');
  } catch { /* ignore */ }
  return 'http://localhost:4000';
}

// ─── Heartbeat sender ────────────────────────────────────────────────────────
let heartbeatTimer = null;

async function sendHeartbeat(machineId) {
  const s1 = getCpuSample();
  await new Promise(r => setTimeout(r, 500));
  const s2 = getCpuSample();

  const payload = JSON.stringify({
    machineId,
    hostname: os.hostname(),
    ipInternal: getInternalIP(),
    cpuPercent: calcCpuPercent(s1, s2),
    ramPercent: getRamPercent(),
    appVersion: APP_VERSION,
    currentUser: os.userInfo().username,
    cpuModel:   HARDWARE.cpuModel,
    totalRam:   HARDWARE.ramStr,
    osVersion:  HARDWARE.osVersion,
  });

  const serverUrl = getServerUrl();
  const url = new URL('/api/computers/heartbeat', serverUrl);

  try {
    const { request } = url.protocol === 'https:' ? require('https') : require('http');
    await new Promise((resolve, reject) => {
      const req = request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
      req.write(payload);
      req.end();
    });
  } catch {
    // Bỏ qua lỗi — sẽ thử lại sau 30 giây
  }
}

function startHeartbeat() {
  const machineId = getMachineId();
  sendHeartbeat(machineId);
  heartbeatTimer = setInterval(() => sendHeartbeat(machineId), 30_000);
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

// ─── Auto Updater ────────────────────────────────────────────────────────────
function setupUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    const send = (data) => mainWindow?.webContents?.send('updater', data);

    autoUpdater.on('checking-for-update',  ()     => send({ type: 'checking' }));
    autoUpdater.on('update-not-available', ()     => send({ type: 'not-available' }));
    autoUpdater.on('error',                (err)  => send({ type: 'error', message: err.message }));
    autoUpdater.on('update-available',     (info) => send({ type: 'available', version: info.version }));
    autoUpdater.on('download-progress',    (p)    => send({ type: 'progress', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded',    ()     => send({ type: 'downloaded' }));

    ipcMain.handle('updater-check',    () => autoUpdater.checkForUpdates());
    ipcMain.handle('updater-download', () => autoUpdater.downloadUpdate());
    ipcMain.handle('updater-install',  () => autoUpdater.quitAndInstall(false, true));

    // Kiểm tra sau 4 giây kể từ khi app sẵn sàng
    setTimeout(() => autoUpdater.checkForUpdates(), 4000);
  } catch (e) {
    console.error('electron-updater không khả dụng:', e.message);
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ĐẠI CA 99 BẮC NINH',
    icon: require('fs').existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Mở / đóng DevTools thủ công — F12 hoặc Ctrl+Shift+I
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    const toggleKeys =
      input.key === 'F12' ||
      (input.key === 'I' && input.control && input.shift);
    if (toggleKeys) win.webContents.toggleDevTools();
  });

  win.on('page-title-updated', (event) => { event.preventDefault(); });

  mainWindow = win;
}

app.whenReady().then(() => {
  // IPC: renderer gửi cài đặt xuống để ghi settings.json
  ipcMain.handle('save-settings', (_event, settings) => {
    try {
      const settingsFile = path.join(app.getPath('userData'), 'settings.json');
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
    } catch { /* ignore */ }
  });

  ipcMain.handle('open-external', (_event, url) => {
    shell.openExternal(url);
  });

  createWindow();
  setupUpdater();
  startHeartbeat();
});

app.on('window-all-closed', () => {
  stopHeartbeat();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
