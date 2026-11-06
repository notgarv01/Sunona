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
});

