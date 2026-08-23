/**
 * main.js
 * Application Entry Point - CS Marketplace Dashboard
 */

const { app, BrowserWindow, session, dialog } = require('electron');
const path = require('path');

// ── Release Guard Validation ────────────────────────────────────────────────
// Memastikan changelog versi di package.json sudah tersedia di js/versions-registry.js sebelum startup
try {
  const versionsRegistry = require('./js/versions-registry.js');
  const pkg = require('./package.json');
  versionsRegistry.validateVersion(pkg.version);
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', err.message);
  app.whenReady().then(() => {
    dialog.showErrorBox(
      '🚨 Release Guard: Changelog Belum Didaftarkan!',
      `Nomor versi di package.json belum memiliki catatan changelog di js/versions-registry.js!\n\n` +
      `Detail Error:\n${err.message}\n\n` +
      `Silakan tambahkan changelog versi terkait sebelum merilis atau menjalankan aplikasi.`
    );
    app.quit();
  });
}

// ── Modular Config & Services ────────────────────────────────────────────────
const { cleanChromeUserAgent } = require('./src/main/config/constants');
const { applyChromiumSwitches } = require('./src/main/config/app.config');
const sessionService = require('./src/main/services/session.service');
const updaterService = require('./src/main/services/updater.service');
const systemService = require('./src/main/services/system.service');
const contextMenuService = require('./src/main/services/context-menu.service');
const { registerIpcHandlers } = require('./src/main/ipc/register-ipc');

// Terapkan switch performa & alokasi memori Chromium
applyChromiumSwitches(app);
app.userAgentFallback = cleanChromeUserAgent;

let mainWindow = null;

function getMainWindow() {
  return mainWindow;
}

// Flush data cookies & storage secara berkala ke disk (mencegah hilangnya cookie login)
setInterval(sessionService.flushAllSessions, 30000);

// Pangkas working set RAM secara otomatis setiap 45 detik untuk menjaga memori tetap ramping
setInterval(() => {
  sessionService.pruneBackgroundMemory().catch(() => {});
}, 45000);

// Daftarkan seluruh IPC handler
registerIpcHandlers(getMainWindow);

// ── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,          // Custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,       // Aktifkan <webview> untuk load marketplace
      sandbox: false,
      backgroundThrottling: false // Cegah pembekuan JS dan visual saat CS beralih ke Chrome
    }
  });

  // Buka langsung dalam mode layar maksimal (Maximized) secara default
  mainWindow.maximize();

  mainWindow.loadFile('index.html');

  // Pasang listener context menu pada jendela utama
  contextMenuService.attachContextMenu(mainWindow.webContents, getMainWindow);

  // Crash guard untuk jendela utama (Host Renderer)
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Host Window Crash Guard] Main window render process gone:', details);
    if (details.reason === 'crashed' || details.reason === 'oom' || details.reason === 'killed') {
      try {
        if (!mainWindow.isDestroyed()) mainWindow.reload();
      } catch (e) {}
    }
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[Host Window Watchdog] Main window is temporarily unresponsive.');
  });

  // Content-Security-Policy yang aman dan ketat untuk aplikasi desktop (tanpa unsafe-eval)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' https: http: data:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"]
      }
    });
  });

  mainWindow.on('focus', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.invalidate();
      }
    } catch (e) {}
  });

  mainWindow.on('restore', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.invalidate();
      }
    } catch (e) {}
  });
}

// Global Process Watchdog (GPU & Child Processes)
app.on('child-process-gone', (event, details) => {
  console.warn(`[Process Guard] Child process ${details.type} gone. Reason: ${details.reason}, ExitCode: ${details.exitCode}`);
  if (details.type === 'GPU' && mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.invalidate();
    } catch (e) {}
  }
});

// Setup webview permissions & navigation security guard untuk semua partisi webview
app.on('web-contents-created', (event, contents) => {
  sessionService.setupWebContentsSecurity(contents, getMainWindow);
});

// ── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  sessionService.setupSessionStealthGuard(session.defaultSession, getMainWindow);
  createWindow();

  // Setup auto updater setelah window dibuat
  updaterService.setupAutoUpdater(getMainWindow);

  // Inisialisasi clipboard watcher
  systemService.setupClipboardWatcher(getMainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      updaterService.setupAutoUpdater(getMainWindow);
    }
  });
});

app.on('before-quit', () => {
  sessionService.flushAllSessions();
});

app.on('window-all-closed', () => {
  sessionService.flushAllSessions();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
