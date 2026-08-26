/**
 * src/main/services/system.service.js
 * Hardware metrics, document IO (xlsx, docx, txt), feedback submission, screenshot, telemetry, and clipboard
 */

const { app, dialog, clipboard, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const docx = require('docx');
const { readStores } = require('./storage.service');
const { getActiveSession } = require('./auth.service');

function getAppMemoryMB() {
  try {
    const metrics = app.getAppMetrics();
    if (metrics && metrics.length > 0) {
      const totalKB = metrics.reduce((sum, m) => sum + (m.memory?.privateBytes || m.memory?.workingSetSize || 0), 0);
      return totalKB / 1024;
    }
  } catch (e) {}
  return 0;
}

function getAppMetricsDetails() {
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
}

async function loadScratchpadFile(getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
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
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      content = data.map(row => (Array.isArray(row) ? row.map(cell => (cell !== null && cell !== undefined ? String(cell) : '')).join('\t') : String(row))).join('\n');
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    }
    return { content, fileName: path.basename(filePath) };
  } catch (err) {
    throw new Error('Gagal membaca file: ' + err.message);
  }
}

async function saveScratchpadFile(content, getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
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
      const wb = xlsx.utils.book_new();
      const data = (content || '').split('\n').map(line => line.split('\t'));
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'Catatan');
      xlsx.writeFile(wb, filePath);
    } else if (ext === '.docx') {
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
}

async function exportStoresConfig(stores, getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
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
}

async function importStoresConfig(getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
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
    parsed.forEach(s => {
      if (!s.id || !s.name || !s.marketplace) throw new Error('Data toko tidak lengkap.');
    });
    return parsed;
  } catch (err) {
    throw new Error('Gagal impor: ' + err.message);
  }
}

async function submitFeedback(data) {
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyZ9Vh5b71X50NbOURsA2snf4afRUetg1f0oUdQWk33Z6M6BUmk8TwBkr-JisXszxSr/exec";

  if (!GAS_WEB_APP_URL) {
    return { success: true, message: "Server Proxy belum diatur, namun pengumpulan data berhasil." };
  }

  try {
    const systemInfo = `
OS: ${os.type()} ${os.release()} (${os.arch()})
Node: ${process.versions.node} | Electron: ${process.versions.electron}
App Version: ${app.getVersion()}
Free RAM: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
    `.trim();

    let cleanStoresSummary = Array.isArray(data.storesConfig) ? data.storesConfig.map(s => ({
      marketplace: s.marketplace || 'custom',
      name: (s.name || '').substring(0, 30)
    })) : [];

    const activeSession = getActiveSession();
    if (cleanStoresSummary.length === 0 && activeSession && activeSession.username) {
      try {
        const userStores = readStores(activeSession.username);
        if (Array.isArray(userStores)) {
          cleanStoresSummary = userStores.map(s => ({
            marketplace: s.marketplace || 'custom',
            name: (s.name || '').substring(0, 30)
          }));
        }
      } catch (e) {
        console.warn('Fallback readStores for feedback failed:', e);
      }
    }

    const cleanImages = Array.isArray(data.images) ? data.images.slice(0, 4).map((img, idx) => ({
      name: String(img.name || `gambar_${idx + 1}.jpg`).substring(0, 50),
      base64: typeof img.base64 === 'string' ? img.base64 : '',
      mimeType: img.mimeType || 'image/jpeg'
    })).filter(img => img.base64 && img.base64.length > 50) : [];

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: String(data.type || 'FEEDBACK').toUpperCase(),
        message: String(data.message || '').substring(0, 5000),
        systemInfo: systemInfo,
        storeCount: cleanStoresSummary.length,
        marketplaces: cleanStoresSummary.map(s => s.marketplace).join(', '),
        storesConfig: cleanStoresSummary,
        images: cleanImages
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
}

async function captureScreen(getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Window tidak tersedia' };
    }
    const nativeImage = await mainWindow.webContents.capturePage();
    if (!nativeImage || nativeImage.isEmpty()) {
      return { success: false, error: 'Gagal mengambil tangkapan layar' };
    }
    const jpegBuffer = nativeImage.toJPEG(80);
    const dataUrl = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
    return {
      success: true,
      dataUrl,
      width: nativeImage.getSize().width,
      height: nativeImage.getSize().height
    };
  } catch (err) {
    console.error('Error capturing screen:', err);
    return { success: false, error: err.message };
  }
}

async function sendTelemetry(data) {
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyZ9Vh5b71X50NbOURsA2snf4afRUetg1f0oUdQWk33Z6M6BUmk8TwBkr-JisXszxSr/exec";

  if (!GAS_WEB_APP_URL) return { success: false, message: 'URL belum diatur' };

  try {
    const systemInfo = `${os.type()} ${os.release()} (${os.arch()}) | RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`;

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'TELEMETRY',
        type: 'TELEMETRY',
        username: data.username || 'cs',
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

    // ── PIGGYBACK SYNC: Jika respons telemetri membawa tiket terbaru, merge langsung ──
    let newDevReplies = [];
    if (respJson && respJson.success && Array.isArray(respJson.tickets)) {
      try {
        const feedbackService = require('./feedback.service');
        const mergeRes = feedbackService.mergeRemoteTicketsDirectly(respJson.tickets);
        newDevReplies = mergeRes.newDevReplies || [];
      } catch (mergeErr) {
        console.warn('[Telemetry Piggyback Merge Error]:', mergeErr);
      }
    }

    return { 
      success: response.ok, 
      data: respJson,
      newDevReplies: newDevReplies
    };
  } catch (error) {
    console.error('[Telemetry Error]:', error);
    return { success: false, error: error.message };
  }
}

let lastClipboardText = '';
function setupClipboardWatcher(getMainWindow) {
  const checkClipboardNow = async () => {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isFocused()) return;
    try {
      const raw = await clipboard.readText();
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (text && text !== lastClipboardText) {
        lastClipboardText = text;
        mainWindow.webContents.send('clipboard-changed', text);
      }
    } catch (e) {}
  };

  const intervalId = setInterval(checkClipboardNow, 350);
  if (intervalId && typeof intervalId.unref === 'function') intervalId.unref();
  return {
    checkClipboardNow,
    intervalId
  };
}

module.exports = {
  getAppMemoryMB,
  getAppMetricsDetails,
  loadScratchpadFile,
  saveScratchpadFile,
  exportStoresConfig,
  importStoresConfig,
  submitFeedback,
  captureScreen,
  sendTelemetry,
  setupClipboardWatcher
};
