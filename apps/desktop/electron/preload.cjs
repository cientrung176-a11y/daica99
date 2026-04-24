const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: require('../package.json').version,

  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openExternal: (url)      => ipcRenderer.invoke('open-external', url),

  // Auto-updater
  updaterCheck:    ()   => ipcRenderer.invoke('updater-check'),
  updaterDownload: ()   => ipcRenderer.invoke('updater-download'),
  updaterInstall:  ()   => ipcRenderer.invoke('updater-install'),
  onUpdater: (cb) => {
    ipcRenderer.on('updater', (_e, data) => cb(data));
  },
  offUpdater: () => ipcRenderer.removeAllListeners('updater'),
});
