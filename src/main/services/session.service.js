/**
 * src/main/services/session.service.js
 * Browser session management, stealth headers, webview security guards, and cache deep-cleaning
 */

const { session, app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  cleanChromeUserAgent,
  cleanFirefoxUserAgent
} = require('../config/constants');
const {
  getUserDataPath,
  readStores,
  isValidPartition,
  safeDeletePartitionDisk
} = require('./storage.service');
const { attachContextMenu } = require('./context-menu.service');

const activeStealthSessions = new Set();

function flushAllSessions() {
  try {
    session.defaultSession.flushStorageData();
    activeStealthSessions.forEach((s) => {
      try {
        s.flushStorageData();
      } catch (e) { }
    });
  } catch (e) { }
}

function setupSessionStealthGuard(sess, getMainWindow) {
  if (!sess || activeStealthSessions.has(sess)) return;
  activeStealthSessions.add(sess);

  // 1. Tangani pengunduhan file (PDF resi, laporan Excel, dokumen cetak, dll.)
  try {
    sess.on('will-download', (event, item, webContents) => {
      const filename = item.getFilename();
      const defaultFilename = filename || `unduhan_${Date.now()}`;
      const downloadsDir = (app && typeof app.getPath === 'function') ? app.getPath('downloads') : '';
      const defaultPath = downloadsDir ? path.join(downloadsDir, defaultFilename) : defaultFilename;
      const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : null;

      const ext = path.extname(defaultFilename).slice(1);
      const filters = [];
      if (ext) {
        filters.push({ name: `${ext.toUpperCase()} File (*.${ext})`, extensions: [ext] });
      }
      filters.push({ name: 'All Files (*.*)', extensions: ['*'] });

      let savePath = null;
      try {
        if (dialog && typeof dialog.showSaveDialogSync === 'function') {
          savePath = dialog.showSaveDialogSync(mainWindow, {
            title: 'Simpan File Unduhan...',
            defaultPath: defaultPath,
            filters: filters
          });
        }
      } catch (errDialog) {
        console.warn('[Download Guard] showSaveDialogSync error, fallback to default path:', errDialog.message);
        savePath = defaultPath;
      }

      if (savePath) {
        item.setSavePath(savePath);
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('show-toast-message', {
              message: `📥 Mengunduh: ${path.basename(savePath)}...`,
              type: ''
            });
          }
        } catch (e) { }

        item.once('done', (doneEvent, state) => {
          try {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (state === 'completed') {
                mainWindow.webContents.send('show-toast-message', {
                  message: `✅ File berhasil diunduh: ${path.basename(savePath)}`,
                  type: 'success'
                });
              } else if (state === 'cancelled') {
                mainWindow.webContents.send('show-toast-message', {
                  message: `ℹ️ Unduhan dibatalkan: ${path.basename(savePath)}`,
                  type: 'info'
                });
              } else {
                mainWindow.webContents.send('show-toast-message', {
                  message: `❌ Gagal mengunduh file (${state})`,
                  type: 'error'
                });
              }
            }
          } catch (e) { }
        });
      } else {
        item.cancel();
      }
    });
  } catch (errDl) {
    console.error('[Download Guard] Failed to attach will-download listener:', errDl);
  }

  // 2. Stealth User-Agent & Header Sanitizer
  try {
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = details.requestHeaders || {};
      const url = details.url || '';
      const isGoogleAuth = url.includes('accounts.google.com') ||
        url.includes('accounts.youtube.com') ||
        url.includes('mail.google.com') ||
        url.includes('google.com/accounts');

      if (isGoogleAuth) {
        requestHeaders['User-Agent'] = cleanFirefoxUserAgent;
        delete requestHeaders['Sec-CH-UA'];
        delete requestHeaders['Sec-CH-UA-Mobile'];
        delete requestHeaders['Sec-CH-UA-Platform'];
        delete requestHeaders['Sec-CH-UA-Platform-Version'];
        delete requestHeaders['Sec-CH-UA-Full-Version-List'];
        delete requestHeaders['sec-ch-ua'];
        delete requestHeaders['sec-ch-ua-mobile'];
        delete requestHeaders['sec-ch-ua-platform'];
        delete requestHeaders['sec-ch-ua-platform-version'];
        delete requestHeaders['sec-ch-ua-full-version-list'];
      } else {
        requestHeaders['User-Agent'] = cleanChromeUserAgent;
      }

      delete requestHeaders['X-Requested-With'];
      delete requestHeaders['x-requested-with'];

      callback({ requestHeaders });
    });
  } catch (e) {
    console.error('[Stealth Guard] Failed to attach onBeforeSendHeaders:', e);
  }
}

function setupWebContentsSecurity(contents, getMainWindow) {
  const type = contents.getType();
  if (type !== 'webview' && type !== 'window') return;

  setupSessionStealthGuard(contents.session, getMainWindow);
  attachContextMenu(contents, getMainWindow);

  contents.on('found-in-page', (event, result) => {
    try {
      const electron = require('electron');
      const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : (electron.BrowserWindow.getAllWindows()[0] || null);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('found-in-page-result', {
          wcId: contents.id,
          result
        });
      }
    } catch (e) { }
  });

  // Native Chromium Accelerator Guard: Tangkap input keyboard (Ctrl+F, Escape, dll.)
  // sebelum diserap atau dicegat oleh iframe atau script website manapun
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const isCtrlOrMeta = input.control || input.meta;
    const keyLower = (input.key || '').toLowerCase();

    // 1. Ctrl+F / Cmd+F: Find in Page
    if (isCtrlOrMeta && keyLower === 'f') {
      event.preventDefault();
      try {
        const electron = require('electron');
        const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : (electron.BrowserWindow.getAllWindows()[0] || null);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('trigger-find-in-page', { wcId: contents.id });
        }
      } catch (e) { }
    }
    // 2. Escape: Tutup toolbar Find in Page jika sedang aktif
    else if (input.key === 'Escape') {
      try {
        const electron = require('electron');
        const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : (electron.BrowserWindow.getAllWindows()[0] || null);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('trigger-close-find-in-page');
        }
      } catch (e) { }
    }
  });

  const syncUserAgentForUrl = (targetUrl) => {
    if (!targetUrl || typeof targetUrl !== 'string') return;
    const isGoogle = targetUrl.includes('accounts.google.com') ||
      targetUrl.includes('accounts.youtube.com') ||
      targetUrl.includes('mail.google.com') ||
      targetUrl.includes('google.com/accounts');
    const targetUa = isGoogle ? cleanFirefoxUserAgent : cleanChromeUserAgent;
    try {
      if (!contents.isDestroyed() && contents.getUserAgent() !== targetUa) {
        contents.setUserAgent(targetUa);
      }
    } catch (e) { }
  };

  contents.on('did-start-navigation', (evt, url, isInPlace, isMainFrame) => {
    if (isMainFrame !== false && !isInPlace) {
      syncUserAgentForUrl(url);
    }
  });

  const allowedPermissions = [
    'notifications',
    'media',
    'geolocation',
    'fullscreen',
    'clipboard-read',
    'clipboard-sanitized-write'
  ];

  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(allowedPermissions.includes(permission));
  });

  contents.session.setPermissionCheckHandler((webContents, permission) => {
    return allowedPermissions.includes(permission);
  });

  contents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (['file:', 'javascript:', 'data:', 'vbscript:'].includes(parsed.protocol)) {
        console.warn('Blocked dangerous webview navigation scheme:', url);
        event.preventDefault();
        return;
      }
    } catch (e) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url, disposition, features }) => {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { action: 'deny' };
      }
      if (url.includes('/widget/hovercard') || url.includes('contacts.google.com/widget')) {
        return { action: 'deny' };
      }

      const lowerUrl = url.toLowerCase();
      const isOAuth = lowerUrl.includes('accounts.google.com') ||
        lowerUrl.includes('accounts.youtube.com') ||
        lowerUrl.includes('appleid.apple.com') ||
        lowerUrl.includes('login.live.com') ||
        lowerUrl.includes('login.microsoftonline.com') ||
        lowerUrl.includes('facebook.com/dialog/oauth') ||
        lowerUrl.includes('facebook.com/login') ||
        lowerUrl.includes('github.com/login') ||
        lowerUrl.includes('github.com/sessions') ||
        lowerUrl.includes('gitlab.com/oauth') ||
        lowerUrl.includes('oauth') ||
        lowerUrl.includes('/auth/') ||
        lowerUrl.includes('/authorize') ||
        lowerUrl.includes('/sso/') ||
        lowerUrl.includes('response_type=code') ||
        lowerUrl.includes('client_id=');

      const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : null;

      if (isOAuth) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            parent: mainWindow,
            modal: false,
            width: 520,
            height: 680,
            autoHideMenuBar: true,
            webPreferences: {
              sandbox: false,
              contextIsolation: false
            }
          }
        };
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-open-new-tab', {
          wcId: contents.id,
          url: url
        });
      }
    } catch (e) { }
    return { action: 'deny' };
  });

  contents.on('render-process-gone', (event, details) => {
    console.warn(`[Webview Crash Guard] Webview WebContents ID ${contents.id} gone. Reason: ${details?.reason}, ExitCode: ${details?.exitCode}`);
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('webview-render-process-gone', {
          wcId: contents.id,
          reason: details?.reason || 'unknown'
        });
      } catch (e) { }
    }
  });

  contents.on('unresponsive', () => {
    console.warn(`[Webview Watchdog] Webview WebContents ID ${contents.id} is unresponsive.`);
  });
}

// ── Cache & Disk Measurement Helpers ─────────────────────────────────────────
async function getDirSizeAsync(dirPath) {
  let total = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += await getDirSizeAsync(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(fullPath);
          total += stat.size;
        }
      } catch (e) { }
    }
  } catch (e) { }
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

async function calculateAppCacheSizeAsync() {
  const userDataPath = getUserDataPath();
  const cacheDirs = [
    path.join(userDataPath, 'Cache'),
    path.join(userDataPath, 'GPUCache'),
    path.join(userDataPath, 'Code Cache'),
    path.join(userDataPath, 'DawnCache'),
    path.join(userDataPath, 'Partitions')
  ];
  let total = 0;
  for (const dir of cacheDirs) {
    total += await getDirSizeAsync(dir);
  }
  return total;
}

async function getCacheSize() {
  const total = await calculateAppCacheSizeAsync();
  return { bytes: total, formatted: formatBytes(total) };
}

async function clearSafeCache(username) {
  try {
    if (session.defaultSession) {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['shadercache', 'serviceworkers', 'cachestorage', 'websql', 'indexeddb']
      });
    }

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
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['shadercache', 'serviceworkers', 'cachestorage']
        });
      } catch (e) { }
    }

    const newSize = await calculateAppCacheSizeAsync();
    return {
      success: true,
      newFormatted: formatBytes(newSize),
      message: 'Cache aman berhasil dibersihkan! Sesi login toko tetap terjaga.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function clearStoreCache({ partition }) {
  try {
    if (!isValidPartition(partition)) {
      console.warn(`[Security Warning] Blocked invalid partition in clear-store-cache: "${partition}"`);
      return { success: false, error: 'Format partisi tidak sah atau berbahaya.' };
    }
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData({
      storages: ['shadercache', 'serviceworkers', 'cachestorage']
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deepCleanStore({ partition }) {
  try {
    if (!isValidPartition(partition)) {
      console.warn(`[Security Warning] Blocked invalid partition in deep-clean-store: "${partition}"`);
      return { success: false, error: 'Format partisi tidak sah atau berbahaya.' };
    }
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData();
    safeDeletePartitionDisk(partition);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deepCleanAll(username) {
  try {
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
      if (!isValidPartition(part)) continue;
      try {
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData();
        safeDeletePartitionDisk(part);
      } catch (e) { }
    }

    const newSize = await calculateAppCacheSizeAsync();
    return { success: true, newFormatted: formatBytes(newSize) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Pangkas memori cache in-memory (decoded image bitmap & layout buffer) pada semua sesi aktif
 * tanpa merusak DOM, tanpa menghapus cookie login, dan tanpa mereload halaman.
 */
async function pruneBackgroundMemory() {
  try {
    const electron = require('electron');

    // 1. Bersihkan memory HTTP & Image Cache in-memory pada defaultSession & semua partisi aktif
    if (session.defaultSession) {
      try { 
        await session.defaultSession.clearCache(); 
      } catch (e) { }
    }

    for (const s of activeStealthSessions) {
      try { 
        await s.clearCache(); 
      } catch (e) { }
    }

    // 2. Minta WebContents untuk melepaskan unreferenced image/v8 memory & trim background render
    if (electron.webContents) {
      const allWc = electron.webContents.getAllWebContents();
      for (const wc of allWc) {
        if (!wc.isDestroyed() && wc.getType() === 'webview') {
          try {
            wc.executeJavaScript('if (typeof window !== "undefined" && typeof window.gc === "function") { try { window.gc(); } catch (e) {} }').catch(() => {});
          } catch (e) { }
        }
      }
    }

    // 3. Panggil V8 GC pada proses utama jika tersedia
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (e) { }
    }

    // 4. Native Windows Working Set Trimming: Pindahkan halaman memori idle ke Windows RAM Compression Store
    try {
      const { trimWorkingSet } = require('./memory-trimmer.service');
      await trimWorkingSet();
    } catch (e) { }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  flushAllSessions,
  setupSessionStealthGuard,
  setupWebContentsSecurity,
  getCacheSize,
  clearSafeCache,
  clearStoreCache,
  deepCleanStore,
  deepCleanAll,
  pruneBackgroundMemory
};
