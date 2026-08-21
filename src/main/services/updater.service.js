/**
 * src/main/services/updater.service.js
 * Auto Updater lifecycle, event bindings, and Dev/Production checks
 */

const { app } = require('electron');

function getAutoUpdater() {
  const { autoUpdater } = require('electron-updater');
  return autoUpdater;
}

function setupAutoUpdater(getMainWindow) {
  const autoUpdater = getAutoUpdater();
  autoUpdater.removeAllListeners();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendUpdaterMessage = (payload) => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-message', payload);
    }
  };

  const sendUpdaterProgress = (payload) => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-progress', payload);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterMessage({
      status: 'checking',
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdaterMessage({
      status: 'available',
      version: info.version,
      currentVersion: app.getVersion(),
      releaseNotes: info.releaseNotes || null,
      releaseDate: info.releaseDate || null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdaterMessage({
      status: 'not-available',
      version: app.getVersion(),
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on('error', (err) => {
    sendUpdaterMessage({
      status: 'error',
      message: err.message || 'Terjadi kesalahan saat memeriksa update',
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdaterProgress({
      percent: Math.round(progressObj.percent || 0),
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
      bytesPerSecond: progressObj.bytesPerSecond || 0
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterMessage({
      status: 'downloaded',
      version: info.version,
      currentVersion: app.getVersion()
    });
  });
}

function checkForUpdates(getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;

  if (!app.isPackaged) {
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

  try {
    const autoUpdater = getAutoUpdater();
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
}

function restartToUpdate() {
  const autoUpdater = getAutoUpdater();
  autoUpdater.quitAndInstall();
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  restartToUpdate
};
