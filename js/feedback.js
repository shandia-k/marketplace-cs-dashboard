/**
 * js/feedback.js
 * Comprehensive 2-Way Feedback, Interactive Ticketing, Canvas Compression, & Threading System
 */

// ── State Management ────────────────────────────────────────────────────────
let feedbackDraft = {
  type: 'bug',
  message: '',
  images: [] // Array of { id, name, tag, base64, mimeType, width, height, sizeFormatted }
};

let replyDraft = {
  images: [] // Array of { id, name, base64, mimeType, sizeFormatted }
};

let allFeedbackTickets = [];
let activeSelectedTicketId = null;
let currentActiveTab = 'history'; // 'history' | 'new'
let isFeedbackMinimized = false;

// ── On-Demand Sync State (Zero Idle Quota) ───────────────────────────────────
let lastSyncCallTime = 0;
const CLIENT_SYNC_MIN_INTERVAL_MS = 15 * 1000; // Minimal 15 detik antar on-demand sync

// Helper query
function getEl(id) {
  return document.getElementById(id);
}

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

// ── Tambah Gambar ke Draf Form Laporan Baru ─────────────────────────────────
async function addFeedbackImage(fileOrBlob, customName = null) {
  if (feedbackDraft.images.length >= 4) {
    if (typeof showToast === 'function') showToast('Maksimal 4 gambar lampiran per laporan!', 'error');
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
    insertTagToFeedbackTextarea(imgTag);
    renderFeedbackThumbnails();
    updateFeedbackDockPill();
    if (typeof showToast === 'function') showToast(`📷 ${imgTag} berhasil dilampirkan (${compressed.sizeFormatted}) ✓`, 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast('Gagal memproses gambar: ' + err.message, 'error');
  }
}

// ── Sisipkan Tag [Gambar X] ke Posisi Kursor Textarea Form Baru ─────────────
function insertTagToFeedbackTextarea(tag) {
  const fMsg = getEl('feedback-message');
  if (!fMsg) return;
  const val = fMsg.value;
  const start = fMsg.selectionStart || val.length;
  const end = fMsg.selectionEnd || val.length;

  const before = val.substring(0, start);
  const after = val.substring(end);
  const needsLeadingSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
  const needsTrailingSpace = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

  const insertText = (needsLeadingSpace ? ' ' : '') + tag + (needsTrailingSpace ? ' ' : ' ');
  fMsg.value = before + insertText + after;

  const newCursorPos = start + insertText.length;
  fMsg.selectionStart = fMsg.selectionEnd = newCursorPos;
  fMsg.focus();
  updateFeedbackCharCount();
}
window.insertTagToFeedbackTextarea = insertTagToFeedbackTextarea;

// ── Render Thumbnail Lampiran Draf Baru ─────────────────────────────────────
function renderFeedbackThumbnails() {
  const grid = getEl('feedback-thumbnails-grid');
  const counter = getEl('feedback-img-counter');
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
        <img src="${img.base64}" class="feedback-thumb-preview" alt="${tag}" title="Klik untuk melihat perbesaran" onclick="previewFeedbackImageBase64('${img.base64}', '${tag}')">
        <div class="feedback-thumb-footer">
          <span class="feedback-thumb-tag" title="Klik untuk menyisipkan tag ${tag}" onclick="insertTagToFeedbackTextarea('${tag}')">${tag}</span>
          <button type="button" class="btn-thumb-remove" title="Hapus gambar ini" onclick="removeFeedbackImage('${img.id}')" aria-label="Hapus gambar ini">
            <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function removeFeedbackImage(imgId) {
  const idx = feedbackDraft.images.findIndex(i => i.id === imgId);
  if (idx !== -1) {
    const removed = feedbackDraft.images.splice(idx, 1)[0];
    renderFeedbackThumbnails();
    updateFeedbackDockPill();
    if (typeof showToast === 'function') showToast(`Lampiran ${removed.tag || 'gambar'} dihapus`, '');
  }
}
window.removeFeedbackImage = removeFeedbackImage;

// ── Lightbox Preview Perbesaran Gambar ───────────────────────────────────────
function previewFeedbackImageBase64(base64Src, title = 'Lampiran Gambar') {
  if (!base64Src) return;
  let lightbox = document.getElementById('feedback-img-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'feedback-img-lightbox';
    lightbox.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.88); backdrop-filter: blur(8px);
      z-index: 100002; display: flex; align-items: center; justify-content: center;
      flex-direction: column; cursor: pointer; padding: 24px; box-sizing: border-box;
    `;
    lightbox.onclick = () => { lightbox.style.display = 'none'; };
    document.body.appendChild(lightbox);
  }

  lightbox.innerHTML = `
    <div style="position: relative; max-width: 90vw; max-height: 85vh;" onclick="event.stopPropagation();">
      <img src="${base64Src}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 16px 40px rgba(0,0,0,0.8); border: 1.5px solid var(--accent-primary, #df1683); display: block; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; color: #ffffff; font-size: 13px; font-weight: 600;">
        <span>📷 ${escapeHtml(title)}</span>
        <button style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 14px; border-radius: 6px; cursor: pointer; font-family:inherit;" onclick="document.getElementById('feedback-img-lightbox').style.display='none';">Tutup</button>
      </div>
    </div>
  `;
  lightbox.style.display = 'flex';
}
window.previewFeedbackImageBase64 = previewFeedbackImageBase64;

// ── Tangkap Layar Dashboard Otomatis (One-Click Screen Capture) ─────────────
async function handleCaptureDashboardScreen() {
  if (feedbackDraft.images.length >= 4) {
    if (typeof showToast === 'function') showToast('Maksimal 4 gambar lampiran!', 'error');
    return;
  }

  const modal = getEl('feedback-modal');
  const dockPill = getEl('feedback-dock-pill');
  if (modal) modal.style.opacity = '0';
  if (dockPill) dockPill.style.opacity = '0';

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
      if (typeof showToast === 'function') showToast('Fitur tangkap layar otomatis tidak didukung', 'error');
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Gagal tangkap layar: ' + err.message, 'error');
  } finally {
    if (modal) modal.style.opacity = '1';
    if (dockPill) dockPill.style.opacity = '1';
  }
}

// ── Handler Paste Clipboard (Ctrl + V) ──────────────────────────────────────
async function handleFeedbackPaste(e) {
  if (!e.clipboardData) return;

  const replyInput = getEl('feedback-reply-text');
  const isReplyFocus = (document.activeElement === replyInput);

  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    for (let i = 0; i < e.clipboardData.files.length; i++) {
      const file = e.clipboardData.files[i];
      if (file && file.type && file.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        if (isReplyFocus || currentActiveTab === 'history') {
          await addReplyImage(file, file.name);
        } else {
          await addFeedbackImage(file, file.name);
        }
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
          if (isReplyFocus || currentActiveTab === 'history') {
            await addReplyImage(file, `screenshot_reply_${replyDraft.images.length + 1}.jpg`);
          } else {
            await addFeedbackImage(file, `screenshot_paste_${feedbackDraft.images.length + 1}.jpg`);
          }
          return;
        }
      }
    }
  }
}

// ── Lampiran Gambar pada Balasan Thread (Reply) ──────────────────────────────
async function addReplyImage(fileOrBlob, customName = null) {
  if (replyDraft.images.length >= 4) {
    if (typeof showToast === 'function') showToast('Maksimal 4 gambar pada satu balasan!', 'error');
    return;
  }

  try {
    const compressed = await compressImageFile(fileOrBlob);
    const nextIdx = replyDraft.images.length + 1;
    const imgObj = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      name: customName || `balasan_img_${nextIdx}.jpg`,
      tag: `[Gambar ${nextIdx}]`,
      base64: compressed.base64,
      mimeType: compressed.mimeType,
      sizeFormatted: compressed.sizeFormatted
    };

    replyDraft.images.push(imgObj);
    renderReplyThumbnails();
    if (typeof showToast === 'function') showToast(`📷 Lampiran balasan ditambahkan (${compressed.sizeFormatted})`, 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast('Gagal memproses gambar balasan: ' + err.message, 'error');
  }
}

function renderReplyThumbnails() {
  const grid = getEl('feedback-reply-thumbnails');
  if (!grid) return;
  if (replyDraft.images.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    return;
  }

  grid.style.display = 'flex';
  grid.innerHTML = replyDraft.images.map((img) => `
    <div style="position: relative; display: inline-flex; align-items: center; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 3px 6px; gap: 6px; border: 1px solid var(--border-color);">
      <img src="${img.base64}" style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="previewFeedbackImageBase64('${img.base64}', '${img.name}')">
      <span style="font-size: 11px; color: var(--text-secondary); max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img.name}</span>
      <button type="button" style="background:none; border:none; color: #ef4444; cursor: pointer; padding: 2px;" onclick="removeReplyImage('${img.id}')">✕</button>
    </div>
  `).join('');
}

function removeReplyImage(imgId) {
  const idx = replyDraft.images.findIndex(i => i.id === imgId);
  if (idx !== -1) {
    replyDraft.images.splice(idx, 1);
    renderReplyThumbnails();
  }
}
window.removeReplyImage = removeReplyImage;

// ── Tab Switching: Riwayat vs Buat Laporan Baru ─────────────────────────────
function switchFeedbackTab(tabName) {
  currentActiveTab = tabName;

  const tabBtnHistory = getEl('tab-btn-feedback-history');
  const tabBtnNew = getEl('tab-btn-feedback-new');
  const panelHistory = getEl('feedback-panel-history');
  const panelNew = getEl('feedback-panel-new');

  if (tabBtnHistory) tabBtnHistory.classList.toggle('active', tabName === 'history');
  if (tabBtnNew) tabBtnNew.classList.toggle('active', tabName === 'new');
  if (panelHistory) panelHistory.classList.toggle('active', tabName === 'history');
  if (panelNew) panelNew.classList.toggle('active', tabName === 'new');

  const titleEl = getEl('feedback-modal-title');
  if (titleEl) {
    titleEl.textContent = tabName === 'history' ? 'Pusat Bantuan & Riwayat Tiket' : 'Buat Laporan Bug / Saran Baru';
  }

  if (tabName === 'history') {
    loadFeedbackTickets(activeSelectedTicketId);
    triggerOnDemandFeedbackSync(false);
  } else {
    const fMsg = getEl('feedback-message');
    if (fMsg) setTimeout(() => fMsg.focus(), 100);
  }
}
window.switchFeedbackTab = switchFeedbackTab;

// ── Helper Formatting ────────────────────────────────────────────────────────

function formatDateDisplay(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoString;
  }
}

function formatTimeOnly(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch (e) {
    return '';
  }
}

function formatDateSeparator(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

function getStatusBadgeHtml(status) {
  const map = {
    open: { label: '🟡 Menunggu Review', cls: 'status-open' },
    in_progress: { label: '🔵 Sedang Dikerjakan', cls: 'status-in_progress' },
    need_info: { label: '🟣 Butuh Info', cls: 'status-need_info' },
    resolved: { label: '🟢 Selesai', cls: 'status-resolved' },
    closed: { label: '⚫ Ditutup', cls: 'status-closed' }
  };
  const conf = map[status] || { label: status, cls: 'status-open' };
  return `<span class="status-pill ${conf.cls}">${conf.label}</span>`;
}

function getTypeBadge(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'bug') return '🐛 Bug';
  if (t === 'saran') return '💡 Saran';
  return '❓ Pertanyaan';
}

// ── Muat Daftar Tiket dari IPC ──────────────────────────────────────────────
async function loadFeedbackTickets(selectTicketId = null, isBackgroundRefresh = false) {
  try {
    if (!window.electronAPI || !window.electronAPI.feedback) return;
    const tickets = await window.electronAPI.feedback.getTickets();
    allFeedbackTickets = Array.isArray(tickets) ? tickets : [];
    filterFeedbackTickets(selectTicketId, isBackgroundRefresh);
    refreshUnreadBadges();
  } catch (err) {
    console.error('Error loading feedback tickets:', err);
  }
}
window.loadFeedbackTickets = loadFeedbackTickets;

// ── Filter & Render Sidebar Tiket ───────────────────────────────────────────
function filterFeedbackTickets(selectTicketId = null, isBackgroundRefresh = false) {
  const searchInput = getEl('feedback-search-input');
  const statusFilterSelect = getEl('feedback-status-filter');
  const threadEmptyView = getEl('feedback-thread-empty');
  const threadContentView = getEl('feedback-thread-content');

  const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const statusFilter = statusFilterSelect ? statusFilterSelect.value : 'all';

  const filtered = allFeedbackTickets.filter(t => {
    // Filter status
    if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }
    // Filter pencarian teks
    if (searchVal) {
      const matchId = (t.id || '').toLowerCase().includes(searchVal);
      const matchTitle = (t.title || '').toLowerCase().includes(searchVal);
      const matchMsg = Array.isArray(t.messages) && t.messages.some(m => (m.content || '').toLowerCase().includes(searchVal));
      return matchId || matchTitle || matchMsg;
    }
    return true;
  });

  renderTicketSidebarList(filtered);

  // Jika belum ada tiket aktif yang dipilih, pilih yang pertama jika tersedia
  if (filtered.length > 0) {
    const targetId = selectTicketId || activeSelectedTicketId || filtered[0].id;
    const exists = filtered.some(t => t.id === targetId);
    selectFeedbackTicket(exists ? targetId : filtered[0].id, isBackgroundRefresh);
  } else {
    activeSelectedTicketId = null;
    if (threadEmptyView) threadEmptyView.style.display = 'flex';
    if (threadContentView) threadContentView.style.display = 'none';
  }
}
window.filterFeedbackTickets = filterFeedbackTickets;

function renderTicketSidebarList(tickets) {
  const ticketListContainer = getEl('feedback-ticket-list');
  if (!ticketListContainer) return;

  if (tickets.length === 0) {
    ticketListContainer.innerHTML = `
      <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 11.5px;">
        Tidak ada riwayat laporan ditemukan.
      </div>
    `;
    return;
  }

  ticketListContainer.innerHTML = tickets.map(t => {
    const isActive = t.id === activeSelectedTicketId;
    const lastMsg = (Array.isArray(t.messages) && t.messages.length > 0)
      ? t.messages[t.messages.length - 1].content
      : '';
    const hasUnread = Number(t.unreadCount) > 0;

    return `
      <div class="feedback-ticket-card ${isActive ? 'active' : ''}" onclick="selectFeedbackTicket('${t.id}')">
        <div class="ticket-card-header">
          <span class="ticket-card-id">#${escapeHtml(t.id)}</span>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${getStatusBadgeHtml(t.status)}
            ${hasUnread ? `<span class="ticket-unread-dot" title="${t.unreadCount} balasan baru"></span>` : ''}
          </div>
        </div>
        <div class="ticket-card-title">${escapeHtml(t.title || 'Laporan Baru')}</div>
        <div class="ticket-card-snippet">${escapeHtml(lastMsg)}</div>
        <div class="ticket-card-footer">
          <span>${getTypeBadge(t.type)}</span>
          <span>${formatDateDisplay(t.updatedAt || t.createdAt)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── Pilih Tiket & Tampilkan Thread Percakapan ────────────────────────────────
async function selectFeedbackTicket(ticketId, isBackgroundRefresh = false) {
  const isSwitchingTicket = (activeSelectedTicketId !== ticketId);
  activeSelectedTicketId = ticketId;

  const threadEmptyView = getEl('feedback-thread-empty');
  const threadContentView = getEl('feedback-thread-content');
  const threadTicketId = getEl('thread-ticket-id');
  const threadTicketTitle = getEl('thread-ticket-title');
  const threadTicketType = getEl('thread-ticket-type');
  const threadTicketStatus = getEl('thread-ticket-status');
  const threadTicketMeta = getEl('thread-ticket-meta');
  const btnToggleResolve = getEl('btn-toggle-resolve-ticket');
  const replyTextInput = getEl('feedback-reply-text');

  // Update styling list
  const cards = document.querySelectorAll('.feedback-ticket-card');
  cards.forEach(c => {
    const isThis = c.innerHTML.includes(`#${ticketId}`);
    c.classList.toggle('active', isThis);
  });

  if (threadEmptyView) threadEmptyView.style.display = 'none';
  if (threadContentView) threadContentView.style.display = 'flex';

  try {
    const res = await window.electronAPI.feedback.getTicket(ticketId);
    if (!res || !res.success || !res.ticket) {
      if (typeof showToast === 'function') showToast('Gagal memuat detail tiket', 'error');
      return;
    }

    const t = res.ticket;

    // Tandai sudah dibaca
    if (t.unreadCount > 0) {
      await window.electronAPI.feedback.markRead(ticketId);
      t.unreadCount = 0;
      refreshUnreadBadges();
    }

    // Update Header Thread
    if (threadTicketId) threadTicketId.textContent = `#${t.id}`;
    if (threadTicketTitle) threadTicketTitle.textContent = t.title || 'Laporan Baru';
    if (threadTicketType) threadTicketType.textContent = getTypeBadge(t.type);
    if (threadTicketStatus) {
      threadTicketStatus.innerHTML = getStatusBadgeHtml(t.status);
    }
    if (threadTicketMeta) {
      const rep = t.reporter?.displayName || t.reporter?.username || 'CS';
      threadTicketMeta.innerHTML = `Dilaporkan oleh <b>${escapeHtml(rep)}</b> &middot; Dibuat ${formatDateDisplay(t.createdAt)}`;
    }

    // Update Tombol Selesai / Buka Kembali
    if (btnToggleResolve) {
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      btnToggleResolve.textContent = isResolved ? '↩ Buka Kembali Tiket' : '✓ Tandai Selesai';
      btnToggleResolve.style.borderColor = isResolved ? 'var(--accent-primary)' : 'var(--border-color)';
    }

    // Render Stream Percakapan
    renderThreadStream(t, isBackgroundRefresh);

    // HANYA reset Reply Input jika user berpindah ke tiket lain secara manual
    if (isSwitchingTicket && !isBackgroundRefresh) {
      if (replyTextInput) replyTextInput.value = '';
      replyDraft.images = [];
      renderReplyThumbnails();
    }

  } catch (err) {
    console.error('Error selecting ticket:', err);
  }
}
window.selectFeedbackTicket = selectFeedbackTicket;

// ── Render Thread Percakapan (WhatsApp-Style Chat Bubbles) ──────────────────
function renderThreadStream(ticket, isBackgroundRefresh = false) {
  const threadStream = getEl('feedback-thread-stream');
  if (!threadStream) return;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];

  // Jika background refresh dan jumlah pesan tidak berubah, hindari menimpa DOM agar tidak mengganggu scroll / input
  const existingBubbles = threadStream.querySelectorAll('.thread-msg-bubble');
  if (isBackgroundRefresh && existingBubbles.length === messages.length) {
    return;
  }

  // Saring pesan duplikat (misal pesan inisiasi _init lokal vs remote, atau log sistem duplikat)
  const displayMessages = [];
  messages.forEach((msg, idx) => {
    if (!msg) return;

    // Saring log sistem duplikat berurutan
    if (msg.sender?.role === 'system') {
      const prev = messages[idx - 1];
      if (prev && prev.sender?.role === 'system' && prev.content === msg.content) {
        return;
      }
    }

    const isDuplicate = displayMessages.some(existing => {
      if (existing.id && msg.id && existing.id === msg.id) return true;
      if (existing.id && existing.id.endsWith('_init') && msg.id && msg.id.endsWith('_init')) {
        return true;
      }
      if (existing.sender?.username === msg.sender?.username && existing.content === msg.content) {
        const timeA = new Date(existing.timestamp || 0).getTime();
        const timeB = new Date(msg.timestamp || 0).getTime();
        if (Math.abs(timeA - timeB) < 15000) return true;
      }
      return false;
    });

    if (!isDuplicate) {
      displayMessages.push(msg);
    }
  });

  let lastDateStr = '';
  const htmlParts = [];

  displayMessages.forEach(msg => {
    const msgDateStr = formatDateSeparator(msg.timestamp);
    if (msgDateStr && msgDateStr !== lastDateStr) {
      lastDateStr = msgDateStr;
      htmlParts.push(`
        <div class="thread-date-separator">
          <span>${escapeHtml(msgDateStr)}</span>
        </div>
      `);
    }

    const role = msg.sender?.role || 'user';
    const isDev = role === 'developer' || role === 'superadmin' || msg.isDevReply === true;
    const isSystem = role === 'system';
    const timeStr = formatTimeOnly(msg.timestamp);

    if (isSystem) {
      htmlParts.push(`
        <div class="thread-msg-bubble from-system">
          <div class="thread-system-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>${escapeHtml(msg.content)}</span>
            <span class="system-time">&middot; ${timeStr}</span>
          </div>
        </div>
      `);
      return;
    }

    const bubbleClass = isDev ? 'from-dev' : 'from-user';
    const senderName = msg.sender?.displayName || msg.sender?.username || (isDev ? 'Developer' : 'CS');

    // 1. Render Dedicated Image Bubbles (WhatsApp Style) jika ada lampiran gambar
    if (Array.isArray(msg.images) && msg.images.length > 0) {
      msg.images.forEach(img => {
        const imgSrc = img.base64 || img.url;
        const imgName = img.name || 'Lampiran Gambar';
        htmlParts.push(`
          <div class="thread-msg-bubble ${bubbleClass} is-image-bubble">
            <div class="thread-img-card" onclick="previewFeedbackImageBase64('${imgSrc}', '${escapeHtml(imgName)}')">
              <img src="${imgSrc}" class="thread-msg-img-large" alt="${escapeHtml(imgName)}" title="${escapeHtml(imgName)} (Klik untuk melihat ukuran penuh)">
              <span class="thread-img-time">${timeStr}</span>
            </div>
          </div>
        `);
      });
    }

    // 2. Bersihkan tag gambar jika ada di dalam teks
    const rawContent = String(msg.content || '').trim();
    const cleanContent = rawContent.replace(/\[Gambar\s*\d+\]/gi, '').trim();

    // 3. Render Text Bubble (Hanya jika ada teks yang tersisa)
    if (cleanContent) {
      const devHeaderHtml = isDev ? `
        <div class="thread-sender-name">
          <span>${escapeHtml(senderName)}</span>
          <span class="thread-dev-tag">Developer</span>
        </div>
      ` : '';

      const checkmarkHtml = !isDev ? `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ` : '';

      htmlParts.push(`
        <div class="thread-msg-bubble ${bubbleClass}">
          <div class="thread-msg-card">
            ${devHeaderHtml}
            <div class="thread-msg-text">${escapeHtml(cleanContent)}</div>
            <span class="thread-msg-time">${timeStr}${checkmarkHtml}</span>
          </div>
        </div>
      `);
    }
  });

  // Render Rekam Jejak Diagnostik (Flight Recorder Breadcrumbs) jika tersedia pada tiket
  if (ticket.diagnostics && Array.isArray(ticket.diagnostics.breadcrumbs) && ticket.diagnostics.breadcrumbs.length > 0) {
    const bcList = ticket.diagnostics.breadcrumbs;
    const itemsHtml = bcList.map(bc => {
      let badgeColor = 'var(--text-muted)';
      let badgeBg = 'rgba(255,255,255,0.06)';
      if (bc.category === 'CLICK_LINK') { badgeColor = '#38bdf8'; badgeBg = 'rgba(56, 189, 248, 0.12)'; }
      else if (bc.category === 'CLICK_BUTTON') { badgeColor = '#a855f7'; badgeBg = 'rgba(168, 85, 247, 0.12)'; }
      else if (bc.category === 'DEAD_CLICK') { badgeColor = '#f97316'; badgeBg = 'rgba(249, 115, 22, 0.15)'; }
      else if (bc.category === 'NAV_ROUTING') { badgeColor = '#22c55e'; badgeBg = 'rgba(34, 197, 94, 0.12)'; }
      else if (bc.category === 'JS_ERROR') { badgeColor = '#ef4444'; badgeBg = 'rgba(239, 68, 68, 0.15)'; }
      else if (bc.category === 'RATE_LIMIT_TOAST') { badgeColor = '#eab308'; badgeBg = 'rgba(234, 179, 8, 0.15)'; }
      else if (bc.category && bc.category.includes('SWITCH')) { badgeColor = '#818cf8'; badgeBg = 'rgba(129, 140, 248, 0.12)'; }

      const metaSnippet = (bc.metadata && Object.keys(bc.metadata).length > 0)
        ? `<div style="font-size:10px; color:var(--text-muted); font-family:monospace; margin-top:2px; word-break:break-all;">${escapeHtml(JSON.stringify(bc.metadata))}</div>`
        : '';

      return `
        <div style="display:flex; flex-direction:column; gap:2px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; align-items:center; gap:6px; font-size:10.5px;">
            <span style="color:var(--text-muted); font-family:monospace; font-size:10px;">${escapeHtml(bc.time || '-')}</span>
            <span style="background:${badgeBg}; color:${badgeColor}; padding:1px 5px; border-radius:3px; font-size:9.5px; font-weight:600;">${escapeHtml(bc.category)}</span>
            <span style="color:var(--text-primary); font-size:11px;">${escapeHtml(bc.message)}</span>
          </div>
          ${metaSnippet}
        </div>
      `;
    }).join('');

    htmlParts.unshift(`
      <details class="thread-diag-accordion" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; margin:8px 12px; padding:8px 12px; font-size:11px;">
        <summary style="cursor:pointer; font-weight:600; color:var(--accent-primary); display:flex; align-items:center; gap:6px; user-select:none;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Rekam Jejak Diagnostik (${bcList.length} Aksi Terakhir)
        </summary>
        <div style="margin-top:8px; max-height:220px; overflow-y:auto; padding-right:4px;">
          <div style="font-size:10.5px; color:var(--text-muted); margin-bottom:6px;">
            Toko Aktif: <b>${escapeHtml(ticket.diagnostics.activeStoreName || '-')}</b> &middot; URL: <code style="color:#38bdf8;">${escapeHtml(ticket.diagnostics.activeTabUrl || '-')}</code>
          </div>
          ${itemsHtml}
        </div>
      </details>
    `);
  }

  threadStream.innerHTML = htmlParts.join('');

  // Scroll otomatis ke paling bawah
  setTimeout(() => {
    threadStream.scrollTop = threadStream.scrollHeight;
  }, 40);
}

// ── Kirim Balasan pada Tiket ────────────────────────────────────────────────
async function submitTicketReply() {
  if (!activeSelectedTicketId) return;

  const replyTextInput = getEl('feedback-reply-text');
  const content = replyTextInput ? replyTextInput.value.trim() : '';
  if (!content && replyDraft.images.length === 0) {
    if (typeof showToast === 'function') showToast('Ketik pesan balasan atau lampirkan gambar!', 'error');
    return;
  }

  const btnSend = getEl('btn-send-ticket-reply');
  if (btnSend) btnSend.disabled = true;

  try {
    const res = await window.electronAPI.feedback.addReply(activeSelectedTicketId, {
      content: content,
      images: replyDraft.images
    });

    if (res && res.success) {
      if (replyTextInput) replyTextInput.value = '';
      replyDraft.images = [];
      renderReplyThumbnails();
      await selectFeedbackTicket(activeSelectedTicketId);
      if (typeof showToast === 'function') showToast('Balasan berhasil dikirim ke developer ✓', 'success');
    } else {
      throw new Error(res?.error || 'Gagal mengirim balasan');
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error');
  } finally {
    if (btnSend) btnSend.disabled = false;
  }
}
window.submitTicketReply = submitTicketReply;

// ── Toggle Status Selesai / Buka Kembali ─────────────────────────────────────
async function toggleTicketResolveState() {
  if (!activeSelectedTicketId) return;
  const currentTicket = allFeedbackTickets.find(t => t.id === activeSelectedTicketId);
  if (!currentTicket) return;

  const isResolved = currentTicket.status === 'resolved' || currentTicket.status === 'closed';
  const targetStatus = isResolved ? 'in_progress' : 'resolved';

  try {
    const res = await window.electronAPI.feedback.updateStatus(activeSelectedTicketId, targetStatus);
    if (res && res.success) {
      await loadFeedbackTickets(activeSelectedTicketId);
      if (typeof showToast === 'function') {
        showToast(isResolved ? 'Tiket dibuka kembali 🔄' : 'Tiket ditandai selesai (Resolved) ✓', 'success');
      }
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Gagal memperbarui status: ' + err.message, 'error');
  }
}
window.toggleTicketResolveState = toggleTicketResolveState;

// ── Perbarui Counter Unread Badges ──────────────────────────────────────────
async function refreshUnreadBadges() {
  try {
    if (!window.electronAPI || !window.electronAPI.feedback) return;
    const count = await window.electronAPI.feedback.getUnreadCount();
    const num = Number(count) || 0;

    const unreadTabBadge = getEl('feedback-tab-unread-count');
    const toolkitFeedbackBadge = getEl('toolkit-feedback-badge');

    if (unreadTabBadge) {
      unreadTabBadge.textContent = num;
      unreadTabBadge.style.display = num > 0 ? 'inline-block' : 'none';
    }

    if (toolkitFeedbackBadge) {
      toolkitFeedbackBadge.textContent = num;
      toolkitFeedbackBadge.style.display = num > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.warn('Failed to refresh unread badges:', err);
  }
}
window.refreshUnreadBadges = refreshUnreadBadges;

// ── Update Counter Karakter & Draf Form Baru ────────────────────────────────
function updateFeedbackCharCount() {
  const fMsg = getEl('feedback-message');
  const fChar = getEl('feedback-char-count');
  if (!fMsg || !fChar) return;
  const len = fMsg.value.length;
  fChar.textContent = `${len} / 5000`;
  fChar.style.color = len > 4500 ? '#ef4444' : 'var(--text-muted)';
  feedbackDraft.message = fMsg.value;
}

// ── Update Floating Dock Pill Text ──────────────────────────────────────────
function updateFeedbackDockPill() {
  const dockTitle = getEl('feedback-dock-title');
  const dockSub = getEl('feedback-dock-sub');
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

// ── On-Demand Cloud Sync Function ───────────────────────────────────────────
/**
 * Eksekusi On-Demand Sync dengan proteksi cooldown 15 detik
 * Sinkronisasi HANYA dipanggil saat CS membuka tab/modal atau menekan tombol segarkan.
 * TIDAK ADA interval timer background, sehingga kuota GAS 0 saat dashboard idle.
 */
async function triggerOnDemandFeedbackSync(force = false) {
  const now = Date.now();
  if (!force && (now - lastSyncCallTime < CLIENT_SYNC_MIN_INTERVAL_MS)) {
    await loadFeedbackTickets(activeSelectedTicketId);
    refreshUnreadBadges();
    return;
  }

  lastSyncCallTime = now;
  try {
    if (window.electronAPI && window.electronAPI.feedback) {
      await window.electronAPI.feedback.sync(force);
      await loadFeedbackTickets(activeSelectedTicketId);
      refreshUnreadBadges();
    }
  } catch (err) {
    console.warn('[Feedback Hub] On-demand sync notice:', err);
  }
}
window.triggerOnDemandFeedbackSync = triggerOnDemandFeedbackSync;

/**
 * Menangani notifikasi balasan developer baru yang dipiggyback via update telemetri berkala (30 menit)
 * Memberikan push alert visual (Toast) + Sound Chime + Update Unread Badge
 */
function handleIncomingDevReplies(replies) {
  if (!Array.isArray(replies) || replies.length === 0) return;

  // 1. Perbarui angka badge merah di menu Tools CS & tab Riwayat
  refreshUnreadBadges();

  // 2. Jika modal sedang terbuka, perbarui tampilan tiket aktif & sidebar
  const modal = getEl('feedback-modal');
  if (modal && modal.classList.contains('active')) {
    loadFeedbackTickets(activeSelectedTicketId, true);
  }

  // 3. Tampilkan Toast Notifikasi Interaktif
  const firstReply = replies[0];
  const devName = firstReply.message?.sender?.displayName || 'Developer';
  const snippet = firstReply.message?.content
    ? (firstReply.message.content.length > 55 ? firstReply.message.content.substring(0, 52) + '...' : firstReply.message.content)
    : 'Mengirim lampiran gambar';

  if (typeof showToast === 'function') {
    showToast(`📬 ${devName} membalas tiket #${firstReply.ticketId}: "${snippet}"`, 'info');
  }

  // 4. Mainkan audio chime notifikasi jika tersedia
  try {
    if (typeof playNotificationSound === 'function') {
      playNotificationSound();
    }
  } catch (e) {
    // Abaikan jika audio tidak tersedia
  }
}
window.handleIncomingDevReplies = handleIncomingDevReplies;

// ── Buka, Minimize, Restore & Discard Modal Feedback ─────────────────────────
function openFeedbackModal() {
  if (isFeedbackMinimized) {
    restoreFeedbackModal();
    return;
  }

  const modal = getEl('feedback-modal');
  const dockPill = getEl('feedback-dock-pill');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.remove('has-minimized-feedback');
    if (dockPill) dockPill.style.display = 'none';

    // Buka tab Riwayat jika sudah ada tiket, atau form Baru jika belum pernah ada
    const initialTab = (allFeedbackTickets && allFeedbackTickets.length > 0) ? 'history' : 'new';
    switchFeedbackTab(initialTab);
    loadFeedbackTickets();

    // Trigger On-Demand Cloud Sync (Throttled & Non-blocking)
    triggerOnDemandFeedbackSync(false);
  }
}

function minimizeFeedbackModal() {
  const modal = getEl('feedback-modal');
  const dockPill = getEl('feedback-dock-pill');
  const fMsg = getEl('feedback-message');
  const fType = getEl('feedback-type');

  if (!modal) return;
  isFeedbackMinimized = true;
  document.body.classList.add('has-minimized-feedback');
  modal.classList.remove('active');

  if (fMsg) feedbackDraft.message = fMsg.value;
  if (fType) feedbackDraft.type = fType.value;

  updateFeedbackDockPill();
  if (dockPill) {
    dockPill.style.display = 'flex';
  }

  if (typeof showToast === 'function') {
    showToast('📝 Form laporan diminimize ke pojok kanan bawah. Anda bebas mengambil screenshot.', '');
  }
}

function restoreFeedbackModal() {
  const modal = getEl('feedback-modal');
  const dockPill = getEl('feedback-dock-pill');
  const fMsg = getEl('feedback-message');
  const fType = getEl('feedback-type');

  isFeedbackMinimized = false;
  document.body.classList.remove('has-minimized-feedback');
  if (dockPill) dockPill.style.display = 'none';

  if (modal) {
    modal.classList.add('active');
    switchFeedbackTab('new');
    if (fMsg) {
      fMsg.value = feedbackDraft.message || '';
      fMsg.focus();
    }
    if (fType && feedbackDraft.type) {
      fType.value = feedbackDraft.type;
    }
    renderFeedbackThumbnails();
    updateFeedbackCharCount();
  }
}

function closeFeedbackModal() {
  const modal = getEl('feedback-modal');
  const dockPill = getEl('feedback-dock-pill');
  const fMsg = getEl('feedback-message');

  const hasContent = (fMsg && fMsg.value.trim().length > 0) || feedbackDraft.images.length > 0;
  if (hasContent && !isFeedbackMinimized && currentActiveTab === 'new') {
    minimizeFeedbackModal();
    return;
  }

  if (modal) {
    modal.classList.remove('active');
  }
  document.body.classList.remove('has-minimized-feedback');
  if (dockPill) dockPill.style.display = 'none';
}

function resetFeedbackDraft(showCancelToast = false) {
  const modal = getEl('feedback-modal');
  const dockPill = getEl('feedback-dock-pill');
  const fMsg = getEl('feedback-message');

  feedbackDraft = {
    type: 'bug',
    message: '',
    images: []
  };
  isFeedbackMinimized = false;
  document.body.classList.remove('has-minimized-feedback');
  if (dockPill) dockPill.style.display = 'none';
  if (modal) modal.classList.remove('active');
  if (fMsg) fMsg.value = '';
  renderFeedbackThumbnails();
  if (showCancelToast && typeof showToast === 'function') {
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

// ── Submit Feedback Form Baru ───────────────────────────────────────────────
async function handleNewFeedbackSubmit() {
  const fMsg = getEl('feedback-message');
  const fType = getEl('feedback-type');
  const btnSubmit = getEl('btn-feedback-submit');

  const msg = fMsg ? fMsg.value.trim() : '';
  if (!msg && feedbackDraft.images.length === 0) {
    if (typeof showToast === 'function') showToast('Harap isi deskripsi laporan atau lampirkan screenshot!', 'error');
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <span class="spinner-small" style="display:inline-block; width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px;"></span>
      Mengirim Laporan...
    `;
  }

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
    mimeType: img.mimeType,
    sizeFormatted: img.sizeFormatted
  }));

  const breadcrumbs = (window.DiagnosticLogger && typeof window.DiagnosticLogger.getBreadcrumbs === 'function')
    ? window.DiagnosticLogger.getBreadcrumbs()
    : [];

  const activeStoreObj = (typeof stores !== 'undefined' && Array.isArray(stores) && activeStoreId)
    ? stores.find(s => s.id === activeStoreId)
    : null;
  const activeWv = (typeof getActiveWebview === 'function') ? getActiveWebview() : null;
  let activeTabUrl = '-';
  try {
    if (activeWv && typeof activeWv.getURL === 'function') activeTabUrl = activeWv.getURL();
  } catch (e) { }

  const diagnosticsPayload = {
    appVersion: (window.VERSIONS_REGISTRY && typeof window.VERSIONS_REGISTRY.getLatestVersion === 'function')
      ? window.VERSIONS_REGISTRY.getLatestVersion()?.version || '1.0.17'
      : '1.0.17',
    activeStoreId: activeStoreId || '-',
    activeStoreName: activeStoreObj?.name || '-',
    activeStoreMarketplace: activeStoreObj?.marketplace || '-',
    activeTabUrl: activeTabUrl,
    breadcrumbsCount: breadcrumbs.length,
    breadcrumbs: breadcrumbs
  };

  try {
    const response = await window.electronAPI.feedback.createTicket({
      type: fType ? fType.value : 'bug',
      message: msg || `[Laporan berisi ${imagesPayload.length} lampiran gambar]`,
      storesConfig: safeConfig,
      images: imagesPayload,
      diagnostics: diagnosticsPayload
    });

    if (response && response.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('feedback_submitted');
      }
      const createdTicketId = response.ticket?.id;
      resetFeedbackDraft(false);

      // Beralih ke tab Riwayat dan langsung pilih tiket yang baru dibuat
      switchFeedbackTab('history');
      await loadFeedbackTickets(createdTicketId);

      if (typeof showToast === 'function') {
        showToast(`Laporan #${createdTicketId} berhasil dikirim ke tim pengembang!`, 'success');
      }
    } else {
      throw new Error((response && response.error) || 'Gagal mengirim laporan');
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Gagal mengirim feedback: ' + err.message, 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        Kirim Feedback
      `;
    }
  }
}

// ── Sinkronisasi Manual Cepat ───────────────────────────────────────────────
async function syncFeedbackNow() {
  const btn = getEl('btn-feedback-sync');
  if (btn) {
    btn.style.opacity = '0.5';
    btn.disabled = true;
  }
  try {
    await triggerOnDemandFeedbackSync(true);
    if (typeof showToast === 'function') showToast('Data tiket berhasil disinkronkan ✓', 'success');
  } catch (e) {
    if (typeof showToast === 'function') showToast('Gagal sinkron: ' + e.message, 'error');
  } finally {
    if (btn) {
      btn.style.opacity = '1';
      btn.disabled = false;
    }
  }
}
window.syncFeedbackNow = syncFeedbackNow;

// ── Bind Event Listeners ────────────────────────────────────────────────────
function initFeedbackEventListeners() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-feedback') || e.target.closest('#tool-item-feedback')) {
      openFeedbackModal();
    } else if (e.target.id === 'feedback-modal') {
      closeFeedbackModal();
    }
  });

  const btnClose = getEl('btn-feedback-close');
  if (btnClose) btnClose.addEventListener('click', closeFeedbackModal);

  const btnCancel = getEl('btn-feedback-cancel');
  if (btnCancel) btnCancel.addEventListener('click', discardFeedbackDraft);

  const btnMin = getEl('btn-feedback-minimize');
  if (btnMin) btnMin.addEventListener('click', minimizeFeedbackModal);

  const btnMinFooter = getEl('btn-feedback-min-footer');
  if (btnMinFooter) btnMinFooter.addEventListener('click', minimizeFeedbackModal);

  const btnDockRestore = getEl('btn-feedback-dock-restore');
  if (btnDockRestore) btnDockRestore.addEventListener('click', restoreFeedbackModal);

  const btnDockDiscard = getEl('btn-feedback-dock-discard');
  if (btnDockDiscard) btnDockDiscard.addEventListener('click', (e) => {
    e.stopPropagation();
    discardFeedbackDraft();
  });

  const btnSubmit = getEl('btn-feedback-submit');
  if (btnSubmit) btnSubmit.addEventListener('click', handleNewFeedbackSubmit);

  const fMsg = getEl('feedback-message');
  if (fMsg) {
    fMsg.addEventListener('input', updateFeedbackCharCount);
    fMsg.addEventListener('paste', handleFeedbackPaste);
  }

  const replyInput = getEl('feedback-reply-text');
  if (replyInput) {
    replyInput.addEventListener('paste', handleFeedbackPaste);
    replyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitTicketReply();
      }
    });
  }

  const fModal = getEl('feedback-modal');
  if (fModal) {
    fModal.addEventListener('paste', handleFeedbackPaste);
  }

  const btnCapture = getEl('btn-feedback-capture-screen');
  if (btnCapture) {
    btnCapture.addEventListener('click', handleCaptureDashboardScreen);
  }

  const btnUpload = getEl('btn-feedback-upload-file');
  const fileInput = getEl('feedback-file-input');
  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (feedbackDraft.images.length >= 4) break;
          await addFeedbackImage(files[i], files[i].name);
        }
        fileInput.value = '';
      }
    });
  }

  const btnReplyAttach = getEl('btn-reply-attach-img');
  const replyFileInput = getEl('feedback-reply-file-input');
  if (btnReplyAttach && replyFileInput) {
    btnReplyAttach.addEventListener('click', () => replyFileInput.click());
    replyFileInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (replyDraft.images.length >= 4) break;
          await addReplyImage(files[i], files[i].name);
        }
        replyFileInput.value = '';
      }
    });
  }

  const dropzone = getEl('feedback-dropzone');
  if (dropzone) {
    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
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
  // Catat aktivitas di modal untuk menjaga polling tetap aktif saat user aktif
}

// Inisialisasi awal
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initFeedbackEventListeners();
    refreshUnreadBadges();
  });
} else {
  initFeedbackEventListeners();
  refreshUnreadBadges();
}
