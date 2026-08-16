// ── Modal: Add/Edit Store ─────────────────────────────────────────────────────
function openAddModal() {
  editingStoreId = null;
  modalTitle.textContent = 'Tambah Toko Baru';
  document.getElementById('btn-modal-save').textContent = 'Simpan Toko';
  fieldStoreId.value       = '';
  fieldStoreName.value     = '';
  fieldStoreInitials.value = '';
  fieldStoreUrl.value      = '';
  setSelectedMarketplace('shopee');
  setSelectedColor('');
  customUrlGroup.style.display = 'none';
  modalOverlay.classList.add('active');
  setTimeout(() => fieldStoreName.focus(), 200);
}

function openEditModal(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  editingStoreId = storeId;
  modalTitle.textContent = 'Edit Toko';
  document.getElementById('btn-modal-save').textContent = 'Update Toko';

  fieldStoreId.value       = store.id;
  fieldStoreName.value     = store.name;
  fieldStoreInitials.value = store.initials || '';
  setSelectedMarketplace(store.marketplace);
  setSelectedColor(store.color || '');

  if (store.marketplace === 'custom') {
    fieldStoreUrl.value = store.url;
    customUrlGroup.style.display = 'flex';
  } else {
    customUrlGroup.style.display = 'none';
  }
  updateUrlPreview(store.marketplace, store.url);

  settingsOverlay.classList.remove('active');
  modalOverlay.classList.add('active');
  setTimeout(() => fieldStoreName.focus(), 200);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  editingStoreId = null;
}

function setSelectedMarketplace(value) {
  fieldStoreMarketplace.value = value;
  document.querySelectorAll('.mp-option').forEach(el => {
    const isSelected = el.dataset.value === value;
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
  updateUrlPreview(value, fieldStoreUrl.value);
}

function setSelectedColor(colorHex) {
  let found = false;
  document.querySelectorAll('.color-preset').forEach(el => {
    const match = (el.dataset.color || '').toLowerCase() === (colorHex || '').toLowerCase();
    el.classList.toggle('active', match);
    el.setAttribute('aria-checked', match ? 'true' : 'false');
    if (match) found = true;
  });
  if (colorHex && !found) {
    fieldStoreColor.value = colorHex;
  }
}

function getSelectedColor() {
  const activePreset = colorPickerWrapper.querySelector('.color-preset.active');
  if (activePreset) {
    return activePreset.dataset.color || '';
  }
  return fieldStoreColor.value || '';
}

function updateUrlPreview(marketplace, customUrl) {
  const cfg = MARKETPLACE_CONFIG[marketplace] || MARKETPLACE_CONFIG.custom;
  urlPreview.textContent = marketplace === 'custom'
    ? (customUrl || '(masukkan URL di atas)')
    : cfg.url;
}

async function saveStore() {
  const name        = fieldStoreName.value.trim();
  const initials    = fieldStoreInitials.value.trim().toUpperCase();
  const marketplace = fieldStoreMarketplace.value;
  const color       = getSelectedColor();

  if (!name) {
    fieldStoreName.focus();
    showToast('Nama toko tidak boleh kosong!', 'error');
    return;
  }

  const cfg = MARKETPLACE_CONFIG[marketplace] || MARKETPLACE_CONFIG.custom;
  let url   = marketplace === 'custom' ? fieldStoreUrl.value.trim() : cfg.url;

  if (marketplace === 'custom' && !url) {
    fieldStoreUrl.focus();
    showToast('Masukkan URL untuk marketplace custom!', 'error');
    return;
  }

  if (editingStoreId) {
    const idx = stores.findIndex(s => s.id === editingStoreId);
    if (idx !== -1) {
      stores[idx].name        = name;
      stores[idx].initials    = initials;
      stores[idx].marketplace = marketplace;
      stores[idx].url         = url;
      stores[idx].color       = color;
    }
  } else {
    const id = `${marketplace}-${Date.now()}`;
    stores.push({ id, name, initials, marketplace, url, color, partition: `persist:${id}` });
  }

  const btnSave = document.getElementById('btn-modal-save');
  const originalText = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-top-color: white; border-right-color: white;"></span> Menyimpan...';
  btnSave.setAttribute('aria-busy', 'true');

  const ok = await window.electronAPI.saveStores(stores, window.currentUser);

  btnSave.disabled = false;
  btnSave.innerHTML = originalText;
  btnSave.removeAttribute('aria-busy');
  if (ok) {
    if (window.AppTelemetry) {
      window.AppTelemetry.track(editingStoreId ? 'store_edited' : 'store_added');
    }
    closeModal();
    renderSidebar(getFilteredStores());
    renderTabBar();
    renderSettingsList();
    updateEmptyState();
    showToast(editingStoreId ? 'Toko berhasil diperbarui ✓' : 'Toko baru ditambahkan ✓', 'success');
    if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
      window.OnboardingManager.notifyAction('add_store');
    }
  } else {
    showToast('Gagal menyimpan. Coba lagi.', 'error');
  }
}

async function deleteStore(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  const confirmed = await showConfirmDialog({
    title: 'Hapus Toko',
    message: `Apakah Anda yakin ingin menghapus toko <strong>"${escapeHtml(store.name)}"</strong> dari daftar toko?<br><br><span style="color:var(--text-muted); font-size:12px;">ℹ️ Sesi login akan tetap tersimpan di perangkat.</span>`,
    type: 'danger',
    icon: '🗑️',
    confirmText: 'Hapus Toko',
    cancelText: 'Batal'
  });
  if (!confirmed) return;

  // Remove all tab webviews for this store
  const tabs = storeTabs[storeId] || [];
  tabs.forEach(tab => {
    if (webviewMap[tab.id]) {
      webviewMap[tab.id].webview?.remove();
      webviewMap[tab.id].loading?.remove();
      delete webviewMap[tab.id];
    }
  });
  delete storeTabs[storeId];
  delete activeTabMap[storeId];
  delete unreadMap[storeId];

  if (activeStoreId === storeId) {
    activeStoreId = null;
    webviewCont.classList.remove('active');
    tabBar.style.display = 'none';
    updateEmptyState();
  }

  stores = stores.filter(s => s.id !== storeId);
  await window.electronAPI.saveStores(stores, window.currentUser);
  renderSidebar(getFilteredStores());
  renderSettingsList();
  showToast('Toko dihapus.', 'success');
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
function openSettings() {
  document.getElementById('tab-btn-stores')?.click();
  renderSettingsList();
  updateCacheSizeDisplay();
  settingsOverlay.classList.add('active');
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('active');
}
window.openSettings = openSettings;
window.closeSettings = closeSettings;

async function updateCacheSizeDisplay() {
  const badge = document.getElementById('settings-cache-size-badge');
  if (!badge) return;
  badge.textContent = 'Menghitung...';
  try {
    const res = await window.electronAPI.getCacheSize();
    if (res && res.formatted) {
      badge.textContent = res.formatted;
    } else {
      badge.textContent = '-';
    }
  } catch (e) {
    badge.textContent = '-';
  }
}

function renderSettingsList() {
  const ordered = typeof getOrderedStores === 'function' ? getOrderedStores() : stores;
  if (ordered.length === 0) {
    storesListSettings.innerHTML = `<div class="no-stores-msg">Belum ada toko yang ditambahkan.</div>`;
    return;
  }

  // Group by marketplace (sama persis dengan urutan dan pengelompokan di Sidebar)
  const groups = {};
  ordered.forEach(store => {
    if (!groups[store.marketplace]) groups[store.marketplace] = [];
    groups[store.marketplace].push(store);
  });

  let html = '';
  for (const [mp, mpStores] of Object.entries(groups)) {
    const cfg = MARKETPLACE_CONFIG[mp] || MARKETPLACE_CONFIG.custom;
    html += `
      <div class="settings-group-header">
        <span class="settings-group-dot" style="background:${cfg.groupColor || '#DF1683'};"></span>
        ${cfg.label || mp}
      </div>`;
    
    mpStores.forEach(store => {
      const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
      const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
      const isWhitelisted = store.hibernationWhitelisted === true;
      html += `
        <div class="settings-store-item">
          <div class="settings-store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}</div>
          <div class="settings-store-info">
            <div class="settings-store-name">${escapeHtml(store.name)}</div>
            <div class="settings-store-url">${escapeHtml(store.url || cfg.url)}</div>
          </div>
          <div class="settings-store-actions">
            <!-- Opsi 2: Clear Cache & Reload Toko -->
            <button class="btn-icon" title="Clear Cache & Reload Toko Ini (Login Tetap Aman)" aria-label="Clear Cache & Reload Toko Ini" onclick="clearStoreCacheAndReload('${store.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </button>
            <!-- Opsi 3: Reset Sesi Toko (Logout) -->
            <button class="btn-icon" title="Reset Total Sesi Toko Ini (Logout)" aria-label="Reset Total Sesi Toko Ini" onclick="deepCleanStoreAndConfirm('${store.id}')" style="color: #f59e0b;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                <line x1="12" y1="2" x2="12" y2="12"/>
              </svg>
            </button>
            <button class="btn-icon btn-whitelist ${isWhitelisted ? 'active' : ''}" title="${isWhitelisted ? 'Nonaktifkan perlindungan hibernasi' : 'Lindungi dari hibernasi otomatis'}" aria-label="${isWhitelisted ? 'Nonaktifkan perlindungan hibernasi' : 'Lindungi dari hibernasi otomatis'}" onclick="toggleWhitelist('${store.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isWhitelisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </button>
            <button class="btn-icon" title="Edit" aria-label="Edit" onclick="openEditModal('${store.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon danger" title="Hapus" aria-label="Hapus" onclick="deleteStore('${store.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>`;
    });
  }
  storesListSettings.innerHTML = html;
}

// ── Cache Actions Handler ────────────────────────────────────────────────────

// Opsi 2: Clear cache khusus 1 toko & reload
async function clearStoreCacheAndReload(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  const actualPartition = getStorePartition(store);
  showToast(`Membersihkan cache "${store.name}"...`, '');

  try {
    const res = await window.electronAPI.clearStoreCache({ partition: actualPartition });
    if (res.success) {
      // Reload webviews untuk toko ini jika aktif
      const tabs = storeTabs[storeId] || [];
      tabs.forEach(tab => {
        const wvEntry = webviewMap[tab.id];
        if (wvEntry && wvEntry.webview) {
          try {
            wvEntry.webview.reloadIgnoringCache();
          } catch (e) {
            wvEntry.webview.src = tab.url;
          }
        }
      });
      updateCacheSizeDisplay();
      showToast(`Cache "${store.name}" berhasil dibersihkan & dimuat ulang ✓ (Login Tetap Aman)`, 'success');
    } else {
      showToast('Gagal membersihkan cache toko: ' + (res.error || ''), 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

// Opsi 3: Reset total sesi 1 toko (Logout)
async function deepCleanStoreAndConfirm(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  const confirmed = await showConfirmDialog({
    title: 'Reset Sesi Toko',
    message: `Reset total sesi toko <strong>"${escapeHtml(store.name)}"</strong>?<br><br>Semua cache, cookies, dan data login untuk toko ini akan dihapus. Anda harus login ulang di marketplace tersebut.`,
    type: 'warning',
    icon: '⚠️',
    confirmText: 'Reset Sesi Toko',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-warning'
  });
  if (!confirmed) return;

  const actualPartition = getStorePartition(store);
  showToast(`Mereset data sesi "${store.name}"...`, '');

  try {
    const res = await window.electronAPI.deepCleanStore({ partition: actualPartition });
    if (res.success) {
      // Reload webviews untuk toko ini
      const tabs = storeTabs[storeId] || [];
      tabs.forEach(tab => {
        const wvEntry = webviewMap[tab.id];
        if (wvEntry && wvEntry.webview) {
          try {
            wvEntry.webview.reloadIgnoringCache();
          } catch (e) {
            wvEntry.webview.src = tab.url;
          }
        }
      });
      updateCacheSizeDisplay();
      showToast(`Sesi "${store.name}" telah di-reset total. Silakan login kembali.`, 'success');
    } else {
      showToast('Gagal reset sesi: ' + (res.error || ''), 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

// Expose fungsi ke window
window.clearStoreCacheAndReload = clearStoreCacheAndReload;
window.deepCleanStoreAndConfirm = deepCleanStoreAndConfirm;
window.updateCacheSizeDisplay   = updateCacheSizeDisplay;

// ── Toggle Whitelist Hibernasi ─────────────────────────────────────────────────
async function toggleWhitelist(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;
  store.hibernationWhitelisted = !store.hibernationWhitelisted;
  await window.electronAPI.saveStores(stores, window.currentUser);
  renderSettingsList();
  const status = store.hibernationWhitelisted ? 'dilindungi 🛡️' : 'tidak dilindungi';
  showToast(`"${store.name}" ${status} dari hibernasi.`, 'success');
}

// ── Export / Import Config ───────────────────────────────────────────────────
async function exportConfig() {
  const btn = document.getElementById('btn-export-config');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Ekspor...';
  btn.setAttribute('aria-busy', 'true');
  
  try {
    const ok = await window.electronAPI.exportStoresConfig(stores);
    if (ok) showToast('Konfigurasi berhasil diekspor ✓', 'success');
  } catch (err) {
    showToast('Gagal ekspor: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    btn.removeAttribute('aria-busy');
  }
}

async function importConfig() {
  const btn = document.getElementById('btn-import-config');
  const original = btn.innerHTML;
  
  try {
    const result = await window.electronAPI.importStoresConfig();
    if (!result) return; // dibatalkan user
    const confirmed = await showConfirmDialog({
      title: 'Impor Konfigurasi Toko',
      message: `Ditemukan <strong>${result.length} toko</strong> dari file konfigurasi.<br><br><strong>⚠️ Perhatian:</strong> Seluruh daftar toko Anda saat ini akan digantikan dengan konfigurasi baru ini. Lanjutkan impor?`,
      type: 'warning',
      icon: '📥',
      confirmText: 'Impor & Gantikan',
      cancelText: 'Batal',
      confirmBtnClass: 'btn-warning'
    });
    if (!confirmed) return;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Impor...';
    btn.setAttribute('aria-busy', 'true');
    
    // 1. Bersihkan seluruh webview lama dari DOM & state untuk mencegah memory leak
    Object.keys(webviewMap).forEach(tabId => {
      webviewMap[tabId]?.webview?.remove();
      webviewMap[tabId]?.loading?.remove();
      delete webviewMap[tabId];
    });
    Object.keys(storeTabs).forEach(sid => delete storeTabs[sid]);
    Object.keys(activeTabMap).forEach(sid => delete activeTabMap[sid]);
    Object.keys(unreadMap).forEach(sid => delete unreadMap[sid]);
    activeStoreId = null;

    stores = result;
    await window.electronAPI.saveStores(stores, window.currentUser);
    renderSidebar(getFilteredStores());
    renderSettingsList();
    updateEmptyState();
    showToast(`${result.length} toko berhasil diimpor ✓`, 'success');
    if (result.length > 0 && window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
      window.OnboardingManager.notifyAction('add_store');
    }
  } catch (err) {
    showToast('Gagal impor: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    btn.removeAttribute('aria-busy');
  }
}

// Expose fungsi untuk onclick inline
window.toggleWhitelist = toggleWhitelist;

// ── Empty State ───────────────────────────────────────────────────────────────
function updateEmptyState() {
  if (!activeStoreId) {
    emptyState.style.display = 'flex';
    webviewCont.classList.remove('active');
    tabBar.style.display = 'none';
  }
}

// ── WhatsApp Sync Education Modal ───────────────────────────────────────────
function openWaSyncEduModal() {
  const modal = document.getElementById('wa-sync-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeWaSyncEduModal() {
  const modal = document.getElementById('wa-sync-modal');
  const chk = document.getElementById('chk-dont-show-wa-sync');
  if (chk && chk.checked) {
    Storage.set('dontShowWaSyncEdu', true, !!window.currentUser);
  }
  if (modal) {
    modal.classList.remove('active');
  }
}

function showWaSyncEduModalIfNeeded() {
  const dontShow = Storage.get('dontShowWaSyncEdu', false, !!window.currentUser);
  if (dontShow) return;

  openWaSyncEduModal();
}

window.openWaSyncEduModal = openWaSyncEduModal;
window.closeWaSyncEduModal = closeWaSyncEduModal;
window.showWaSyncEduModalIfNeeded = showWaSyncEduModalIfNeeded;
