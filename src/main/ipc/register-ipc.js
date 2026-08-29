/**
 * src/main/ipc/register-ipc.js
 * Centralized IPC Handler Registration for Main Process
 */

const { ipcMain, app, clipboard, webContents } = require('electron');
const storageService = require('../services/storage.service');
const authService = require('../services/auth.service');
const sessionService = require('../services/session.service');
const updaterService = require('../services/updater.service');
const searchService = require('../services/search.service');
const systemService = require('../services/system.service');
const feedbackService = require('../services/feedback.service');
const contextMenuService = require('../services/context-menu.service');
const vaultService = require('../services/vault.service');
const QRCode = require('qrcode');

function registerIpcHandlers(getMainWindow) {
  // ── Native Vault DPAPI Encryption IPC ──────────────────────────────────────
  ipcMain.handle('vault-encrypt', (event, plaintext) => {
    return vaultService.encryptSecret(plaintext);
  });

  ipcMain.handle('vault-decrypt', (event, ciphertext, hostContext) => {
    return vaultService.decryptSecret(ciphertext, hostContext);
  });

  ipcMain.on('vault-encrypt-sync', (event, plaintext) => {
    event.returnValue = vaultService.encryptSecret(plaintext);
  });

  ipcMain.on('vault-decrypt-sync', (event, ciphertext, hostContext) => {
    event.returnValue = vaultService.decryptSecret(ciphertext, hostContext);
  });

  // ── Autofill Central Vault IPC (Zero Webview localStorage Exposure) ─────────
  ipcMain.on('autofill-get-entries-sync', (event, host) => {
    event.returnValue = vaultService.getAutofillEntries(host);
  });

  ipcMain.handle('autofill-get-entries', (event, host) => {
    return vaultService.getAutofillEntries(host);
  });

  ipcMain.on('autofill-save-entry-sync', (event, payload) => {
    event.returnValue = vaultService.saveAutofillEntry(payload);
  });

  ipcMain.handle('autofill-save-entry', (event, payload) => {
    return vaultService.saveAutofillEntry(payload);
  });

  ipcMain.on('autofill-delete-entry-sync', (event, payload) => {
    event.returnValue = vaultService.deleteAutofillEntry(payload);
  });

  ipcMain.handle('autofill-delete-entry', (event, payload) => {
    return vaultService.deleteAutofillEntry(payload);
  });

  // ── Store Management IPC ───────────────────────────────────────────────────
  ipcMain.handle('get-stores', (event, username) => {
    const cleanUsername = String(username || '').trim();
    const currentActiveSession = authService.getActiveSession();

    if (!currentActiveSession) {
      console.warn(`[Security Warning] Blocked unauthenticated getStores attempt for user "${cleanUsername}"`);
      return null;
    }

    if (!currentActiveSession.isSuperAdmin && currentActiveSession.username.toLowerCase() !== cleanUsername.toLowerCase()) {
      console.warn(`[Security Warning] Blocked unauthorized getStores attempt by "${currentActiveSession.username}" for user "${cleanUsername}"`);
      return null;
    }

    return storageService.readStores(username);
  });

  ipcMain.handle('save-stores', (event, stores, username) => {
    const cleanUsername = String(username || '').trim();
    const currentActiveSession = authService.getActiveSession();

    if (!currentActiveSession) {
      console.warn(`[Security Warning] Blocked unauthenticated saveStores attempt for user "${cleanUsername}"`);
      return false;
    }

    // Proteksi IDOR: CS hanya boleh menyimpan file toko miliknya sendiri (atau Super Admin)
    if (!currentActiveSession.isSuperAdmin && currentActiveSession.username.toLowerCase() !== cleanUsername.toLowerCase()) {
      console.warn(`[Security Warning] Blocked unauthorized saveStores attempt by "${currentActiveSession.username}" for user "${cleanUsername}"`);
      return false;
    }
    return storageService.saveStores(stores, username);
  });

  ipcMain.handle('export-stores-config', (event, stores) => {
    return systemService.exportStoresConfig(stores, getMainWindow);
  });

  ipcMain.handle('import-stores-config', () => {
    return systemService.importStoresConfig(getMainWindow);
  });

  ipcMain.handle('search-urls', (event, query) => {
    return searchService.searchWebUrls(query);
  });

  // ── User Management & Auth IPC ─────────────────────────────────────────────
  ipcMain.handle('get-users', () => {
    return authService.getUsers();
  });

  ipcMain.handle('get-user-profile', (event, username) => {
    return authService.getUserProfile(username);
  });

  ipcMain.handle('create-user', (event, data) => {
    return authService.createUser(data);
  });

  ipcMain.handle('update-user-profile', (event, data) => {
    return authService.updateUserProfile(data);
  });

  ipcMain.handle('delete-user', (event, data) => {
    return authService.deleteUser(data);
  });

  ipcMain.handle('verify-user-pin', (event, data) => {
    return authService.verifyUserPin(data);
  });

  ipcMain.handle('login-user', (event, data) => {
    return authService.loginUser(data);
  });

  ipcMain.handle('logout-user', () => {
    return authService.logoutUser();
  });

  ipcMain.handle('get-security-question', (event, data) => {
    return authService.getSecurityQuestion(data);
  });

  ipcMain.handle('reset-user-password', (event, data) => {
    return authService.resetUserPassword(data);
  });

  ipcMain.handle('update-security-question', (event, data) => {
    return authService.updateSecurityQuestion(data);
  });

  ipcMain.handle('change-password', (event, data) => {
    return authService.changePassword(data);
  });

  // ── Super Admin Audit & Control IPC ────────────────────────────────────────
  ipcMain.handle('admin-get-full-audit', (event, payload) => {
    return authService.adminGetFullAudit(payload);
  });

  ipcMain.handle('admin-reset-user-pin', (event, data) => {
    return authService.adminResetUserPin(data);
  });

  ipcMain.handle('admin-clear-user-session', (event, data) => {
    return authService.adminClearUserSession(data);
  });

  ipcMain.handle('admin-change-user-role', (event, data) => {
    return authService.adminChangeUserRole(data);
  });

  ipcMain.handle('admin-create-user', (event, data) => {
    return authService.adminCreateUser(data);
  });

  ipcMain.handle('admin-clear-store-session', (event, data) => {
    return authService.adminClearStoreSession(data);
  });

  ipcMain.handle('admin-delete-user-store', (event, data) => {
    return authService.adminDeleteUserStore(data);
  });

  // ── Cache & Session Cleaning IPC ───────────────────────────────────────────
  ipcMain.handle('get-cache-size', () => {
    return sessionService.getCacheSize();
  });

  ipcMain.handle('clear-safe-cache', (event, username) => {
    return sessionService.clearSafeCache(username);
  });

  ipcMain.handle('clear-store-cache', (event, data) => {
    return sessionService.clearStoreCache(data);
  });

  ipcMain.handle('deep-clean-store', (event, data) => {
    return sessionService.deepCleanStore(data);
  });

  ipcMain.handle('deep-clean-all', (event, username) => {
    return sessionService.deepCleanAll(username);
  });

  ipcMain.handle('prune-background-memory', () => {
    return sessionService.pruneBackgroundMemory();
  });

  // ── Scratchpad IPC ─────────────────────────────────────────────────────────
  ipcMain.handle('load-scratchpad-file', () => {
    return systemService.loadScratchpadFile(getMainWindow);
  });

  ipcMain.handle('save-scratchpad-file', (event, content) => {
    return systemService.saveScratchpadFile(content, getMainWindow);
  });

  // ── Hardware Metrics & Telemetry IPC ───────────────────────────────────────
  ipcMain.handle('get-app-path', () => {
    return app.getAppPath();
  });

  ipcMain.handle('get-app-memory-mb', () => {
    return systemService.getAppMemoryMB();
  });

  ipcMain.handle('get-app-metrics-details', () => {
    return systemService.getAppMetricsDetails();
  });

  ipcMain.handle('get-dev-mimicry-info', () => {
    const { chromeVersion, cleanChromeUserAgent, cleanFirefoxUserAgent, CHROME_CLIENT_HINTS } = require('../config/constants');
    return {
      isDev: !app.isPackaged,
      chromeVersion,
      cleanChromeUserAgent,
      cleanFirefoxUserAgent,
      clientHints: CHROME_CLIENT_HINTS,
      activeStealthSessionsCount: sessionService && sessionService.activeStealthSessions ? sessionService.activeStealthSessions.size : 0
    };
  });

  ipcMain.handle('submit-feedback', (event, data) => {
    return feedbackService.createTicket(data);
  });

  // ── 2-Way Feedback & Interactive Ticketing IPC ─────────────────────────────
  ipcMain.handle('feedback:get-tickets', () => {
    return feedbackService.getTickets();
  });

  ipcMain.handle('feedback:get-ticket', (event, ticketId) => {
    return feedbackService.getTicketDetails(ticketId);
  });

  ipcMain.handle('feedback:create-ticket', (event, data) => {
    return feedbackService.createTicket(data);
  });

  ipcMain.handle('feedback:add-reply', (event, ticketId, messageData) => {
    return feedbackService.addReply(ticketId, messageData);
  });

  ipcMain.handle('feedback:update-status', (event, ticketId, newStatus) => {
    return feedbackService.updateTicketStatus(ticketId, newStatus);
  });

  ipcMain.handle('feedback:sync', (event, force) => {
    return feedbackService.syncTickets(null, Boolean(force));
  });

  ipcMain.handle('feedback:mark-read', (event, ticketId) => {
    return feedbackService.markTicketAsRead(ticketId);
  });

  ipcMain.handle('feedback:get-unread-count', () => {
    return feedbackService.getUnreadFeedbackCount();
  });

  ipcMain.handle('capture-screen', () => {
    return systemService.captureScreen(getMainWindow);
  });

  ipcMain.handle('send-telemetry', (event, data) => {
    return systemService.sendTelemetry(data);
  });

  // ── Clipboard & Media Utilities IPC ───────────────────────────────────────
  ipcMain.handle('read-clipboard', async () => {
    try {
      const text = await clipboard.readText();
      return typeof text === 'string' ? text : '';
    } catch (e) {
      return '';
    }
  });

  ipcMain.handle('write-clipboard', async (event, text) => {
    try {
      await clipboard.writeText(text || '');
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('generate-qr-code', async (event, text, options = {}) => {
    try {
      if (!text || typeof text !== 'string') return null;
      return await QRCode.toDataURL(text, {
        width: options.width || 400,
        margin: options.margin || 2,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#ffffff'
        },
        errorCorrectionLevel: options.errorCorrectionLevel || 'H'
      });
    } catch (err) {
      console.error('[IPC] generate-qr-code error:', err);
      return null;
    }
  });

  ipcMain.handle('extract-text-from-image', async (event, imageUrl) => {
    return contextMenuService.copyTextFromImage(null, imageUrl, {}, getMainWindow);
  });

  ipcMain.handle('save-image-as', async (event, imageUrl) => {
    return contextMenuService.saveImageAs(null, imageUrl, getMainWindow);
  });

  ipcMain.handle('copy-image-to-clipboard', async (event, imageUrl) => {
    return contextMenuService.copyImage(null, imageUrl, {}, getMainWindow);
  });

  // ── Find In Page (Ctrl+F) Native IPC ───────────────────────────────────────
  ipcMain.handle('find-in-page', async (event, params = {}) => {
    try {
      const { wcId, text, forward = true, findNext = false, matchCase = false } = params;
      if (!text || typeof text !== 'string') return null;
      const electron = require('electron');
      let targetWc = null;
      if (wcId && electron.webContents) {
        targetWc = electron.webContents.fromId(Number(wcId));
      }
      if (!targetWc && electron.webContents) {
        const allWc = electron.webContents.getAllWebContents();
        targetWc = allWc.find(wc => wc.getType() === 'webview' && !wc.isDestroyed());
      }
      if (targetWc && !targetWc.isDestroyed()) {
        const reqId = targetWc.findInPage(text, {
          forward: Boolean(forward),
          findNext: Boolean(findNext),
          matchCase: Boolean(matchCase)
        });
        return reqId;
      }
    } catch (err) {
      console.warn('[IPC find-in-page] Error:', err);
    }
    return null;
  });

  ipcMain.handle('stop-find-in-page', async (event, params = {}) => {
    try {
      const { wcId, action = 'clearSelection' } = params;
      const electron = require('electron');
      let targetWc = null;
      if (wcId && electron.webContents) {
        targetWc = electron.webContents.fromId(Number(wcId));
      }
      if (!targetWc && electron.webContents) {
        const allWc = electron.webContents.getAllWebContents();
        targetWc = allWc.find(wc => wc.getType() === 'webview' && !wc.isDestroyed());
      }
      if (targetWc && !targetWc.isDestroyed()) {
        targetWc.stopFindInPage(action);
        try { targetWc.invalidate(); } catch (e) { }
        return true;
      }
    } catch (err) {
      console.warn('[IPC stop-find-in-page] Error:', err);
    }
    return false;
  });

  // ── Window Controls IPC ────────────────────────────────────────────────────
  ipcMain.on('window-minimize', () => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    } else {
      app.quit();
    }
  });

  ipcMain.on('flash-frame', (event, flag) => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(flag !== false);
    }
  });

  // ── DevTools & Debugging IPC ──────────────────────────────────────────────
  ipcMain.on('toggle-devtools', () => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // ── Auto Updater & Version Rollback IPC ──────────────────────────────────
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.on('check-for-updates', () => {
    updaterService.checkForUpdates(getMainWindow);
  });

  ipcMain.on('restart-to-update', () => {
    updaterService.restartToUpdate();
  });

  ipcMain.handle('get-release-history', async () => {
    return updaterService.fetchReleaseHistory();
  });

  ipcMain.handle('get-version-trail', () => {
    return storageService.recordVersionLaunch(app.getVersion());
  });

  ipcMain.handle('start-version-rollback', async (event, payload) => {
    const targetVer = payload?.version;
    const downloadUrl = payload?.downloadUrl;
    return updaterService.executeRollback(targetVer, downloadUrl, getMainWindow);
  });
}

module.exports = {
  registerIpcHandlers
};
