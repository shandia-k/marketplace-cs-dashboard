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
    closeModal();
    renderSidebar(getFilteredStores());
    renderTabBar();
    renderSettingsList();
    updateEmptyState();
    showToast(editingStoreId ? 'Toko berhasil diperbarui ✓' : 'Toko baru ditambahkan ✓', 'success');
  } else {
    showToast('Gagal menyimpan. Coba lagi.', 'error');
  }
}

async function deleteStore(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  const confirmed = confirm(`Hapus toko "${store.name}"?\n\nSesi login akan tetap tersimpan.`);
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
  renderSettingsList();
  settingsOverlay.classList.add('active');
}

function renderSettingsList() {
  if (stores.length === 0) {
    storesListSettings.innerHTML = `<div class="no-stores-msg">Belum ada toko yang ditambahkan.</div>`;
    return;
  }
  storesListSettings.innerHTML = stores.map(store => {
    const cfg      = MARKETPLACE_CONFIG[store.marketplace] || MARKETPLACE_CONFIG.custom;
    const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
    const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
    const isWhitelisted = store.hibernationWhitelisted === true;
    return `
      <div class="settings-store-item">
        <div class="settings-store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}</div>
        <div class="settings-store-info">
          <div class="settings-store-name">${escapeHtml(store.name)}</div>
          <div class="settings-store-url">${escapeHtml(store.url || cfg.url)}</div>
        </div>
        <div class="settings-store-actions">
          <button class="btn-icon btn-whitelist ${isWhitelisted ? 'active' : ''}" title="${isWhitelisted ? 'Nonaktifkan perlindungan hibernasi' : 'Lindungi dari hibernasi otomatis'}" onclick="toggleWhitelist('${store.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isWhitelisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </button>
          <button class="btn-icon" title="Edit" onclick="openEditModal('${store.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Hapus" onclick="deleteStore('${store.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

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
    const confirmed = confirm(
      `Impor ${result.length} toko dari file?\n\nSemua toko yang ada sekarang akan digantikan.`
    );
    if (!confirmed) return;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Impor...';
    btn.setAttribute('aria-busy', 'true');
    
    stores = result;
    await window.electronAPI.saveStores(stores, window.currentUser);
    renderSidebar(getFilteredStores());
    renderSettingsList();
    updateEmptyState();
    showToast(`${result.length} toko berhasil diimpor ✓`, 'success');
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
