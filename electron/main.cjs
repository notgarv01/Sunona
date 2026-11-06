const { app, BrowserWindow, globalShortcut, ipcMain, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { startServer } = require('./server.cjs');

// Auto-updater configuration: silent background download & install on exit
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking GitHub for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info.version);
});

autoUpdater.on('update-not-available', () => {
  console.log('[AutoUpdater] App is up to date.');
});

autoUpdater.on('error', (err) => {
  console.warn('[AutoUpdater] Warning:', err ? err.message : 'Unknown error');
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-ready', info.version);
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

  // Handle external link clicks and allow Google Auth popup
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Google Account & Firebase Auth popup window
    if (
      url.includes('firebaseapp.com') ||
      url.includes('accounts.google.com') ||
      url.includes('google.com/o/oauth2')
    ) {
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

    const { shell } = require('electron');
    shell.openExternal(url);
    return { action: 'deny' };
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
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.warn('[AutoUpdater] Initial check error:', err ? err.message : err);
      });
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

ipcMain.on('restart-and-install', () => {
  autoUpdater.quitAndInstall();
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

