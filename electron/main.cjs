const { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { startServer } = require('./server.cjs');

// Auto-updater configuration: silent background download & install on exit
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking GitHub for updates...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] App is up to date.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-progress', progressObj);
  }
});

autoUpdater.on('error', (err) => {
  console.warn('[AutoUpdater] Warning:', err ? err.message : 'Unknown error');
  if (process.platform === 'darwin') {
    checkMacUpdates();
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', err ? err.message : 'Update check failed');
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-ready', info.version);
  }
});

function compareVersions(v1, v2) {
  const p1 = (v1 || '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

async function checkMacUpdates() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-checking');
  }
  try {
    const res = await fetch('https://api.github.com/repos/notgarv01/Sunona/releases/latest', {
      headers: { 'User-Agent': 'SunoNa-Desktop' }
    });
    if (!res.ok) throw new Error(`GitHub check returned status ${res.status}`);
    const data = await res.json();
    
    const latestTag = data.tag_name || '';
    const cleanLatest = latestTag.replace(/^v/, '').replace(/-.*$/, '').trim();
    const currentVer = app.getVersion().trim();

    const isNewer = compareVersions(cleanLatest, currentVer) > 0;
    
    if (isNewer) {
      const dmgAsset = (data.assets || []).find(a => a.name && a.name.endsWith('.dmg')) || {};
      const downloadUrl = dmgAsset.browser_download_url || 'https://github.com/notgarv01/Sunona/releases/latest';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', {
          version: cleanLatest,
          downloadUrl,
          releaseNotes: data.body || 'New SunoNa desktop update available.'
        });
      }
    } else {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available', { version: currentVer });
      }
    }
  } catch (err) {
    console.warn('[AutoUpdater-Mac] Check error:', err ? err.message : err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', 'Unable to check for updates. Please try again later.');
    }
  }
}

// Manual update trigger from UI
ipcMain.on('check-for-updates', () => {
  if (process.platform === 'darwin') {
    checkMacUpdates();
  } else {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', err ? err.message : 'Update check failed');
      }
    });
  }
});

// Prevent multiple instances of SunoNa running simultaneously
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let apiServer = null;

// Remove default application menu (removes File, Edit, View, etc.)
Menu.setApplicationMenu(null);

async function createWindow() {
  const iconPath = path.join(__dirname, '../public/sunona.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#09090b',
    title: 'SunoNa',
    icon: iconPath,
    // Modern Spotify-style Frameless Header
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#e4e4e7',
      height: 40,
    },
    autoHideMenuBar: true,
    show: false, // Don't show until ready to prevent white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
  });

  // Ready to show cleanly without flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external link clicks and allow Google Auth popup strictly
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    let parsedUrl = null;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { action: 'deny' };
    }

    // Strictly validate Google Account & Firebase Auth popup hostnames
    const hostname = parsedUrl.hostname.toLowerCase();
    const isGoogleAuth =
      (hostname === 'accounts.google.com' ||
        hostname.endsWith('.firebaseapp.com') ||
        hostname === 'studybychat.firebaseapp.com') &&
      parsedUrl.protocol === 'https:';

    if (isGoogleAuth) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 640,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    // Strictly whitelist safe web protocols for external opening
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      const { shell } = require('electron');
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent top-level window navigation away from trusted local app origin
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isDevOrigin = parsed.origin === 'http://127.0.0.1:5173' || parsed.origin === 'http://localhost:5173';
      const isProdOrigin = apiServer && parsed.origin === `http://127.0.0.1:${apiServer.port}`;
      if (!isDevOrigin && !isProdOrigin) {
        event.preventDefault();
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          const { shell } = require('electron');
          shell.openExternal(navigationUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  // Enable F12 and Ctrl+Shift+I for developer tools toggle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log('Running in Development mode -> Loading Vite dev server at http://127.0.0.1:5173');
    await mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    // Production: Start embedded Node HTTP server serving dist/ and /api/...
    const staticDir = path.join(__dirname, '../dist');
    try {
      apiServer = await startServer({ staticDir, preferredPort: 34567 });
      await mainWindow.loadURL(`http://127.0.0.1:${apiServer.port}`);
    } catch (err) {
      console.error('Failed to start internal SunoNa server:', err);
      // Fallback: try loading file directly if server failed
      mainWindow.loadFile(path.join(staticDir, 'index.html'));
    }
  }

  // Register Global Laptop Media Keys (Play/Pause, Next Track, Prev Track)
  try {
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-key', 'play-pause');
      }
    });

    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-key', 'next');
      }
    });

    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-key', 'prev');
      }
    });
  } catch (err) {
    console.warn('Could not register media shortcuts:', err.message);
  }

  // Check for auto-updates from GitHub in production mode
  if (!isDev) {
    setTimeout(() => {
      if (process.platform === 'darwin') {
        checkMacUpdates();
      } else {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.warn('[AutoUpdater] Initial check error:', err ? err.message : err);
        });
      }
    }, 4000); // 4-second delay after startup for instant smooth boot
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

// Windows Taskbar Thumbnail Toolbar Buttons (SMTC media buttons on hover)
function updateThumbarButtons(isPlaying) {
  if (process.platform !== 'win32' || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    const assetsDir = path.join(__dirname, 'assets');
    const iconAdd = nativeImage.createFromPath(path.join(assetsDir, 'thumb-add.png'));
    const iconPrev = nativeImage.createFromPath(path.join(assetsDir, 'thumb-prev.png'));
    const iconPlay = nativeImage.createFromPath(path.join(assetsDir, 'thumb-play.png'));
    const iconPause = nativeImage.createFromPath(path.join(assetsDir, 'thumb-pause.png'));
    const iconNext = nativeImage.createFromPath(path.join(assetsDir, 'thumb-next.png'));

    mainWindow.setThumbarButtons([
      {
        tooltip: 'Add to playlist',
        icon: iconAdd,
        click() {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-key', 'like');
          }
        },
      },
      {
        tooltip: 'Previous track',
        icon: iconPrev,
        click() {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-key', 'prev');
          }
        },
      },
      {
        tooltip: isPlaying ? 'Pause' : 'Play',
        icon: isPlaying ? iconPause : iconPlay,
        click() {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-key', 'play-pause');
          }
        },
      },
      {
        tooltip: 'Next track',
        icon: iconNext,
        click() {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-key', 'next');
          }
        },
      },
    ]);
  } catch (err) {
    console.warn('Failed to update taskbar thumbnail buttons:', err ? err.message : err);
  }
}

ipcMain.on('playback-state', (_event, state) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const isPlaying = Boolean(state?.isPlaying);
  const song = state?.currentSong;
  const uiMode = state?.uiMode;

  if (song && song.title) {
    mainWindow.setTitle(`${song.title} • ${song.artist || 'Spotify Free'}`);
  } else {
    mainWindow.setTitle(uiMode === 'sunona' ? 'SunoNa!!' : 'Spotify Free');
  }

  updateThumbarButtons(isPlaying);
});

ipcMain.on('restart-and-install', () => {
  if (process.platform === 'darwin') {
    const { shell } = require('electron');
    shell.openExternal('https://github.com/notgarv01/Sunona/releases/latest');
  } else {
    autoUpdater.quitAndInstall();
  }
});

// Second instance triggered: focus the main window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (apiServer && typeof apiServer.close === 'function') {
    apiServer.close();
  }
});

