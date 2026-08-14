const { contextBridge, ipcRenderer } = require('electron');

// Expose API yang aman dari main process ke renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Store management
  getStores: (username) => ipcRenderer.invoke('get-stores', username),
  saveStores: (stores, username) => ipcRenderer.invoke('save-stores', stores, username),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getAppMemoryMB: () => ipcRenderer.invoke('get-app-memory-mb'),
  getAppMetrics: () => ipcRenderer.invoke('get-app-metrics-full'),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
  getUsers: () => ipcRenderer.invoke('get-users'),
  createUser: (data) => ipcRenderer.invoke('create-user', data),
  loginUser: (data) => ipcRenderer.invoke('login-user', data),
  getSecurityQuestion: (data) => ipcRenderer.invoke('get-security-question', data),
  resetUserPassword: (data) => ipcRenderer.invoke('reset-user-password', data),
  updateSecurityQuestion: (data) => ipcRenderer.invoke('update-security-question', data),
  changePassword: (data) => ipcRenderer.invoke('change-password', data),
  exportStoresConfig: (stores) => ipcRenderer.invoke('export-stores-config', stores),
  importStoresConfig: () => ipcRenderer.invoke('import-stores-config'),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  
  // Scratchpad
  loadScratchpadFile: () => ipcRenderer.invoke('load-scratchpad-file'),
  saveScratchpadFile: (content) => ipcRenderer.invoke('save-scratchpad-file', content),

  // Cache & Storage Management
  getCacheSize: () => ipcRenderer.invoke('get-cache-size'),
  clearSafeCache: () => ipcRenderer.invoke('clear-safe-cache'),
  clearStoreCache: (data) => ipcRenderer.invoke('clear-store-cache', data),
  deepCleanStore: (data) => ipcRenderer.invoke('deep-clean-store', data),
  deepCleanAll: () => ipcRenderer.invoke('deep-clean-all'),

  // Auto Updater
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartToUpdate: () => ipcRenderer.send('restart-to-update'),
  onUpdaterMessage: (callback) => ipcRenderer.on('updater-message', (_event, value) => callback(value)),
  onUpdaterProgress: (callback) => ipcRenderer.on('updater-progress', (_event, value) => callback(value))
});

