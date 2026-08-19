const { contextBridge, ipcRenderer } = require('electron');

// Expose API yang aman dari main process ke renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Store management
  getStores: (username) => ipcRenderer.invoke('get-stores', username),
  saveStores: (stores, username) => ipcRenderer.invoke('save-stores', stores, username),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getAppMemoryMB: () => ipcRenderer.invoke('get-app-memory-mb'),
  getAppMetricsDetails: () => ipcRenderer.invoke('get-app-metrics-details'),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
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

  // Auto Updater
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartToUpdate: () => ipcRenderer.send('restart-to-update'),
  onUpdaterMessage: (callback) => ipcRenderer.on('updater-message', (_event, value) => callback(value)),
  onUpdaterProgress: (callback) => ipcRenderer.on('updater-progress', (_event, value) => callback(value)),

  // Crash Guard Lifecycle & Tab Manager
  onWebviewRenderProcessGone: (callback) => ipcRenderer.on('webview-render-process-gone', (_event, value) => callback(value)),
  onWebviewOpenNewTab: (callback) => ipcRenderer.on('webview-open-new-tab', (_event, value) => callback(value))
});

