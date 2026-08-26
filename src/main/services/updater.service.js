/**
 * src/main/services/updater.service.js
 * Auto Updater lifecycle, event bindings, and Dev/Production checks
 */

const { app } = require('electron');

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const storageService = require('./storage.service');

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
  try {
    const electron = require('electron');
    if (electron.session?.defaultSession) {
      try { electron.session.defaultSession.flushStorageData(); } catch (e) {}
    }
    const wins = electron.BrowserWindow ? electron.BrowserWindow.getAllWindows() : [];
    wins.forEach(w => {
      try {
        if (!w.isDestroyed()) w.destroy();
      } catch (e) { }
    });
  } catch (e) { }
  const autoUpdater = getAutoUpdater();
  autoUpdater.quitAndInstall(false, true);
}

async function fetchReleaseHistory() {
  const currentVersion = app.getVersion();
  const repoOwner = 'shandia-k';
  const repoName = 'marketplace-cs-dashboard';
  const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`;

  let githubReleases = [];
  try {
    const res = await fetch(githubApiUrl, {
      headers: {
        'User-Agent': 'CS-Marketplace-Dashboard-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (res.ok) {
      githubReleases = await res.json();
    }
  } catch (err) {
    console.warn('[Updater] Could not fetch GitHub releases directly:', err.message);
  }

  // Load versions from registry as baseline / fallback
  let localRegistry = [];
  try {
    const versionsRegistry = require('../../../js/versions-registry.js');
    if (typeof versionsRegistry.getAllVersions === 'function') {
      localRegistry = versionsRegistry.getAllVersions();
    }
  } catch (e) {}

  const releaseMap = new Map();

  // 1. Populate from local registry
  localRegistry.forEach(v => {
    const ver = v.version;
    const downloadUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/v${ver}/CS.Marketplace.Dashboard.Setup.${ver}.exe`;
    releaseMap.set(ver, {
      version: ver,
      tagName: `v${ver}`,
      name: v.title || `Versi ${ver}`,
      releaseNotes: v.categories ? v.categories.map(c => `### ${c.category || c.name || 'Pembaruan'}\n${(c.items || []).map(i => '- ' + (i.text || i)).join('\n')}`).join('\n\n') : (v.tagline || ''),
      publishedAt: v.releaseDate || v.date || '',
      isLatest: ver === currentVersion,
      downloadUrl: downloadUrl,
      fileName: `CS-Marketplace-Dashboard-Setup-${ver}.exe`,
      fileSizeMB: 85
    });
  });

  // 2. Enhance with live GitHub release data if available
  if (Array.isArray(githubReleases)) {
    githubReleases.forEach(rel => {
      const ver = (rel.tag_name || '').replace(/^v/, '');
      if (!ver) return;

      const exeAsset = (rel.assets || []).find(a => (a.name || '').endsWith('.exe'));
      const downloadUrl = exeAsset ? exeAsset.browser_download_url : `https://github.com/${repoOwner}/${repoName}/releases/download/v${ver}/CS.Marketplace.Dashboard.Setup.${ver}.exe`;
      const sizeMB = exeAsset ? +(exeAsset.size / (1024 * 1024)).toFixed(1) : 85;

      const existing = releaseMap.get(ver) || {};
      releaseMap.set(ver, {
        version: ver,
        tagName: rel.tag_name || `v${ver}`,
        name: rel.name || existing.name || `Versi ${ver}`,
        releaseNotes: rel.body || existing.releaseNotes || '',
        publishedAt: rel.published_at || existing.publishedAt || '',
        isLatest: ver === currentVersion,
        downloadUrl: downloadUrl,
        fileName: exeAsset ? exeAsset.name : (existing.fileName || `CS-Marketplace-Dashboard-Setup-${ver}.exe`),
        fileSizeMB: sizeMB
      });
    });
  }

  const result = Array.from(releaseMap.values());
  return result;
}

function downloadFileWithProgress(fileUrl, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    
    function requestUrl(url) {
      https.get(url, { headers: { 'User-Agent': 'CS-Marketplace-Dashboard-App' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return requestUrl(res.headers.location);
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Server returned HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let transferredBytes = 0;

        res.on('data', (chunk) => {
          transferredBytes += chunk.length;
          if (totalBytes > 0 && typeof onProgress === 'function') {
            const pct = (transferredBytes / totalBytes) * 100;
            onProgress(pct, transferredBytes, totalBytes);
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destPath));
        });
      }).on('error', (err) => {
        fileStream.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    requestUrl(fileUrl);
  });
}

async function executeRollback(targetVersion, downloadUrl, getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
  const currentVersion = app.getVersion();

  const sendProgress = (payload) => {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.send('rollback-progress', payload);
    }
  };

  try {
    sendProgress({
      status: 'verifying',
      percent: 5,
      message: `Mempersiapkan rollback ke versi v${targetVersion}...`
    });

    // 1. Emergency state snapshot
    const snapshotRes = storageService.createEmergencyRollbackSnapshot(currentVersion, targetVersion);
    if (snapshotRes.success) {
      console.log('[Rollback Guard] Emergency snapshot created at:', snapshotRes.snapshotPath);
    }

    sendProgress({
      status: 'downloading',
      percent: 15,
      message: `Mengunduh file paket instalasi v${targetVersion}...`
    });

    if (!app.isPackaged) {
      // In development mode: simulate download progress and report success
      for (let p = 20; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 150));
        sendProgress({
          status: p === 100 ? 'ready' : 'downloading',
          percent: p,
          message: p === 100 ? 'Simulasi rollback dev selesai. Snapshot data aman.' : `Mengunduh installer... ${p}%`
        });
      }
      return { success: true, isDev: true, snapshot: snapshotRes };
    }

    const tempDir = app.getPath('temp');
    const installerPath = path.join(tempDir, `rollback_installer_v${targetVersion}.exe`);

    const finalUrl = downloadUrl || `https://github.com/shandia-k/marketplace-cs-dashboard/releases/download/v${targetVersion}/CS.Marketplace.Dashboard.Setup.${targetVersion}.exe`;
    
    await downloadFileWithProgress(finalUrl, installerPath, (percent, transferred, total) => {
      sendProgress({
        status: 'downloading',
        percent: Math.min(95, Math.max(15, Math.round(percent))),
        transferredBytes: transferred,
        totalBytes: total,
        message: `Mengunduh installer (${Math.round(percent)}%)...`
      });
    });

    sendProgress({
      status: 'ready',
      percent: 100,
      message: `Installer v${targetVersion} siap. Membuka installer dan menutup aplikasi...`
    });

    setTimeout(() => {
      try {
        const child = spawn(installerPath, [], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } catch (spawnErr) {
        console.error('Failed to spawn rollback installer:', spawnErr);
      }
      setTimeout(() => {
        try { app.quit(); } catch (e) {}
        setTimeout(() => {
          try { app.exit(0); } catch (e) { process.exit(0); }
        }, 300).unref();
      }, 500);
    }, 1200);

    return { success: true, installerPath, snapshot: snapshotRes };
  } catch (err) {
    console.error('Execute rollback error:', err);
    sendProgress({
      status: 'error',
      percent: 0,
      message: 'Gagal melakukan rollback: ' + err.message
    });
    return { success: false, error: err.message };
  }
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  restartToUpdate,
  fetchReleaseHistory,
  executeRollback
};
