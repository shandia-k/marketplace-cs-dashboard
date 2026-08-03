const { contextBridge, ipcRenderer } = require('electron');

// Expose API yang aman dari main process ke renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Store management
  getStores: () => ipcRenderer.invoke('get-stores'),
  saveStores: (stores) => ipcRenderer.invoke('save-stores', stores),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getAppMemoryMB: () => ipcRenderer.invoke('get-app-memory-mb'),
  getAppMetrics: () => ipcRenderer.invoke('get-app-metrics-full'),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
  exportStoresConfig: (stores) => ipcRenderer.invoke('export-stores-config', stores),
  importStoresConfig: () => ipcRenderer.invoke('import-stores-config'),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  
  // Scratchpad
  loadScratchpadFile: () => ipcRenderer.invoke('load-scratchpad-file'),
  saveScratchpadFile: (content) => ipcRenderer.invoke('save-scratchpad-file', content),

  // Auto Updater
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartToUpdate: () => ipcRenderer.send('restart-to-update'),
  onUpdaterMessage: (callback) => ipcRenderer.on('updater-message', (_event, value) => callback(value)),
  onUpdaterProgress: (callback) => ipcRenderer.on('updater-progress', (_event, value) => callback(value))
});

