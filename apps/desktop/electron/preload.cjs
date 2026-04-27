const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: process.env.APP_VERSION || '1.0.0',

  saveSettings:   (settings) => ipcRenderer.invoke('save-settings', settings),
  openExternal:   (url)      => ipcRenderer.invoke('open-external', url),
  getAutoStart:   ()         => ipcRenderer.invoke('get-auto-start'),
  setAutoStart:   (enable)   => ipcRenderer.invoke('set-auto-start', enable),

  // Auto-updater
  updaterCheck:    ()   => ipcRenderer.invoke('updater-check'),
  updaterDownload: ()   => ipcRenderer.invoke('updater-download'),
  updaterInstall:  ()   => ipcRenderer.invoke('updater-install'),
  onUpdater: (cb) => {
    ipcRenderer.on('updater', (_e, data) => cb(data));
  },
  offUpdater: () => ipcRenderer.removeAllListeners('updater'),
});
