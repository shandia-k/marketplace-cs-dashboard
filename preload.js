const { contextBridge, ipcRenderer } = require('electron');

// Expose API yang aman dari main process ke renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Store management
  getStores: (username) => ipcRenderer.invoke('get-stores', username),
  saveStores: (stores, username) => ipcRenderer.invoke('save-stores', stores, username),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getAppMemoryMB: () => ipcRenderer.invoke('get-app-memory-mb'),
  getAppMetricsDetails: () => ipcRenderer.invoke('get-app-metrics-details'),
  getDevMimicryInfo: () => ipcRenderer.invoke('get-dev-mimicry-info'),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
  
  // 2-Way Interactive Feedback & Ticketing
  feedback: {
    getTickets: () => ipcRenderer.invoke('feedback:get-tickets'),
    getTicket: (ticketId) => ipcRenderer.invoke('feedback:get-ticket', ticketId),
    createTicket: (data) => ipcRenderer.invoke('feedback:create-ticket', data),
    addReply: (ticketId, messageData) => ipcRenderer.invoke('feedback:add-reply', ticketId, messageData),
    updateStatus: (ticketId, newStatus) => ipcRenderer.invoke('feedback:update-status', ticketId, newStatus),
    sync: (force = false) => ipcRenderer.invoke('feedback:sync', force),
    markRead: (ticketId) => ipcRenderer.invoke('feedback:mark-read', ticketId),
    getUnreadCount: () => ipcRenderer.invoke('feedback:get-unread-count')
  },
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  sendTelemetry: (data) => ipcRenderer.invoke('send-telemetry', data),
  getUsers: () => ipcRenderer.invoke('get-users'),
  getUserProfile: (username) => ipcRenderer.invoke('get-user-profile', username),
  createUser: (data) => ipcRenderer.invoke('create-user', data),
  updateUserProfile: (data) => ipcRenderer.invoke('update-user-profile', data),
  deleteUser: (data) => ipcRenderer.invoke('delete-user', data),
  adminGetFullAudit: (data) => ipcRenderer.invoke('admin-get-full-audit', data),
  adminClearStoreSession: (data) => ipcRenderer.invoke('admin-clear-store-session', data),
  adminDeleteUserStore: (data) => ipcRenderer.invoke('admin-delete-user-store', data),
  adminResetUserPin: (data) => ipcRenderer.invoke('admin-reset-user-pin', data),
  adminClearUserSession: (data) => ipcRenderer.invoke('admin-clear-user-session', data),
  adminChangeUserRole: (data) => ipcRenderer.invoke('admin-change-user-role', data),
  adminCreateUser: (data) => ipcRenderer.invoke('admin-create-user', data),
  verifyUserPin: (data) => ipcRenderer.invoke('verify-user-pin', data),
  loginUser: (data) => ipcRenderer.invoke('login-user', data),
  logoutUser: () => ipcRenderer.invoke('logout-user'),
  getSecurityQuestion: (data) => ipcRenderer.invoke('get-security-question', data),
  resetUserPassword: (data) => ipcRenderer.invoke('reset-user-password', data),
  updateSecurityQuestion: (data) => ipcRenderer.invoke('update-security-question', data),
  changePassword: (data) => ipcRenderer.invoke('change-password', data),
  exportStoresConfig: (stores) => ipcRenderer.invoke('export-stores-config', stores),
  importStoresConfig: () => ipcRenderer.invoke('import-stores-config'),
  searchUrls: (query) => ipcRenderer.invoke('search-urls', query),
  vaultEncrypt: (text) => ipcRenderer.invoke('vault-encrypt', text),
  vaultDecrypt: (cipher, host) => ipcRenderer.invoke('vault-decrypt', cipher, host),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  flashWindow: (flag) => ipcRenderer.send('flash-frame', flag),
  
  // Scratchpad
  loadScratchpadFile: () => ipcRenderer.invoke('load-scratchpad-file'),
  saveScratchpadFile: (content) => ipcRenderer.invoke('save-scratchpad-file', content),

  // Clipboard Helper (Smart Template)
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text),
  onClipboardChanged: (callback) => ipcRenderer.on('clipboard-changed', (_event, value) => callback(value)),

  // Cache & Storage Management
  getCacheSize: () => ipcRenderer.invoke('get-cache-size'),
  clearSafeCache: (username) => ipcRenderer.invoke('clear-safe-cache', username),
  clearStoreCache: (data) => ipcRenderer.invoke('clear-store-cache', data),
  deepCleanStore: (data) => ipcRenderer.invoke('deep-clean-store', data),
  deepCleanAll: (username) => ipcRenderer.invoke('deep-clean-all', username),
  pruneBackgroundMemory: () => ipcRenderer.invoke('prune-background-memory'),

  // Auto Updater & Version Rollback
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartToUpdate: () => ipcRenderer.send('restart-to-update'),
  onUpdaterMessage: (callback) => ipcRenderer.on('updater-message', (_event, value) => callback(value)),
  onUpdaterProgress: (callback) => ipcRenderer.on('updater-progress', (_event, value) => callback(value)),
  getReleaseHistory: () => ipcRenderer.invoke('get-release-history'),
  getVersionTrail: () => ipcRenderer.invoke('get-version-trail'),
  startVersionRollback: (payload) => ipcRenderer.invoke('start-version-rollback', payload),
  onRollbackProgress: (callback) => ipcRenderer.on('rollback-progress', (_event, value) => callback(value)),

  // Crash Guard Lifecycle, Navigation & Tab Manager
  onWebviewRenderProcessGone: (callback) => ipcRenderer.on('webview-render-process-gone', (_event, value) => callback(value)),
  onWebviewOpenNewTab: (callback) => ipcRenderer.on('webview-open-new-tab', (_event, value) => callback(value)),
  onOpenNewTab: (callback) => ipcRenderer.on('webview-open-new-tab', (_event, value) => callback(value)),
  onDiagnosticBreadcrumb: (callback) => ipcRenderer.on('diagnostic-breadcrumb', (_event, value) => callback(value)),

  // Image Context Menu & Media Toolset
  saveImageAs: (imageUrl) => ipcRenderer.invoke('save-image-as', imageUrl),
  copyImageToClipboard: (imageUrl) => ipcRenderer.invoke('copy-image-to-clipboard', imageUrl),
  extractTextFromImage: (imageUrl) => ipcRenderer.invoke('extract-text-from-image', imageUrl),
  generateQrCode: (text, options) => ipcRenderer.invoke('generate-qr-code', text, options),
  onShowToastMessage: (callback) => ipcRenderer.on('show-toast-message', (_event, value) => callback(value)),
  onShowImageQrModal: (callback) => ipcRenderer.on('show-image-qr-modal', (_event, value) => callback(value)),
  onShowOcrResultModal: (callback) => ipcRenderer.on('show-ocr-result-modal', (_event, value) => callback(value)),

  // Find In Page (Ctrl+F) & Debugging
  findInPage: (params) => ipcRenderer.invoke('find-in-page', params),
  stopFindInPage: (params) => ipcRenderer.invoke('stop-find-in-page', params),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  onFoundInPageResult: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('found-in-page-result', listener);
    return () => ipcRenderer.removeListener('found-in-page-result', listener);
  },
  onTriggerFindInPage: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('trigger-find-in-page', listener);
    return () => ipcRenderer.removeListener('trigger-find-in-page', listener);
  },
  onTriggerCloseFindInPage: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('trigger-close-find-in-page', listener);
    return () => ipcRenderer.removeListener('trigger-close-find-in-page', listener);
  }
});

