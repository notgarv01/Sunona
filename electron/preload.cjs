const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  sendPlaybackState: (state) => ipcRenderer.send('playback-state', state),
  onMediaKey: (callback) => {
    const handler = (_event, key) => callback(key);
    ipcRenderer.on('media-key', handler);
    return () => ipcRenderer.removeListener('media-key', handler);
  },
  onUpdateReady: (callback) => {
    const handler = (_event, version) => callback(version);
    ipcRenderer.on('update-ready', handler);
    return () => ipcRenderer.removeListener('update-ready', handler);
  },
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),
});

