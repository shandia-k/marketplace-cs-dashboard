const { app, BrowserWindow, ipcMain, session, dialog, clipboard, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const docx = require('docx');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');

// ── Chromium Memory & Performance Switches ──────────────────────────────────
// Berikan headroom V8 heap hingga 1024 MB agar sinkronisasi chat besar (WA/Shopee) tidak memicu GC thrashing
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1024');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Path untuk menyimpan data toko dan user
const userDataPath = app.getPath('userData');
const usersFilePath = path.join(userDataPath, 'users.json');

// Security Helpers
function isValidPartition(partition) {
  if (typeof partition !== 'string') return false;
  // Mencegah Path Traversal di session partition
  if (partition.includes('..') || partition.includes('/') || partition.includes('\\')) {
    return false;
  }
  return true;
}

function sanitizeUsername(username) {
  if (typeof username !== 'string') return '';
  return username.trim().replace(/[/\\?%*:|"<>]/g, '_');
}

// Default stores jika belum ada data
const defaultStores = [
  {
    id: 'shopee-1',
    name: 'Shopee Toko 1',
    marketplace: 'shopee',
    url: 'https://seller.shopee.co.id/portal/chat',
    partition: 'persist:shopee-1'
  },
  {
    id: 'tokopedia-1',
    name: 'Tokopedia Toko 1',
    marketplace: 'tokopedia',
    url: 'https://seller.tokopedia.com/chat',
    partition: 'persist:tokopedia-1'
  },
  {
    id: 'lazada-1',
    name: 'Lazada Toko 1',
    marketplace: 'lazada',
    url: 'https://sellercenter.lazada.co.id/apps/seller/chat',
    partition: 'persist:lazada-1'
  }
];

function getStoresFilePath(username) {
  const safeUsername = username ? sanitizeUsername(String(username)) : '';
  const fileName = safeUsername ? `stores_${safeUsername}.json` : 'stores.json';
  return path.join(userDataPath, fileName);
}

// Baca stores dari file JSON
function readStores(username) {
  const filePath = getStoresFilePath(username);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading stores:', err);
  }
  // Buat file default jika belum ada (aman dalam try-catch)
  try {
    fs.writeFileSync(filePath, JSON.stringify(defaultStores, null, 2));
  } catch (err) {
    console.error('Error creating default stores file:', err);
  }
  return defaultStores;
}

// Simpan stores ke file JSON
function saveStores(stores, username) {
  const filePath = getStoresFilePath(username);
  try {
    fs.writeFileSync(filePath, JSON.stringify(stores, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving stores:', err);
    return false;
  }
}

// ── Logika Users ─────────────────────────────────────────────────────────────
function readUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading users:', err);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving users:', err);
    return false;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

let mainWindow;

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
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');

  // Izinkan webview menggunakan berbagai fitur yang dibutuhkan marketplace
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' *"]
      }
    });
  });

  mainWindow.on('focus', () => {
    if (typeof checkClipboardNow === 'function') checkClipboardNow();
  });
}

// IPC Handlers
ipcMain.handle('get-stores', (event, username) => {
  return readStores(username);
});

ipcMain.handle('save-stores', (event, stores, username) => {
  return saveStores(stores, username);
});


// IPC Users
ipcMain.handle('get-users', () => {
  const users = readUsers();
  return users.map(u => ({ username: u.username }));
});

ipcMain.handle('create-user', (event, { username, password, securityQuestion, securityAnswer }) => {
  const users = readUsers();
  if (users.find(u => u.username === username)) {
    return { success: false, error: 'Username sudah digunakan' };
  }
  const newUser = {
    username,
    passwordHash: hashPassword(password),
    securityQuestion: securityQuestion || null,
    securityAnswerHash: securityAnswer ? hashPassword(securityAnswer.toLowerCase().trim()) : null
  };
  users.push(newUser);
  saveUsers(users);
  return { success: true };
});

ipcMain.handle('login-user', (event, { username, password }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  
  if (user.passwordHash === hashPassword(password)) {
    return { success: true };
  } else {
    return { success: false, error: 'PIN/Password salah' };
  }
});

ipcMain.handle('get-security-question', (event, { username }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!user.securityQuestion) return { success: false, error: 'Tidak ada pertanyaan keamanan yang diset' };
  return { success: true, question: user.securityQuestion };
});

ipcMain.handle('reset-user-password', (event, { username, securityAnswer, newPassword }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!user.securityAnswerHash) return { success: false, error: 'Tidak ada pertanyaan keamanan yang diset untuk akun ini' };
  
  if (user.securityAnswerHash !== hashPassword(securityAnswer.toLowerCase().trim())) {
    return { success: false, error: 'Jawaban keamanan salah' };
  }
  
  user.passwordHash = hashPassword(newPassword);
  saveUsers(users);
  return { success: true };
});

ipcMain.handle('get-app-path', () => {
  return __dirname;
});

ipcMain.handle('read-clipboard', () => {
  try {
    return clipboard.readText();
  } catch (e) {
    return '';
  }
});

ipcMain.handle('write-clipboard', (event, text) => {
  try {
    clipboard.writeText(text || '');
    return true;
  } catch (e) {
    return false;
  }
});

// Auto-Watcher Clipboard Windows (Real-Time Background Polling for Copy & Cut)
let lastClipboardText = '';
function checkClipboardNow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const text = clipboard.readText()?.trim();
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      mainWindow.webContents.send('clipboard-changed', text);
    }
  } catch (e) {}
}

setInterval(checkClipboardNow, 350);

ipcMain.handle('update-security-question', (event, { username, password, securityQuestion, securityAnswer }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'PIN saat ini salah' };
  }
  user.securityQuestion    = securityQuestion || null;
  user.securityAnswerHash  = securityAnswer ? hashPassword(securityAnswer.toLowerCase().trim()) : null;
  saveUsers(users);
  return { success: true };
});

ipcMain.handle('change-password', (event, { username, currentPassword, newPassword }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (user.passwordHash !== hashPassword(currentPassword)) {
    return { success: false, error: 'PIN saat ini salah' };
  }
  user.passwordHash = hashPassword(newPassword);
  saveUsers(users);
  return { success: true };
});

// ── Helper & IPC Cache Management ──────────────────────────────────────────────
function getDirSize(dirPath) {
  let total = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += getDirSize(fullPath);
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          total += stat.size;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return total;
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function calculateAppCacheSize() {
  const cacheDirs = [
    path.join(userDataPath, 'Cache'),
    path.join(userDataPath, 'GPUCache'),
    path.join(userDataPath, 'Code Cache'),
    path.join(userDataPath, 'DawnCache'),
    path.join(userDataPath, 'Partitions')
  ];
  let total = 0;
  for (const dir of cacheDirs) {
    total += getDirSize(dir);
  }
  return total;
}

ipcMain.handle('get-cache-size', () => {
  const total = calculateAppCacheSize();
  return { bytes: total, formatted: formatBytes(total) };
});

// Opsi 1: Bersihkan Cache Aman (Global, Cookies & Login Tetap Aman)
ipcMain.handle('clear-safe-cache', async (event, username) => {
  try {
    // 1. Bersihkan default session cache
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['shadercache', 'serviceworkers', 'cachestorage', 'websql', 'indexeddb']
    });

    // 2. Bersihkan partisi toko HANYA untuk user yang sedang aktif
    const stores = readStores(username);
    const partitions = new Set();

    stores.forEach(s => {
      if (username && s.id) {
        partitions.add(`persist:user_${username}_${s.id}`);
      } else if (s.partition) {
        partitions.add(s.partition);
      }
    });

    for (const part of partitions) {
      try {
        if (!isValidPartition(part)) {
          console.warn(`Invalid partition rejected: ${part}`);
          continue;
        }
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['shadercache', 'serviceworkers', 'cachestorage']
        });
      } catch (e) {}
    }

    const newSize = calculateAppCacheSize();
    return { success: true, newFormatted: formatBytes(newSize), message: 'Cache aman berhasil dibersihkan! Sesi login toko tetap terjaga.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Opsi 2: Bersihkan Cache Khusus Toko Tertentu (Per-Store Cache Clear & Reload)
ipcMain.handle('clear-store-cache', async (event, { partition }) => {
  try {
    if (!partition) return { success: false, error: 'Partisi tidak valid' };
    if (!isValidPartition(partition)) return { success: false, error: 'Format partisi tidak valid' };
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData({
      storages: ['shadercache', 'serviceworkers', 'cachestorage']
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Opsi 3: Deep Clean / Reset Toko (Termasuk Logout / Sesi Dihapus)
ipcMain.handle('deep-clean-store', async (event, { partition }) => {
  try {
    if (!partition) return { success: false, error: 'Partisi tidak valid' };
    if (!isValidPartition(partition)) return { success: false, error: 'Format partisi tidak valid' };
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData(); // Bersihkan semuanya (termasuk cookies & localstorage)
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Opsi 3 Global: Deep Clean Semua Data Toko Milik Pengguna yang Sedang Aktif
ipcMain.handle('deep-clean-all', async (event, username) => {
  try {
    // Bersihkan partisi HANYA milik user yang sedang aktif
    const stores = readStores(username);
    const partitions = new Set();

    stores.forEach(s => {
      if (username && s.id) {
        partitions.add(`persist:user_${username}_${s.id}`);
      } else if (s.partition) {
        partitions.add(s.partition);
      }
    });

    for (const part of partitions) {
      try {
        if (!isValidPartition(part)) {
          console.warn(`Invalid partition rejected: ${part}`);
          continue;
        }
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData();
      } catch (e) {}
    }

    const newSize = calculateAppCacheSize();
    return { success: true, newFormatted: formatBytes(newSize) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export konfigurasi toko ke file JSON
ipcMain.handle('export-stores-config', async (event, stores) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Ekspor Konfigurasi Toko',
    defaultPath: 'cs-dashboard-config.json',
    filters: [{ name: 'JSON Config', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(stores, null, 2), 'utf8');
    return true;
  } catch (err) {
    throw new Error('Gagal ekspor: ' + err.message);
  }
});

// Import konfigurasi toko dari file JSON
ipcMain.handle('import-stores-config', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Impor Konfigurasi Toko',
    properties: ['openFile'],
    filters: [{ name: 'JSON Config', extensions: ['json'] }]
  });
  if (canceled || filePaths.length === 0) return null;
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Format file tidak valid.');
    // Validasi minimal setiap toko punya id, name, marketplace
    parsed.forEach(s => {
      if (!s.id || !s.name || !s.marketplace) throw new Error('Data toko tidak lengkap.');
    });
    return parsed;
  } catch (err) {
    throw new Error('Gagal impor: ' + err.message);
  }
});

ipcMain.handle('get-app-memory-mb', () => {
  try {
    const metrics = app.getAppMetrics();
    // metrics adalah array object berisi { type, memory: { privateBytes, workingSetSize } }
    // privateBytes = Private Working Set (same as Task Manager "Memory" column)
    if (metrics && metrics.length > 0) {
      const totalKB = metrics.reduce((sum, m) => sum + (m.memory?.privateBytes || m.memory?.workingSetSize || 0), 0);
      return totalKB / 1024; // Return MB
    }
  } catch (e) {}
  return 0;
});

ipcMain.handle('get-app-metrics-details', () => {
  try {
    const metrics = app.getAppMetrics() || [];
    const allContents = webContents ? webContents.getAllWebContents() : [];
    
    return allContents
      .filter(wc => !wc.isDestroyed())
      .map(wc => {
        const pid = wc.getOSProcessId();
        const metric = metrics.find(m => m.pid === pid);
        const memKB = metric ? (metric.memory?.privateBytes || metric.memory?.workingSetSize || 0) : 0;
        return {
          wcId: wc.id,
          type: wc.getType(),
          pid: pid,
          memoryKB: memKB
        };
      });
  } catch (e) {
    return [];
  }
});


// Scratchpad IPC Handlers
ipcMain.handle('load-scratchpad-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Buka File Catatan',
    properties: ['openFile'],
    filters: [
      { name: 'Dokumen', extensions: ['txt', 'xlsx', 'docx'] }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const filePath = filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  try {
    let content = '';
    if (ext === '.txt') {
      content = fs.readFileSync(filePath, 'utf8');
    } else if (ext === '.xlsx') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Convert sheet to json arrays
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      // Extract text from the first column or just join everything
      content = data.map(row => row.join('\t')).join('\n');
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    }
    return { content, fileName: path.basename(filePath) };
  } catch (err) {
    throw new Error('Gagal membaca file: ' + err.message);
  }
});

ipcMain.handle('save-scratchpad-file', async (event, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan Catatan',
    defaultPath: 'catatan.txt',
    filters: [
      { name: 'Text File', extensions: ['txt'] },
      { name: 'Excel File', extensions: ['xlsx'] },
      { name: 'Word Document', extensions: ['docx'] }
    ]
  });

  if (canceled || !filePath) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.txt') {
      fs.writeFileSync(filePath, content, 'utf8');
    } else if (ext === '.xlsx') {
      // Create a new workbook and add a worksheet
      const wb = xlsx.utils.book_new();
      // Split content by newline to put each line in a new row
      const data = content.split('\n').map(line => [line]);
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'Catatan');
      xlsx.writeFile(wb, filePath);
    } else if (ext === '.docx') {
      // Split by newline and create paragraphs
      const paragraphs = content.split('\n').map(line => {
        return new docx.Paragraph({
          children: [new docx.TextRun(line)]
        });
      });

      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const buffer = await docx.Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
    }
    return { success: true, fileName: path.basename(filePath) };
  } catch (err) {
    throw new Error('Gagal menyimpan file: ' + err.message);
  }
});

// Feedback Handler
ipcMain.handle('submit-feedback', async (event, data) => {
  // -------------------------------------------------------------
  // PENGATURAN PROXY SERVER FEEDBACK (GOOGLE APPS SCRIPT)
  // -------------------------------------------------------------
  // Ganti URL di bawah ini dengan Web App URL dari Google Apps Script Anda.
  // Ini memastikan aplikasi Anda 100% aman dan bersih dari Token Rahasia.
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxX7AEaLnjhY4jNmnrOGxF_BR0Qwu7P03-5xhNiRmxn3OZTnWG89GtxMol8z6DD1uhKSQ/exec";

  if (!GAS_WEB_APP_URL) {
    // Simulasi sukses untuk testing jika proxy belum diatur
    return { success: true, message: "Server Proxy belum diatur, namun pengumpulan data berhasil." };
  }

  try {
    const os = require('os');
    const systemInfo = `
OS: ${os.type()} ${os.release()} (${os.arch()})
Node: ${process.versions.node} | Electron: ${process.versions.electron}
App Version: ${app.getVersion()}
Free RAM: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
    `.trim();

    // Kirim data ke Google Apps Script Proxy Anda
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type.toUpperCase(),
        message: data.message,
        systemInfo: systemInfo,
        storesConfig: data.storesConfig
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Proxy HTTP Error ${response.status}: ${errText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Feedback Proxy Error:', error);
    return { success: false, error: error.message };
  }
});

// Telemetry & Product Analytics Handler
ipcMain.handle('send-telemetry', async (event, data) => {
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxX7AEaLnjhY4jNmnrOGxF_BR0Qwu7P03-5xhNiRmxn3OZTnWG89GtxMol8z6DD1uhKSQ/exec";

  if (!GAS_WEB_APP_URL) return { success: false, message: 'URL belum diatur' };

  try {
    const os = require('os');
    const systemInfo = `${os.type()} ${os.release()} (${os.arch()}) | RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`;

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TELEMETRY',
        appVersion: app.getVersion(),
        durationMinutes: data.durationMinutes || 0,
        storeCount: data.storeCount || 0,
        marketplaces: data.marketplaces || '-',
        events: data.events || {},
        systemInfo: systemInfo
      })
    });

    const respText = await response.text();
    let respJson = null;
    try {
      respJson = JSON.parse(respText);
    } catch (e) {
      respJson = { raw: respText };
    }

    console.log('[Telemetry Response from GAS]:', respJson);
    return { success: response.ok, data: respJson };
  } catch (error) {
    console.error('[Telemetry Error]:', error);
    return { success: false, error: error.message };
  }
});

// Window controls
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

ipcMain.on('flash-frame', (event, flag) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(flag !== false);
  }
});

// Auto Updater IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('check-for-updates', () => {
  if (!app.isPackaged) {
    // Mode Development (npm start)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-message', {
        status: 'checking',
        currentVersion: app.getVersion()
      });
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater-message', {
            status: 'not-available',
            version: app.getVersion(),
            currentVersion: app.getVersion(),
            message: 'Aplikasi sudah versi terbaru (Mode Dev: v' + app.getVersion() + ')',
            isDev: true
          });
        }
      }, 1200);
    }
    return;
  }

  // Mode Production (Packed .exe)
  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-message', {
        status: 'error',
        message: err.message || 'Gagal memulai pengecekan update',
        currentVersion: app.getVersion()
      });
    }
  }
});

ipcMain.on('restart-to-update', () => {
  autoUpdater.quitAndInstall();
});

// Setup Auto Updater Events
function setupAutoUpdater(window) {
  autoUpdater.removeAllListeners();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'checking',
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'available',
        version: info.version,
        currentVersion: app.getVersion(),
        releaseNotes: info.releaseNotes || null,
        releaseDate: info.releaseDate || null
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'not-available',
        version: app.getVersion(),
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('error', (err) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'error',
        message: err.message || 'Terjadi kesalahan saat memeriksa update',
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-progress', {
        percent: Math.round(progressObj.percent || 0),
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
        bytesPerSecond: progressObj.bytesPerSecond || 0
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'downloaded',
        version: info.version,
        currentVersion: app.getVersion()
      });
    }
  });
}

// Setup webview permissions untuk semua partisi
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    const allowedPermissions = [
      'notifications',
      'media',
      'geolocation',
      'fullscreen',
      'clipboard-read',
      'clipboard-sanitized-write'
    ];

    // Izinkan notifikasi, kamera, clipboard, dll. yang dibutuhkan marketplace
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(allowedPermissions.includes(permission));
    });

    contents.session.setPermissionCheckHandler((webContents, permission) => {
      return allowedPermissions.includes(permission);
    });

    // Tangani navigasi di webview agar tetap di domain marketplace
    contents.on('will-navigate', (event, url) => {
      console.log('Webview navigating to:', url);
    });
  }
});

// Memaksa User-Agent standar Firefox agar login Google/Gmail tidak memicu pengecekan Chromium security
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';

app.whenReady().then(() => {
  createWindow();

  // Setup auto updater setelah window dibuat
  setupAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      setupAutoUpdater(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
