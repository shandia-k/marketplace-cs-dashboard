/**
 * src/main/services/context-menu.service.js
 * Comprehensive Right-Click Context Menu Service for Webviews & Main Window
 * Features:
 * 1. Open image in new tab
 * 2. Save image as...
 * 3. Copy image
 * 4. Copy image address
 * 5. Copy Text From Image (OCR via tesseract.js)
 * 6. Create QR Code for this image (via qrcode)
 * 7. Standard Text & Input Editing (Cut, Copy, Paste, Select All)
 */

const { Menu, MenuItem, clipboard, dialog, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { createWorker } = require('tesseract.js');
const { cleanChromeUserAgent } = require('../config/constants');

let tesseractWorkerPromise = null;

/**
 * Mendapatkan worker Tesseract OCR (lazy-loaded singleton untuk performa cepat)
 */
async function getTesseractWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      try {
        const worker = await createWorker(['eng', 'ind']);
        return worker;
      } catch (err) {
        console.error('[OCR Service] Failed to initialize primary worker:', err);
        // Fallback to English only if multilingual bundle is unavailable
        try {
          const fallbackWorker = await createWorker('eng');
          return fallbackWorker;
        } catch (e2) {
          console.error('[OCR Service] Fallback worker failed:', e2);
          tesseractWorkerPromise = null;
          throw e2;
        }
      }
    })();
  }
  return tesseractWorkerPromise;
}

/**
 * Cek apakah target klik kanan adalah gambar
 */
function isImageUrl(srcUrl, mediaType = '', hasImageContents = false) {
  if (mediaType === 'image' || hasImageContents) return true;
  if (!srcUrl || typeof srcUrl !== 'string') return false;
  const clean = srcUrl.trim().toLowerCase();
  if (clean.startsWith('data:image/')) return true;
  if (clean.startsWith('blob:')) return true;
  return /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif|tiff)(\?.*)?$/i.test(clean);
}

/**
 * Tentukan nama file yang sesuai untuk gambar yang diunduh
 */
function suggestFilenameFromUrl(srcUrl, buffer = null) {
  let defaultExt = '.png';

  // Deteksi ekstensi dari magic bytes jika ada buffer
  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 4) {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      defaultExt = '.jpg';
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      defaultExt = '.png';
    } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      defaultExt = '.gif';
    } else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      defaultExt = '.webp';
    } else if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
      defaultExt = '.bmp';
    }
  }

  if (!srcUrl || typeof srcUrl !== 'string') {
    return `image_${Date.now()}${defaultExt}`;
  }

  // Jika Data URL, deteksi mime type
  if (srcUrl.startsWith('data:image/')) {
    const mimeMatch = srcUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    if (mimeMatch) {
      const sub = mimeMatch[1].toLowerCase();
      if (sub.includes('jpeg') || sub.includes('jpg')) defaultExt = '.jpg';
      else if (sub.includes('webp')) defaultExt = '.webp';
      else if (sub.includes('gif')) defaultExt = '.gif';
      else if (sub.includes('svg')) defaultExt = '.svg';
      else if (sub.includes('bmp')) defaultExt = '.bmp';
      else defaultExt = '.png';
    }
    return `image_${Date.now()}${defaultExt}`;
  }

  try {
    const parsed = new URL(srcUrl);
    const pathname = parsed.pathname || '';
    const basename = path.basename(pathname);
    if (basename && basename.includes('.')) {
      const cleanName = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
      return cleanName.length > 60 ? cleanName.substring(0, 56) + defaultExt : cleanName;
    }
  } catch (e) { }

  return `image_${Date.now()}${defaultExt}`;
}

/**
 * Ekstraksi buffer biner gambar dari URL (Mendukung data:, blob:, http:, https:, file:)
 */
async function extractImageBuffer(contents, srcUrl, coords = {}) {
  if (!srcUrl) return null;

  // 1. Data URL (Base64)
  if (srcUrl.startsWith('data:image/')) {
    try {
      const parts = srcUrl.split(',');
      if (parts.length > 1) {
        return Buffer.from(parts[1], 'base64');
      }
    } catch (e) {
      console.error('[Context Menu] Failed to decode base64 data URL:', e);
    }
  }

  // 2. Blob URL
  if (srcUrl.startsWith('blob:') && contents && !contents.isDestroyed()) {
    try {
      const base64Data = await contents.executeJavaScript(`
        (async () => {
          try {
            const res = await fetch("${srcUrl}");
            const blob = await res.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            return null;
          }
        })()
      `);

      if (base64Data && typeof base64Data === 'string' && base64Data.startsWith('data:')) {
        const parts = base64Data.split(',');
        if (parts.length > 1) {
          return Buffer.from(parts[1], 'base64');
        }
      }
    } catch (e) {
      console.error('[Context Menu] Failed to extract blob URL buffer:', e);
    }
  }

  // 3. HTTP / HTTPS / File
  if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://') || srcUrl.startsWith('file://')) {
    // Gunakan contents.session.fetch jika tersedia agar session cookie & auth marketplace terbawa
    try {
      const fetchFunc = (contents && contents.session && typeof contents.session.fetch === 'function')
        ? contents.session.fetch.bind(contents.session)
        : fetch;

      const resp = await fetchFunc(srcUrl, {
        headers: {
          'User-Agent': cleanChromeUserAgent,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (resp && (resp.ok || resp.status === 200)) {
        const arrayBuf = await resp.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (e) {
      console.warn('[Context Menu] Session fetch image failed, trying standard fetch:', e.message);
      try {
        const fallbackResp = await fetch(srcUrl);
        if (fallbackResp.ok) {
          const arrayBuf = await fallbackResp.arrayBuffer();
          return Buffer.from(arrayBuf);
        }
      } catch (err2) {
        console.error('[Context Menu] All fetch attempts failed for image URL:', err2.message);
      }
    }
  }

  return null;
}

/**
 * Helper untuk mengirim notifikasi toast ke jendela utama renderer
 */
function notifyRenderer(getMainWindow, message, type = '') {
  try {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-toast-message', { message, type });
    }
  } catch (e) { }
}

/**
 * 1. Open image in new tab
 */
function openImageInNewTab(contents, srcUrl, getMainWindow) {
  if (!srcUrl) return;
  try {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('webview-open-new-tab', {
        wcId: contents ? contents.id : null,
        url: srcUrl
      });
    }
  } catch (e) {
    console.error('[Context Menu] Failed to open image in new tab:', e);
  }
}

/**
 * 2. Save image as...
 */
async function saveImageAs(contents, srcUrl, getMainWindow) {
  if (!srcUrl) return;
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;

  try {
    notifyRenderer(getMainWindow, 'Mengunduh gambar untuk disimpan...', '');
    const buffer = await extractImageBuffer(contents, srcUrl);
    if (!buffer) {
      notifyRenderer(getMainWindow, 'Gagal mengambil data gambar.', 'error');
      return;
    }

    const defaultFilename = suggestFilenameFromUrl(srcUrl, buffer);
    const downloadsDir = app.getPath('downloads');
    const defaultPath = path.join(downloadsDir, defaultFilename);

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Simpan Gambar Sebagai...',
      defaultPath: defaultPath,
      filters: [
        { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!canceled && filePath) {
      await fs.promises.writeFile(filePath, buffer);
      notifyRenderer(getMainWindow, `✅ Gambar berhasil disimpan ke ${path.basename(filePath)}`, 'success');
    }
  } catch (err) {
    console.error('[Context Menu] Failed to save image:', err);
    notifyRenderer(getMainWindow, `Gagal menyimpan gambar: ${err.message}`, 'error');
  }
}

/**
 * 3. Copy image (Copy Bitmap to Clipboard)
 */
async function copyImage(contents, srcUrl, coords = {}, getMainWindow) {
  try {
    // 1. Coba salin langsung dari internal buffer Chromium jika koordinat tersedia
    if (contents && typeof contents.copyImageAt === 'function' && typeof coords.x === 'number' && typeof coords.y === 'number') {
      try {
        contents.copyImageAt(coords.x, coords.y);
        notifyRenderer(getMainWindow, '✅ Gambar berhasil disalin ke clipboard!', 'success');
        return;
      } catch (e) { }
    }

    // 2. Ekstraksi buffer biner dan konversi ke nativeImage
    const buffer = await extractImageBuffer(contents, srcUrl, coords);
    if (buffer) {
      const img = nativeImage.createFromBuffer(buffer);
      if (!img.isEmpty()) {
        clipboard.writeImage(img);
        notifyRenderer(getMainWindow, '✅ Gambar berhasil disalin ke clipboard!', 'success');
        return;
      }
    }

    notifyRenderer(getMainWindow, 'Gagal menyalin gambar ke clipboard.', 'error');
  } catch (err) {
    console.error('[Context Menu] Error copying image to clipboard:', err);
    notifyRenderer(getMainWindow, 'Gagal menyalin gambar ke clipboard.', 'error');
  }
}

/**
 * 4. Copy image address
 */
function copyImageAddress(srcUrl, getMainWindow) {
  if (!srcUrl) return;
  try {
    clipboard.writeText(srcUrl);
    notifyRenderer(getMainWindow, '✅ Tautan gambar berhasil disalin!', 'success');
  } catch (e) {
    console.error('[Context Menu] Failed to copy image URL:', e);
  }
}

/**
 * 5. Copy Text From Image (OCR Extraction)
 */
async function copyTextFromImage(contents, srcUrl, coords = {}, getMainWindow) {
  if (!srcUrl) return;
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;

  try {
    notifyRenderer(getMainWindow, '🔍 Sedang membaca teks dari gambar (OCR)...', '');

    const buffer = await extractImageBuffer(contents, srcUrl, coords);
    if (!buffer) {
      notifyRenderer(getMainWindow, 'Gagal mengambil gambar untuk dipindai OCR.', 'error');
      return;
    }

    const worker = await getTesseractWorker();
    const result = await worker.recognize(buffer);
    const rawText = result && result.data && result.data.text ? result.data.text : '';
    const cleanText = rawText.trim();

    if (cleanText.length > 0) {
      // Salin langsung ke clipboard
      clipboard.writeText(cleanText);
      
      const charCount = cleanText.length;
      notifyRenderer(getMainWindow, `✅ Teks berhasil disalin dari gambar (${charCount} karakter)!`, 'success');

      // Buka modal dialog preview teks di dashboard agar CS bisa melihat/mengedit teks
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('show-ocr-result-modal', {
          text: cleanText,
          imageUrl: srcUrl
        });
      }
    } else {
      notifyRenderer(getMainWindow, 'ℹ️ Tidak ada teks yang terdeteksi pada gambar ini.', 'info');
    }
  } catch (err) {
    console.error('[Context Menu] OCR extraction error:', err);
    notifyRenderer(getMainWindow, `Gagal memindai teks dari gambar: ${err.message}`, 'error');
  }
}

/**
 * 6. Create QR Code for this image
 */
async function createQrCodeForImage(srcUrl, getMainWindow) {
  if (!srcUrl) return;
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;

  try {
    // Generate QR Code data URL resolusi tinggi
    const qrDataUrl = await QRCode.toDataURL(srcUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-image-qr-modal', {
        imageUrl: srcUrl,
        qrDataUrl: qrDataUrl
      });
    }
  } catch (err) {
    console.error('[Context Menu] QR Code generation error:', err);
    notifyRenderer(getMainWindow, `Gagal membuat QR Code: ${err.message}`, 'error');
  }
}

/**
 * Bangun dan tampilkan Context Menu saat klik kanan
 */
function showContextMenu(contents, params, getMainWindow) {
  const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
  const isImg = isImageUrl(params.srcURL, params.mediaType, params.hasImageContents);
  const menu = new Menu();

  if (isImg && params.srcURL) {
    // ── 6 Menu Item Khusus Gambar (Sesuai Desain Diminta) ──────────────────
    menu.append(new MenuItem({
      label: 'Open image in new tab',
      click: () => openImageInNewTab(contents, params.srcURL, getMainWindow)
    }));

    menu.append(new MenuItem({
      label: 'Save image as...',
      click: () => saveImageAs(contents, params.srcURL, getMainWindow)
    }));

    menu.append(new MenuItem({
      label: 'Copy image',
      click: () => copyImage(contents, params.srcURL, { x: params.x, y: params.y }, getMainWindow)
    }));

    menu.append(new MenuItem({
      label: 'Copy image address',
      click: () => copyImageAddress(params.srcURL, getMainWindow)
    }));

    menu.append(new MenuItem({
      label: 'Copy Text From Image',
      click: () => copyTextFromImage(contents, params.srcURL, { x: params.x, y: params.y }, getMainWindow)
    }));

    menu.append(new MenuItem({
      label: 'Create QR Code for this image',
      click: () => createQrCodeForImage(params.srcURL, getMainWindow)
    }));

    // Jika gambar ini juga berada di dalam hyperlink <a>
    if (params.linkURL) {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Buka Tautan di Tab Baru',
        click: () => openImageInNewTab(contents, params.linkURL, getMainWindow)
      }));
      menu.append(new MenuItem({
        label: 'Salin Alamat Tautan',
        click: () => {
          clipboard.writeText(params.linkURL);
          notifyRenderer(getMainWindow, 'Tautan tautan disalin!', 'success');
        }
      }));
    }
  } else if (params.isEditable) {
    // ── Text Input / Textarea Context Menu ────────────────────────────────────
    menu.append(new MenuItem({ role: 'undo', label: 'Urungkan (Undo)' }));
    menu.append(new MenuItem({ role: 'redo', label: 'Ulangi (Redo)' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ role: 'cut', label: 'Potong (Cut)' }));
    menu.append(new MenuItem({ role: 'copy', label: 'Salin (Copy)' }));
    menu.append(new MenuItem({ role: 'paste', label: 'Tempel (Paste)' }));
    menu.append(new MenuItem({ role: 'selectAll', label: 'Pilih Semua (Select All)' }));
  } else if (params.selectionText && params.selectionText.trim()) {
    // ── Text Selection Context Menu ───────────────────────────────────────────
    menu.append(new MenuItem({ role: 'copy', label: 'Salin Teks (Copy)' }));
    menu.append(new MenuItem({
      label: `Cari "${params.selectionText.length > 20 ? params.selectionText.substring(0, 18) + '…' : params.selectionText}"`,
      click: () => {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.selectionText.trim())}`;
        openImageInNewTab(contents, searchUrl, getMainWindow);
      }
    }));
    menu.append(new MenuItem({
      label: 'Buat QR Code untuk Teks Ini',
      click: () => createQrCodeForImage(params.selectionText.trim(), getMainWindow)
    }));
  } else if (params.linkURL) {
    // ── Regular Hyperlink Context Menu ────────────────────────────────────────
    menu.append(new MenuItem({
      label: 'Buka Tautan di Tab Baru',
      click: () => openImageInNewTab(contents, params.linkURL, getMainWindow)
    }));
    menu.append(new MenuItem({
      label: 'Salin Alamat Tautan',
      click: () => {
        clipboard.writeText(params.linkURL);
        notifyRenderer(getMainWindow, 'Alamat tautan berhasil disalin!', 'success');
      }
    }));
    menu.append(new MenuItem({
      label: 'Buat QR Code untuk Tautan Ini',
      click: () => createQrCodeForImage(params.linkURL, getMainWindow)
    }));
  } else {
    // Standard page navigation context menu
    menu.append(new MenuItem({
      label: 'Muat Ulang Halaman (Reload)',
      click: () => {
        try {
          if (!contents.isDestroyed()) contents.reload();
        } catch (e) { }
      }
    }));
    menu.append(new MenuItem({ role: 'selectAll', label: 'Pilih Semua (Select All)' }));
  }

  // Tampilkan context menu popup
  if (menu.items.length > 0) {
    menu.popup({
      window: mainWindow
    });
  }
}

/**
 * Pasang context menu listener pada WebContents
 */
function attachContextMenu(contents, getMainWindow) {
  if (!contents || contents.isDestroyed()) return;

  contents.on('context-menu', (event, params) => {
    // Jangan buka default menu Chromium yang kosong
    event.preventDefault();
    showContextMenu(contents, params, getMainWindow);
  });
}

module.exports = {
  attachContextMenu,
  isImageUrl,
  suggestFilenameFromUrl,
  extractImageBuffer,
  openImageInNewTab,
  saveImageAs,
  copyImage,
  copyImageAddress,
  copyTextFromImage,
  createQrCodeForImage,
  showContextMenu
};
