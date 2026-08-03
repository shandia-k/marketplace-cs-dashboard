const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const docx = require('docx');
const { autoUpdater } = require('electron-updater');

// Path untuk menyimpan data toko
const userDataPath = app.getPath('userData');
const storesFilePath = path.join(userDataPath, 'stores.json');

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

// Baca stores dari file JSON
function readStores() {
  try {
    if (fs.existsSync(storesFilePath)) {
      const data = fs.readFileSync(storesFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading stores:', err);
  }
  // Buat file default jika belum ada
  fs.writeFileSync(storesFilePath, JSON.stringify(defaultStores, null, 2));
  return defaultStores;
}

// Simpan stores ke file JSON
function saveStores(stores) {
  try {
    fs.writeFileSync(storesFilePath, JSON.stringify(stores, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving stores:', err);
    return false;
  }
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
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
}

// IPC Handlers
ipcMain.handle('get-stores', () => {
  return readStores();
});

ipcMain.handle('save-stores', (event, stores) => {
  return saveStores(stores);
});

ipcMain.handle('get-user-data-path', () => {
  return userDataPath;
});

ipcMain.handle('get-app-path', () => {
  return __dirname;
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
    // privateBytes = Private Working Set (same as Task Manager "Memory" column)
    // workingSetSize includes shared pages and inflates the number significantly
    const totalKB = metrics.reduce((sum, m) => sum + (m.memory?.privateBytes || 0), 0);
    return Math.round(totalKB / 1024);
  } catch (e) {
    return 0;
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

// Auto Updater IPC Handlers
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('restart-to-update', () => {
  autoUpdater.quitAndInstall();
});

// Setup Auto Updater Events
function setupAutoUpdater(window) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    window.webContents.send('updater-message', { status: 'checking', message: 'Mengecek pembaruan...' });
  });

  autoUpdater.on('update-available', (info) => {
    window.webContents.send('updater-message', { status: 'available', message: 'Pembaruan tersedia. Mengunduh...' });
  });

  autoUpdater.on('update-not-available', (info) => {
    window.webContents.send('updater-message', { status: 'not-available', message: 'Aplikasi sudah versi terbaru.' });
  });

  autoUpdater.on('error', (err) => {
    window.webContents.send('updater-message', { status: 'error', message: 'Error pembaruan: ' + err.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    window.webContents.send('updater-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    window.webContents.send('updater-message', { status: 'downloaded', message: 'Pembaruan siap diinstal.' });
  });
}

// Setup webview permissions untuk semua partisi
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    // Izinkan notifikasi, kamera, dll. yang mungkin dibutuhkan marketplace
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowedPermissions = ['notifications', 'media', 'geolocation', 'fullscreen'];
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
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
  // Langsung cek saat pertama kali buka
  autoUpdater.checkForUpdatesAndNotify();

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
