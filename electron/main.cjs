const { app, BrowserWindow, globalShortcut, ipcMain, Menu } = require('electron');
const path = require('path');
const { startServer } = require('./server.cjs');

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

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const { shell } = require('electron');
    shell.openExternal(url);
    return { action: 'deny' };
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

