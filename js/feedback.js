/**
 * js/feedback.js
 * Enhanced Feedback Modal, Canvas Image Compression, Screen Capture, & Attachment System
 */

const feedbackModal = document.getElementById('feedback-modal');
const btnFeedbackClose = document.getElementById('btn-feedback-close');
const btnFeedbackCancel = document.getElementById('btn-feedback-cancel');
const btnFeedbackSubmit = document.getElementById('btn-feedback-submit');
const btnFeedbackMinimize = document.getElementById('btn-feedback-minimize');
const btnFeedbackMinFooter = document.getElementById('btn-feedback-min-footer');
const feedbackType = document.getElementById('feedback-type');
const feedbackMessage = document.getElementById('feedback-message');
const feedbackCharCount = document.getElementById('feedback-char-count');
const feedbackDockPill = document.getElementById('feedback-dock-pill');
const btnFeedbackDockRestore = document.getElementById('btn-feedback-dock-restore');
const btnFeedbackDockDiscard = document.getElementById('btn-feedback-dock-discard');
const feedbackFileInput = document.getElementById('feedback-file-input');
const btnFeedbackUploadFile = document.getElementById('btn-feedback-upload-file');
const btnFeedbackCaptureScreen = document.getElementById('btn-feedback-capture-screen');
const feedbackDropzone = document.getElementById('feedback-dropzone');

let feedbackDraft = {
  type: 'bug',
  message: '',
  images: [] // Array of { id, name, tag, base64, mimeType, width, height, sizeFormatted }
};
let isFeedbackMinimized = false;

// ── Kompresi Gambar Klien (Canvas Compression - Robust Multi-Engine) ───────
async function compressImageFile(fileOrBlob, maxWidth = 1280, maxHeight = 1280, quality = 0.8) {
  let blob = fileOrBlob;
  if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:image')) {
    try {
      const res = await fetch(fileOrBlob);
      blob = await res.blob();
    } catch (e) {
      console.warn('Gagal fetch dataUrl to blob', e);
    }
  }

  // 1. ENGINE UTAMA: Native createImageBitmap (Direct GPU decode)
  if (typeof window.createImageBitmap === 'function' && blob instanceof Blob) {
    try {
      const bitmap = await createImageBitmap(blob);
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      if (typeof bitmap.close === 'function') bitmap.close();

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const approxSizeBytes = Math.round((dataUrl.length - 22) * 3 / 4);
      const sizeFormatted = approxSizeBytes > 1024 * 1024 
        ? (approxSizeBytes / (1024 * 1024)).toFixed(1) + ' MB'
        : Math.round(approxSizeBytes / 1024) + ' KB';

      return {
        base64: dataUrl,
        mimeType: 'image/jpeg',
        width,
        height,
        sizeFormatted
      };
    } catch (bitmapErr) {
      console.warn('createImageBitmap fallback to FileReader', bitmapErr);
    }
  }

  // 2. ENGINE CADANGAN: FileReader.readAsDataURL -> Image decode
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxSizeBytes = Math.round((dataUrl.length - 22) * 3 / 4);
        const sizeFormatted = approxSizeBytes > 1024 * 1024 
          ? (approxSizeBytes / (1024 * 1024)).toFixed(1) + ' MB'
          : Math.round(approxSizeBytes / 1024) + ' KB';

        resolve({
          base64: dataUrl,
          mimeType: 'image/jpeg',
          width,
          height,
          sizeFormatted
        });
      };
      img.onerror = () => {
        reject(new Error('Format data gambar tidak valid atau gagal didekode'));
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      reject(new Error('Gagal membaca data clipboard / file'));
    };

    if (blob instanceof Blob) {
      reader.readAsDataURL(blob);
    } else {
      reject(new Error('Objek gambar bukan Blob/File yang valid'));
    }
  });
}

// ── Tambah Gambar ke Daftar Lampiran & Sisipkan Tag Otomatis ────────────────
async function addFeedbackImage(fileOrBlob, customName = null) {
  if (feedbackDraft.images.length >= 4) {
    showToast('Maksimal 4 gambar lampiran per laporan!', 'error');
    return;
  }

  try {
    const compressed = await compressImageFile(fileOrBlob);
    const nextIndex = feedbackDraft.images.length + 1;
    const imgTag = `[Gambar ${nextIndex}]`;
    const imgObj = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      name: customName || `gambar_${nextIndex}.jpg`,
      tag: imgTag,
      base64: compressed.base64,
      mimeType: compressed.mimeType,
      sizeFormatted: compressed.sizeFormatted,
      width: compressed.width,
      height: compressed.height
    };

    feedbackDraft.images.push(imgObj);

    // Auto-insert tag ke textarea pada posisi kursor
    insertTagToFeedbackTextarea(imgTag);

    renderFeedbackThumbnails();
    updateFeedbackDockPill();
    showToast(`📷 ${imgTag} berhasil dilampirkan (${compressed.sizeFormatted}) ✓`, 'success');
  } catch (err) {
    showToast('Gagal memproses gambar: ' + err.message, 'error');
  }
}

// ── Sisipkan Tag [Gambar X] ke Posisi Kursor Textarea ──────────────────────
function insertTagToFeedbackTextarea(tag) {
  if (!feedbackMessage) return;
  const val = feedbackMessage.value;
  const start = feedbackMessage.selectionStart || val.length;
  const end = feedbackMessage.selectionEnd || val.length;

  const before = val.substring(0, start);
  const after = val.substring(end);
  const needsLeadingSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
  const needsTrailingSpace = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

  const insertText = (needsLeadingSpace ? ' ' : '') + tag + (needsTrailingSpace ? ' ' : ' ');
  feedbackMessage.value = before + insertText + after;

  const newCursorPos = start + insertText.length;
  feedbackMessage.selectionStart = feedbackMessage.selectionEnd = newCursorPos;
  feedbackMessage.focus();

  updateFeedbackCharCount();
}
window.insertTagToFeedbackTextarea = insertTagToFeedbackTextarea;

// ── Render Thumbnail Lampiran Gambar ─────────────────────────────────────────
function renderFeedbackThumbnails() {
  const grid = document.getElementById('feedback-thumbnails-grid');
  const counter = document.getElementById('feedback-img-counter');
  if (counter) {
    counter.textContent = `${feedbackDraft.images.length} / 4 Gambar`;
  }
  if (!grid) return;

  if (feedbackDraft.images.length === 0) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = feedbackDraft.images.map((img, idx) => {
    const tag = `[Gambar ${idx + 1}]`;
    img.tag = tag;
    return `
      <div class="feedback-thumb-card" data-img-id="${img.id}">
        <img src="${img.base64}" class="feedback-thumb-preview" alt="${tag}" title="Klik untuk melihat perbesaran" onclick="previewFeedbackImage('${img.id}')">
        <div class="feedback-thumb-footer">
          <span class="feedback-thumb-tag" title="Klik untuk menyisipkan tag ${tag} ke posisi kursor teks" onclick="insertTagToFeedbackTextarea('${tag}')">${tag}</span>
          <button type="button" class="btn-thumb-remove" title="Hapus gambar ini" onclick="removeFeedbackImage('${img.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Lightbox Preview Perbesaran Gambar ───────────────────────────────────────
function previewFeedbackImage(imgId) {
  const img = feedbackDraft.images.find(i => i.id === imgId);
  if (!img) return;

  let lightbox = document.getElementById('feedback-img-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'feedback-img-lightbox';
    lightbox.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
      z-index: 100002; display: flex; align-items: center; justify-content: center;
      flex-direction: column; cursor: pointer; padding: 24px; box-sizing: border-box;
    `;
    lightbox.onclick = () => { lightbox.style.display = 'none'; };
    document.body.appendChild(lightbox);
  }

  lightbox.innerHTML = `
    <div style="position: relative; max-width: 90vw; max-height: 85vh;" onclick="event.stopPropagation();">
      <img src="${img.base64}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 16px 40px rgba(0,0,0,0.8); border: 1.5px solid var(--accent-primary, #df1683); display: block; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; color: #ffffff; font-size: 13px; font-weight: 600;">
        <span>${img.tag} &middot; ${img.sizeFormatted} (${img.width}x${img.height}px)</span>
        <button style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 14px; border-radius: 6px; cursor: pointer; font-family:inherit;" onclick="document.getElementById('feedback-img-lightbox').style.display='none';">Tutup</button>
      </div>
    </div>
  `;
  lightbox.style.display = 'flex';
}
window.previewFeedbackImage = previewFeedbackImage;

// ── Hapus Lampiran Gambar ───────────────────────────────────────────────────
function removeFeedbackImage(imgId) {
  const idx = feedbackDraft.images.findIndex(i => i.id === imgId);
  if (idx !== -1) {
    const removed = feedbackDraft.images.splice(idx, 1)[0];
    renderFeedbackThumbnails();
    updateFeedbackDockPill();
    showToast(`Lampiran ${removed.tag || 'gambar'} dihapus`, '');
  }
}
window.removeFeedbackImage = removeFeedbackImage;

// ── Tangkap Layar Dashboard Otomatis (One-Click Screen Capture) ─────────────
async function handleCaptureDashboardScreen() {
  if (feedbackDraft.images.length >= 4) {
    showToast('Maksimal 4 gambar lampiran!', 'error');
    return;
  }

  if (feedbackModal) feedbackModal.style.opacity = '0';
  if (feedbackDockPill) feedbackDockPill.style.opacity = '0';

  await new Promise(r => setTimeout(r, 90));

  try {
    if (window.electronAPI && typeof window.electronAPI.captureScreen === 'function') {
      const res = await window.electronAPI.captureScreen();
      if (res && res.success && res.dataUrl) {
        const byteString = atob(res.dataUrl.split(',')[1]);
        const mimeString = res.dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        await addFeedbackImage(blob, `screenshot_dashboard_${feedbackDraft.images.length + 1}.jpg`);
      } else {
        throw new Error(res?.error || 'Gagal menangkap layar');
      }
    } else {
      showToast('Fitur tangkap layar otomatis tidak didukung', 'error');
    }
  } catch (err) {
    showToast('Gagal tangkap layar: ' + err.message, 'error');
  } finally {
    if (feedbackModal) feedbackModal.style.opacity = '1';
    if (feedbackDockPill) feedbackDockPill.style.opacity = '1';
  }
}

// ── Handler Paste Clipboard (Ctrl + V) ──────────────────────────────────────
async function handleFeedbackPaste(e) {
  if (!e.clipboardData) return;

  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    for (let i = 0; i < e.clipboardData.files.length; i++) {
      const file = e.clipboardData.files[i];
      if (file && file.type && file.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        await addFeedbackImage(file, file.name || `screenshot_paste_${feedbackDraft.images.length + 1}.jpg`);
        return;
      }
    }
  }

  if (e.clipboardData.items && e.clipboardData.items.length > 0) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item && item.type && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          await addFeedbackImage(file, `screenshot_paste_${feedbackDraft.images.length + 1}.jpg`);
          return;
        }
      }
    }
  }
}

// ── Update Counter Karakter & Draf ──────────────────────────────────────────
function updateFeedbackCharCount() {
  if (!feedbackMessage || !feedbackCharCount) return;
  const len = feedbackMessage.value.length;
  feedbackCharCount.textContent = `${len} / 5000`;
  feedbackCharCount.style.color = len > 4500 ? '#ef4444' : 'var(--text-muted)';
  feedbackDraft.message = feedbackMessage.value;
}

// ── Update Floating Dock Pill Text ──────────────────────────────────────────
function updateFeedbackDockPill() {
  const dockTitle = document.getElementById('feedback-dock-title');
  const dockSub = document.getElementById('feedback-dock-sub');
  if (dockTitle) {
    const typeLabel = feedbackDraft.type === 'bug' ? 'Draf Bug' : (feedbackDraft.type === 'saran' ? 'Draf Saran' : 'Draf Laporan');
    dockTitle.textContent = typeLabel;
  }
  if (dockSub) {
    const imgCount = feedbackDraft.images.length;
    const txtLength = (feedbackDraft.message || '').trim().length;
    dockSub.textContent = `${imgCount} Gambar &middot; ${txtLength} Karakter`;
  }
}

// ── Buka, Minimize, Restore & Discard Modal Feedback ─────────────────────────
function openFeedbackModal() {
  if (isFeedbackMinimized) {
    restoreFeedbackModal();
    return;
  }

  if (feedbackModal) {
    feedbackModal.classList.add('active');
    document.body.classList.remove('has-minimized-feedback');
    if (feedbackDockPill) feedbackDockPill.style.display = 'none';

    if (feedbackMessage) {
      feedbackMessage.value = feedbackDraft.message || '';
      setTimeout(() => { feedbackMessage.focus(); }, 120);
    }
    if (feedbackType && feedbackDraft.type) {
      feedbackType.value = feedbackDraft.type;
    }
    renderFeedbackThumbnails();
    updateFeedbackCharCount();
  }
}

function minimizeFeedbackModal() {
  if (!feedbackModal) return;
  isFeedbackMinimized = true;
  document.body.classList.add('has-minimized-feedback');
  feedbackModal.classList.remove('active');

  if (feedbackMessage) feedbackDraft.message = feedbackMessage.value;
  if (feedbackType) feedbackDraft.type = feedbackType.value;

  updateFeedbackDockPill();
  if (feedbackDockPill) {
    feedbackDockPill.style.display = 'flex';
  }

  showToast('📝 Form laporan diminimize ke pojok kanan bawah. Anda bebas mengambil screenshot.', '');
}

function restoreFeedbackModal() {
  isFeedbackMinimized = false;
  document.body.classList.remove('has-minimized-feedback');
  if (feedbackDockPill) feedbackDockPill.style.display = 'none';

  if (feedbackModal) {
    feedbackModal.classList.add('active');
    if (feedbackMessage) {
      feedbackMessage.value = feedbackDraft.message || '';
      feedbackMessage.focus();
    }
    if (feedbackType && feedbackDraft.type) {
      feedbackType.value = feedbackDraft.type;
    }
    renderFeedbackThumbnails();
    updateFeedbackCharCount();
  }
}

function closeFeedbackModal() {
  const hasContent = (feedbackMessage && feedbackMessage.value.trim().length > 0) || feedbackDraft.images.length > 0;
  if (hasContent && !isFeedbackMinimized) {
    minimizeFeedbackModal();
    return;
  }

  if (feedbackModal) {
    feedbackModal.classList.remove('active');
  }
  document.body.classList.remove('has-minimized-feedback');
  if (feedbackDockPill) feedbackDockPill.style.display = 'none';
}

function resetFeedbackDraft(showCancelToast = false) {
  feedbackDraft = {
    type: 'bug',
    message: '',
    images: []
  };
  isFeedbackMinimized = false;
  document.body.classList.remove('has-minimized-feedback');
  if (feedbackDockPill) feedbackDockPill.style.display = 'none';
  if (feedbackModal) feedbackModal.classList.remove('active');
  if (feedbackMessage) feedbackMessage.value = '';
  renderFeedbackThumbnails();
  if (showCancelToast) {
    showToast('Draf feedback dibatalkan', '');
  }
}

function discardFeedbackDraft() {
  resetFeedbackDraft(true);
}

window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.minimizeFeedbackModal = minimizeFeedbackModal;
window.restoreFeedbackModal = restoreFeedbackModal;
window.discardFeedbackDraft = discardFeedbackDraft;
window.resetFeedbackDraft = resetFeedbackDraft;

// ── Bind Feedback Event Listeners ───────────────────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-feedback')) {
    openFeedbackModal();
  } else if (e.target === feedbackModal) {
    closeFeedbackModal();
  }
});

if (btnFeedbackClose) btnFeedbackClose.addEventListener('click', closeFeedbackModal);
if (btnFeedbackCancel) btnFeedbackCancel.addEventListener('click', discardFeedbackDraft);
if (btnFeedbackMinimize) btnFeedbackMinimize.addEventListener('click', minimizeFeedbackModal);
if (btnFeedbackMinFooter) btnFeedbackMinFooter.addEventListener('click', minimizeFeedbackModal);

if (btnFeedbackDockRestore) btnFeedbackDockRestore.addEventListener('click', restoreFeedbackModal);
if (btnFeedbackDockDiscard) btnFeedbackDockDiscard.addEventListener('click', (e) => {
  e.stopPropagation();
  discardFeedbackDraft();
});

if (feedbackMessage) {
  feedbackMessage.addEventListener('input', updateFeedbackCharCount);
  feedbackMessage.addEventListener('paste', handleFeedbackPaste);
}

if (feedbackModal) {
  feedbackModal.addEventListener('paste', handleFeedbackPaste);
}

if (btnFeedbackCaptureScreen) {
  btnFeedbackCaptureScreen.addEventListener('click', handleCaptureDashboardScreen);
}

if (btnFeedbackUploadFile && feedbackFileInput) {
  btnFeedbackUploadFile.addEventListener('click', () => {
    feedbackFileInput.click();
  });

  feedbackFileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (feedbackDraft.images.length >= 4) break;
        await addFeedbackImage(files[i], files[i].name);
      }
      feedbackFileInput.value = '';
    }
  });
}

if (feedbackDropzone) {
  feedbackDropzone.addEventListener('click', () => {
    if (feedbackFileInput) feedbackFileInput.click();
  });

  feedbackDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    feedbackDropzone.classList.add('drag-over');
  });

  feedbackDropzone.addEventListener('dragleave', () => {
    feedbackDropzone.classList.remove('drag-over');
  });

  feedbackDropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    feedbackDropzone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          if (feedbackDraft.images.length >= 4) break;
          await addFeedbackImage(files[i], files[i].name);
        }
      }
    }
  });
}

// ── Submit Feedback Handler (Teks & Gambar Base64) ──────────────────────────
if (btnFeedbackSubmit) {
  btnFeedbackSubmit.addEventListener('click', async () => {
    const msg = feedbackMessage ? feedbackMessage.value.trim() : '';
    if (!msg && feedbackDraft.images.length === 0) {
      showToast('Harap isi deskripsi laporan atau lampirkan screenshot!', 'error');
      return;
    }

    btnFeedbackSubmit.disabled = true;
    btnFeedbackSubmit.innerHTML = `
      <span class="spinner-small" style="display:inline-block; width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px;"></span>
      Mengirim Laporan...
    `;

    const currentStores = (typeof stores !== 'undefined' && Array.isArray(stores) && stores.length > 0)
      ? stores
      : (typeof getOrderedStores === 'function' ? getOrderedStores() : (window.stores || []));

    const safeConfig = currentStores.map(s => ({
      name: s.name || 'Toko',
      marketplace: s.marketplace || 'custom'
    }));

    const imagesPayload = feedbackDraft.images.map(img => ({
      name: img.name,
      base64: img.base64,
      mimeType: img.mimeType
    }));

    try {
      const response = await window.electronAPI.submitFeedback({
        type: feedbackType ? feedbackType.value : 'bug',
        message: msg || `[Laporan berisi ${imagesPayload.length} lampiran gambar]`,
        storesConfig: safeConfig,
        images: imagesPayload
      });

      if (response && response.success) {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('feedback_submitted');
        }
        resetFeedbackDraft(false);
        showToast('Laporan bug & screenshot berhasil dikirim ke tim pengembang! Terima kasih.', 'success');
      } else {
        throw new Error((response && response.error) || 'Gagal terhubung ke server proxy');
      }
    } catch (err) {
      showToast('Gagal mengirim feedback: ' + err.message, 'error');
    } finally {
      btnFeedbackSubmit.disabled = false;
      btnFeedbackSubmit.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        Kirim Feedback
      `;
    }
  });
}
