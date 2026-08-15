/**
 * js/quickreply.js
 * Smart Template & Quick Reply Manager with Clipboard Variable Interpolation
 */

// ── State ────────────────────────────────────────────────────────────────────
let smartTemplates = [];
let activeQuickReplyCategory = 'all';
let currentClipboardValue = '';
let clipboardHistory = [];
let editingTemplateId = null;

// Expose currentClipboardValue to window for shared utils
window.currentClipboardValue = '';

function loadSmartTemplates() {
  smartTemplates = Storage.get('smartTemplates', DEFAULT_SMART_TEMPLATES);
  if (!Array.isArray(smartTemplates) || smartTemplates.length === 0) {
    smartTemplates = [...DEFAULT_SMART_TEMPLATES];
  }

  // Load persisted global clipboard agar selalu aktif antar toko & antar aplikasi
  const savedClip = Storage.get('globalCapturedClipboard', '', false) || Storage.get('lastCapturedClipboard', '', false);
  if (savedClip) {
    currentClipboardValue = savedClip;
    window.currentClipboardValue = savedClip;
  }

  // Load history clipboard
  clipboardHistory = Storage.get('globalClipboardHistory', [], false);
  if (!Array.isArray(clipboardHistory)) {
    clipboardHistory = [];
  }
}

function setCapturedClipboard(text, source = '', lastUsedStore = '') {
  if (!text || typeof text !== 'string') return;
  let clean = text.trim();
  if (!clean) return;

  // Batasi ukuran maksimal teks clipboard (misal 3000 karakter) agar tidak overload memori/localStorage
  if (clean.length > 3000) {
    clean = clean.substring(0, 3000);
  }

  currentClipboardValue = clean;
  window.currentClipboardValue = clean;
  // Simpan secara global untuk semua toko dan sesi
  Storage.set('globalCapturedClipboard', clean, false);
  Storage.set('lastCapturedClipboard', clean, false);

  // Auto-detect source jika tidak disertakan
  let detectedSource = source;
  if (!detectedSource) {
    const currentStore = typeof stores !== 'undefined' ? stores.find(s => s.id === activeStoreId) : null;
    if (currentStore) {
      const mpIcons = { shopee: '🛍️', tokopedia: '🟢', lazada: '🔵', tiktok: '⬛', blibli: '🔷', bukalapak: '🔴' };
      const icon = mpIcons[currentStore.marketplace] || '🛒';
      detectedSource = `${icon} ${currentStore.name}`;
    } else {
      detectedSource = '💬 WhatsApp / Luar';
    }
  }

  // Update or prepend to clipboardHistory
  const existingIdx = clipboardHistory.findIndex(item => item.text === clean);
  if (existingIdx >= 0) {
    const existing = clipboardHistory.splice(existingIdx, 1)[0];
    existing.time = Date.now();
    if (source) existing.source = source;
    if (lastUsedStore) existing.lastUsedStore = lastUsedStore;
    clipboardHistory.unshift(existing);
  } else {
    clipboardHistory.unshift({
      id: 'clip-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      text: clean,
      source: detectedSource,
      lastUsedStore: lastUsedStore || detectedSource,
      time: Date.now()
    });
  }

  // Batasi maksimal 15 riwayat
  if (clipboardHistory.length > 15) {
    clipboardHistory = clipboardHistory.slice(0, 15);
  }

  Storage.set('globalClipboardHistory', clipboardHistory, false);

  const clipInput = document.getElementById('qr-clipboard-input');
  if (clipInput) {
    clipInput.value = clean;
  }

  if (typeof updateStatusBarClipboard === 'function') {
    updateStatusBarClipboard(true);
  }

  const drawer = document.getElementById('quickreply-drawer');
  if (drawer && drawer.classList.contains('active')) {
    renderQuickReplyList();
  }

  broadcastTemplatesToWebviews();
}

function selectClipboardFromHistory(id) {
  const item = clipboardHistory.find(i => i.id === id);
  if (!item) return;

  setCapturedClipboard(item.text, item.source, item.lastUsedStore);
  
  if (window.electronAPI && typeof window.electronAPI.writeClipboard === 'function') {
    window.electronAPI.writeClipboard(item.text);
  }

  if (typeof showToast === 'function') {
    showToast(`📋 Clipboard aktif: ${item.text.length > 25 ? item.text.substring(0, 23) + '…' : item.text}`, 'success');
  }
}

async function clearClipboardHistory() {
  const confirmed = await showConfirmDialog({
    title: 'Hapus Riwayat Clipboard',
    message: 'Apakah Anda yakin ingin menghapus seluruh riwayat teks clipboard?',
    type: 'warning',
    icon: '📋',
    confirmText: 'Bersihkan Riwayat',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-warning'
  });
  if (confirmed) {
    clipboardHistory = [];
    Storage.remove('globalClipboardHistory', false);
    if (typeof updateStatusBarClipboard === 'function') {
      updateStatusBarClipboard(true);
    }
    broadcastTemplatesToWebviews();
    if (typeof showToast === 'function') {
      showToast('Riwayat clipboard dibersihkan.', '');
    }
  }
}

function toggleDrawerClipboardHistory() {
  let histEl = document.getElementById('qr-drawer-clip-history');
  if (!histEl) {
    histEl = document.createElement('div');
    histEl.id = 'qr-drawer-clip-history';
    histEl.className = 'qr-drawer-clip-history';
    const wrapper = document.querySelector('.qr-clip-input-wrapper');
    if (wrapper) {
      wrapper.parentNode.insertBefore(histEl, wrapper.nextSibling);
    }
  }

  if (histEl.style.display === 'flex') {
    histEl.style.display = 'none';
    return;
  }

  if (clipboardHistory.length === 0) {
    histEl.innerHTML = '<div style="padding:10px; color:var(--text-muted); font-size:11.5px; text-align:center;">Belum ada riwayat clipboard.</div>';
    histEl.style.display = 'flex';
    return;
  }

  let html = `
    <div style="padding:6px 10px; font-weight:700; font-size:11px; color:#f59e0b; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color);">
      <span>Riwayat Clipboard (${clipboardHistory.length})</span>
      <button style="background:none; border:none; color:var(--text-muted); font-size:10px; cursor:pointer;" onclick="clearClipboardHistory()">Bersihkan</button>
    </div>
  `;

  clipboardHistory.forEach(item => {
    const isActive = item.text === currentClipboardValue;
    const relTime = formatRelativeTime(item.time);
    const rawText = (item.text || '').trim();
    const cleanText = rawText.replace(/[\r\n\t]+/g, ' ');
    const previewText = cleanText.length > 80 ? cleanText.substring(0, 77) + '…' : cleanText;
    const tooltipTitle = escapeHtml(rawText.length > 180 ? rawText.substring(0, 177) + '…' : rawText);

    html += `
      <div class="qr-hist-row ${isActive ? 'active' : ''}" onclick="selectClipboardFromHistory('${item.id}'); document.getElementById('qr-drawer-clip-history').style.display='none';" title="${tooltipTitle}">
        <div style="font-family:monospace; font-weight:600; font-size:11.5px; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(previewText)}</div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted);">
          <span>${escapeHtml(item.source || 'Luar')}</span>
          <span>${relTime}</span>
        </div>
      </div>
    `;
  });

  histEl.innerHTML = html;
  histEl.style.display = 'flex';
}

function broadcastTemplatesToWebviews() {
  if (typeof webviewMap === 'undefined' || typeof storeTabs === 'undefined') return;
  
  const theme = typeof currentTheme !== 'undefined' ? currentTheme : (document.documentElement.getAttribute('data-theme') || 'dark');

  Object.entries(webviewMap).forEach(([tabId, entry]) => {
    if (entry.webview && !entry.hibernated) {
      try {
        const storeId = Object.keys(storeTabs).find(sid =>
          storeTabs[sid].some(t => t.id === tabId)
        );
        const store = typeof stores !== 'undefined' ? stores.find(s => s.id === storeId) : null;
        entry.webview.send('sync-smart-templates', {
          templates: smartTemplates,
          storeName: store?.name || '',
          clipboard: currentClipboardValue,
          history: clipboardHistory,
          theme: theme
        });
      } catch (e) {}
    }
  });
}

function saveSmartTemplates() {
  Storage.set('smartTemplates', smartTemplates);
  broadcastTemplatesToWebviews();
}

// ── Render Templates List ────────────────────────────────────────────────────
function renderQuickReplyList() {
  const container = document.getElementById('qr-templates-list');
  const searchInput = document.getElementById('qr-search-input');
  if (!container) return;

  const query = (searchInput?.value || '').toLowerCase().trim();

  let filtered = smartTemplates.filter(tpl => {
    const matchCat = activeQuickReplyCategory === 'all' || tpl.category === activeQuickReplyCategory;
    const matchQuery = !query || 
      tpl.title.toLowerCase().includes(query) || 
      tpl.content.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="qr-empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <p>Tidak ada template ditemukan</p>
      </div>`;
    return;
  }

  const categoryLabels = {
    greeting: 'Sapaan',
    order: 'Pesanan & Resi',
    complaint: 'Komplain / Retur',
    product: 'Info Produk',
    custom: 'Kustom'
  };

  container.innerHTML = filtered.map(tpl => {
    const resolved = resolveTemplateVariables(tpl.content);
    // Highlight variable replacements for visual delight
    const clipValToSearch = currentClipboardValue.trim() || '...';
    let highlightedPreview = escapeHtml(resolved);
    if (clipValToSearch && clipValToSearch !== '...') {
      try {
        const escapedClip = escapeHtml(clipValToSearch);
        const safeRegexStr = escapedClip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedPreview = highlightedPreview.replace(
          new RegExp(safeRegexStr, 'g'), 
          `<mark class="qr-clip-highlight">${escapedClip}</mark>`
        );
      } catch (e) {}
    }

    return `
      <div class="qr-template-card" data-id="${tpl.id}">
        <div class="qr-card-header">
          <span class="qr-card-title">${escapeHtml(tpl.title)}</span>
          <span class="qr-card-category badge-${tpl.category || 'custom'}">${categoryLabels[tpl.category] || 'Kustom'}</span>
        </div>
        <div class="qr-card-content">${highlightedPreview}</div>
        <div class="qr-card-actions">
          <button class="qr-btn-insert" title="Ketik langsung ke chat marketplace aktif" onclick="insertTemplateToActiveChat('${tpl.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Sisipkan ke Chat
          </button>
          <button class="qr-btn-action" title="Salin ke Clipboard" onclick="copyTemplateToClipboard('${tpl.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Salin
          </button>
          <button class="qr-btn-action-icon" title="Edit Template" onclick="openEditTemplateModal('${tpl.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="qr-btn-action-icon danger" title="Hapus Template" onclick="deleteTemplate('${tpl.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Open / Close / Toggle Quick Reply Drawer ─────────────────────────────────
async function openQuickReplyDrawer() {
  const drawer = document.getElementById('quickreply-drawer');
  const backdrop = document.getElementById('quickreply-backdrop');
  const clipInput = document.getElementById('qr-clipboard-input');
  if (!drawer || !backdrop) return;

  // Sembunyikan tombol floating saat drawer aktif
  document.body.classList.add('has-quickreply-open');

  // Baca live clipboard dari Windows
  try {
    if (window.electronAPI && typeof window.electronAPI.readClipboard === 'function') {
      currentClipboardValue = (await window.electronAPI.readClipboard()) || '';
    } else if (navigator.clipboard) {
      currentClipboardValue = (await navigator.clipboard.readText()) || '';
    }
  } catch (e) {
    currentClipboardValue = '';
  }

  // Isi input variabel clipboard di header
  if (clipInput) {
    clipInput.value = currentClipboardValue;
  }

  drawer.classList.add('active');
  backdrop.classList.add('active');

  renderQuickReplyList();

  // Focus search input
  setTimeout(() => {
    document.getElementById('qr-search-input')?.focus();
  }, 100);

  if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('use_quickreply');
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track('quick_reply_drawer_opened');
  }
}

function closeQuickReplyDrawer() {
  const drawer = document.getElementById('quickreply-drawer');
  const backdrop = document.getElementById('quickreply-backdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('has-quickreply-open');
}

function toggleQuickReplyDrawer() {
  const drawer = document.getElementById('quickreply-drawer');
  if (drawer && drawer.classList.contains('active')) {
    closeQuickReplyDrawer();
  } else {
    openQuickReplyDrawer();
  }
}

// ── Insert Template to Active Webview ─────────────────────────────────────────
function insertTemplateToActiveChat(templateId) {
  const tpl = smartTemplates.find(t => t.id === templateId);
  if (!tpl) return;

  const clipInput = document.getElementById('qr-clipboard-input');
  const customClip = clipInput ? clipInput.value : currentClipboardValue;
  const resolved = resolveTemplateVariables(tpl.content, customClip);

  if (window.AppTelemetry) {
    window.AppTelemetry.track('quick_reply_used');
  }

  const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;
  const wv = activeTabId ? webviewMap[activeTabId]?.webview : null;

  if (wv) {
    try {
      wv.send('insert-chat-text', resolved);
      showToast('⚡ Template berhasil diketik ke chat!', 'success');
      closeQuickReplyDrawer();
    } catch (e) {
      // Fallback copy jika webview error
      copyResolvedText(resolved);
    }
  } else {
    copyResolvedText(resolved);
    showToast('Teks disalin! Buka toko untuk paste.', 'success');
  }
}

// ── Copy Template to Clipboard ───────────────────────────────────────────────
function copyTemplateToClipboard(templateId) {
  const tpl = smartTemplates.find(t => t.id === templateId);
  if (!tpl) return;

  const clipInput = document.getElementById('qr-clipboard-input');
  const customClip = clipInput ? clipInput.value : currentClipboardValue;
  const resolved = resolveTemplateVariables(tpl.content, customClip);

  if (window.AppTelemetry) {
    window.AppTelemetry.track('quick_reply_used');
  }

  copyResolvedText(resolved);
  showToast('✓ Teks template disalin ke clipboard!', 'success');
}

function copyResolvedText(text) {
  if (window.electronAPI && typeof window.electronAPI.writeClipboard === 'function') {
    window.electronAPI.writeClipboard(text);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

// ── CRUD Template Handlers ───────────────────────────────────────────────────
function openAddTemplateModal() {
  // Tutup drawer terlebih dahulu agar modal bersih
  closeQuickReplyDrawer();

  editingTemplateId = null;
  document.getElementById('modal-tpl-title').textContent = 'Tambah Template Smart Reply';
  document.getElementById('tpl-name-input').value = '';
  document.getElementById('tpl-cat-select').value = 'greeting';
  document.getElementById('tpl-content-input').value = '';
  document.getElementById('modal-template-overlay')?.classList.add('active');
  setTimeout(() => document.getElementById('tpl-name-input')?.focus(), 150);
}

function openEditTemplateModal(id) {
  const tpl = smartTemplates.find(t => t.id === id);
  if (!tpl) return;

  // Tutup drawer terlebih dahulu agar modal bersih
  closeQuickReplyDrawer();

  editingTemplateId = id;
  document.getElementById('modal-tpl-title').textContent = 'Edit Template Smart Reply';
  document.getElementById('tpl-name-input').value = tpl.title;
  document.getElementById('tpl-cat-select').value = tpl.category || 'custom';
  document.getElementById('tpl-content-input').value = tpl.content;
  document.getElementById('modal-template-overlay')?.classList.add('active');
  setTimeout(() => document.getElementById('tpl-name-input')?.focus(), 150);
}

function closeTemplateModal(reopenDrawer = true) {
  document.getElementById('modal-template-overlay')?.classList.remove('active');
  editingTemplateId = null;
  if (reopenDrawer) {
    setTimeout(() => openQuickReplyDrawer(), 100);
  }
}

function saveTemplateFromModal() {
  const title = document.getElementById('tpl-name-input').value.trim();
  const category = document.getElementById('tpl-cat-select').value;
  const content = document.getElementById('tpl-content-input').value.trim();

  if (!title || !content) {
    showToast('Judul dan isi template wajib diisi!', 'error');
    return;
  }

  if (editingTemplateId) {
    const idx = smartTemplates.findIndex(t => t.id === editingTemplateId);
    if (idx !== -1) {
      smartTemplates[idx].title = title;
      smartTemplates[idx].category = category;
      smartTemplates[idx].content = content;
    }
  } else {
    smartTemplates.push({
      id: 'tpl-' + Date.now(),
      title,
      category,
      content
    });
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track(editingTemplateId ? 'quick_reply_edited' : 'quick_reply_created');
  }

  saveSmartTemplates();
  closeTemplateModal(true);
  showToast(editingTemplateId ? 'Template diperbarui ✓' : 'Template baru ditambahkan ✓', 'success');
}

async function deleteTemplate(id) {
  const tpl = smartTemplates.find(t => t.id === id);
  if (!tpl) return;

  const confirmed = await showConfirmDialog({
    title: 'Hapus Template',
    message: `Apakah Anda yakin ingin menghapus template balasan <strong>"${escapeHtml(tpl.title)}"</strong>?`,
    type: 'danger',
    icon: '🗑️',
    confirmText: 'Hapus Template',
    cancelText: 'Batal'
  });
  if (confirmed) {
    smartTemplates = smartTemplates.filter(t => t.id !== id);
    saveSmartTemplates();
    renderQuickReplyList();
    showToast('Template dihapus.', 'success');
  }
}

async function resetDefaultTemplates() {
  const confirmed = await showConfirmDialog({
    title: 'Kembalikan Template Default',
    message: 'Kembalikan seluruh template Quick Reply ke bawaan pabrik?<br><br><span style="color:#ef4444; font-size:12.5px;">⚠️ Template kustom yang telah Anda buat/edit akan ter-reset.</span>',
    type: 'warning',
    icon: '🔄',
    confirmText: 'Reset ke Bawaan',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-warning'
  });
  if (confirmed) {
    smartTemplates = [...DEFAULT_SMART_TEMPLATES];
    saveSmartTemplates();
    renderQuickReplyList();
    showToast('Template di-reset ke bawaan ✓', 'success');
  }
}

// ── Variable Pill Click Inserter (Modal Helper) ──────────────────────────────
function insertVariableToModalContent(varTag) {
  const textarea = document.getElementById('tpl-content-input');
  if (!textarea) return;

  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value || '';

  textarea.value = val.substring(0, start) + varTag + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + varTag.length;
  textarea.focus();
}

// ── Bind Quick Reply Events ──────────────────────────────────────────────────
function bindQuickReplyEvents() {
  loadSmartTemplates();

  // Drawer Toggle button in Statusbar / Titlebar & Floating Button
  document.getElementById('btn-quick-reply')?.addEventListener('click', toggleQuickReplyDrawer);
  document.getElementById('btn-quick-reply-float')?.addEventListener('click', toggleQuickReplyDrawer);
  document.getElementById('qr-drawer-close')?.addEventListener('click', closeQuickReplyDrawer);
  document.getElementById('quickreply-backdrop')?.addEventListener('click', closeQuickReplyDrawer);

  // Search input
  document.getElementById('qr-search-input')?.addEventListener('input', renderQuickReplyList);

  // Live Clipboard Value change manual
  document.getElementById('qr-clipboard-input')?.addEventListener('input', (e) => {
    setCapturedClipboard(e.target.value);
  });

  // Auto-listen clipboard changes dari Windows OS
  if (window.electronAPI && typeof window.electronAPI.onClipboardChanged === 'function') {
    window.electronAPI.onClipboardChanged((text) => {
      setCapturedClipboard(text);
    });
  }

  // Baca clipboard saat awal inisialisasi (hasil Cut/Copy dari luar)
  if (window.electronAPI && typeof window.electronAPI.readClipboard === 'function') {
    window.electronAPI.readClipboard().then(text => {
      if (text) setCapturedClipboard(text);
    }).catch(() => {});
  }

  // History Clipboard button
  document.getElementById('btn-qr-history-clip')?.addEventListener('click', toggleDrawerClipboardHistory);

  // Refresh Clipboard button
  document.getElementById('btn-qr-refresh-clip')?.addEventListener('click', async () => {
    try {
      if (window.electronAPI && typeof window.electronAPI.readClipboard === 'function') {
        const text = await window.electronAPI.readClipboard();
        if (text) setCapturedClipboard(text);
      }
    } catch (e) {}
    renderQuickReplyList();
    showToast('Clipboard di-refresh ✓', '');
  });

  // Category Tabs
  document.querySelectorAll('.qr-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qr-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeQuickReplyCategory = btn.dataset.category || 'all';
      renderQuickReplyList();
    });
  });

  // Add Template button
  document.getElementById('btn-qr-add-template')?.addEventListener('click', openAddTemplateModal);
  document.getElementById('btn-qr-reset-default')?.addEventListener('click', resetDefaultTemplates);

  // Modal events
  document.getElementById('modal-tpl-close')?.addEventListener('click', () => closeTemplateModal(true));
  document.getElementById('btn-tpl-modal-cancel')?.addEventListener('click', () => closeTemplateModal(true));
  document.getElementById('modal-template-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-template-overlay') {
      closeTemplateModal(true);
    }
  });
  document.getElementById('btn-tpl-modal-save')?.addEventListener('click', saveTemplateFromModal);

  // Variable helper buttons in modal
  document.querySelectorAll('.var-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      insertVariableToModalContent(btn.dataset.var);
    });
  });

  // Global Keyboard Shortcuts on main window
  window.addEventListener('keydown', (e) => {
    // Ctrl + Space atau Alt + Q
    if ((e.ctrlKey && e.code === 'Space') || (e.altKey && (e.key === 'q' || e.key === 'Q'))) {
      e.preventDefault();
      const drawer = document.getElementById('quickreply-drawer');
      if (drawer?.classList.contains('active')) {
        closeQuickReplyDrawer();
      } else {
        openQuickReplyDrawer();
      }
      return;
    }

    // Switch Store Shortcut on Main Window (Ctrl+1 .. Ctrl+9)
    if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      const ordered = typeof getOrderedStores === 'function' ? getOrderedStores() : stores;
      if (ordered && ordered[idx]) {
        e.preventDefault();
        activateStore(ordered[idx].id);
      }
      return;
    }

    // Switch Store Relative (Alt+Up / Alt+Down)
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const delta = e.key === 'ArrowUp' ? -1 : 1;
      const ordered = typeof getOrderedStores === 'function' ? getOrderedStores() : stores;
      if (ordered && ordered.length > 0) {
        const curIdx = ordered.findIndex(s => s.id === activeStoreId);
        let nextIdx = curIdx + delta;
        if (nextIdx < 0) nextIdx = ordered.length - 1;
        if (nextIdx >= ordered.length) nextIdx = 0;
        e.preventDefault();
        activateStore(ordered[nextIdx].id);
      }
      return;
    }

    // Escape closes drawer
    if (e.key === 'Escape') {
      const drawer = document.getElementById('quickreply-drawer');
      if (drawer?.classList.contains('active')) {
        closeQuickReplyDrawer();
      }
    }
  });
}

// Expose globals for inline HTML onclicks
window.openQuickReplyDrawer        = openQuickReplyDrawer;
window.closeQuickReplyDrawer       = closeQuickReplyDrawer;
window.insertTemplateToActiveChat  = insertTemplateToActiveChat;
window.copyTemplateToClipboard     = copyTemplateToClipboard;
window.openAddTemplateModal        = openAddTemplateModal;
window.openEditTemplateModal       = openEditTemplateModal;
window.deleteTemplate              = deleteTemplate;
window.resetDefaultTemplates       = resetDefaultTemplates;
window.bindQuickReplyEvents        = bindQuickReplyEvents;
window.setCapturedClipboard        = setCapturedClipboard;
window.selectClipboardFromHistory  = selectClipboardFromHistory;
window.clearClipboardHistory       = clearClipboardHistory;
window.broadcastTemplatesToWebviews = broadcastTemplatesToWebviews;
