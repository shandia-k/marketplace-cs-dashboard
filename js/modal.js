// ── Modal: Add/Edit Store & Smart Custom URL Search ────────────────────────────
let customSearchDebounceTimer = null;
let currentCustomSearchResults = [];
const customSearchCache = new Map();

const POPULAR_MARKETPLACE_PRESETS_FRONTEND = [
  { keywords: ['grab', 'grab merchant', 'grabfood', 'grab merchant portal', 'grab seller'], title: 'GrabMerchant Portal', url: 'https://merchant.grab.com/portal/', domain: 'merchant.grab.com', snippet: 'Portal resmi GrabMerchant & GrabFood Indonesia' },
  { keywords: ['gobiz', 'gofood', 'gojek merchant', 'go food'], title: 'GoBiz Portal Mitra Usaha Gojek', url: 'https://app.gobiz.com/', domain: 'app.gobiz.com', snippet: 'Dashboard resmi GoBiz untuk GoFood & GoPay' },
  { keywords: ['shopeefood', 'shopee partner', 'shopee merchant'], title: 'Shopee Partner Merchant Portal', url: 'https://partner.shopee.co.id/', domain: 'partner.shopee.co.id', snippet: 'Portal resmi Merchant ShopeeFood & ShopeePay' },
  { keywords: ['dokterin', 'dokter in', 'dokterin seller', 'dokterin partner'], title: 'DokterIN Partner / Seller', url: 'https://partner.dokterin.co.id/', domain: 'partner.dokterin.co.id', snippet: 'Portal resmi DokterIN Partner & Tenaga Medis' },
  { keywords: ['zalora', 'zalora seller', 'zalora seller center'], title: 'Zalora Seller Center Indonesia', url: 'https://sellercenter.zalora.co.id/', domain: 'sellercenter.zalora.co.id', snippet: 'Pusat kelola toko resmi Zalora Indonesia' },
  { keywords: ['evermos', 'evermos reseller', 'evermos login'], title: 'Evermos Reseller & Commerce', url: 'https://evermos.com/login', domain: 'evermos.com', snippet: 'Platform social commerce & reseller Evermos' },
  { keywords: ['whatsapp', 'wa', 'wa web', 'whatsapp web'], title: 'WhatsApp Web', url: 'https://web.whatsapp.com/', domain: 'web.whatsapp.com', snippet: 'Official WhatsApp Web Messenger' },
  { keywords: ['telegram', 'tele', 'telegram web'], title: 'Telegram Web', url: 'https://web.telegram.org/', domain: 'web.telegram.org', snippet: 'Official Telegram Web Client' },
  { keywords: ['shopify', 'shopify admin', 'shopify seller'], title: 'Shopify Admin Portal', url: 'https://accounts.shopify.com/store-login', domain: 'accounts.shopify.com', snippet: 'Shopify Store Admin & Dashboard' },
  { keywords: ['olx', 'olx indonesia', 'olx seller'], title: 'OLX Indonesia', url: 'https://www.olx.co.id/', domain: 'olx.co.id', snippet: 'Pusat jual beli online OLX Indonesia' },
  { keywords: ['bhinneka', 'bhinneka merchant'], title: 'Bhinneka Merchant Center', url: 'https://merchant.bhinneka.com/', domain: 'merchant.bhinneka.com', snippet: 'Portal Merchant Partner Bhinneka' },
  { keywords: ['padi', 'padi umkm', 'padi seller'], title: 'PaDi UMKM Seller', url: 'https://seller.padiumkm.id/', domain: 'seller.padiumkm.id', snippet: 'Pasar Digital UMKM BUMN Seller Center' },
  { keywords: ['sirclo', 'sirclo store'], title: 'SIRCLO Store Admin', url: 'https://admin.sirclo.com/', domain: 'admin.sirclo.com', snippet: 'Dashboard Admin Sirclo Store' },
  { keywords: ['jakmall', 'jakmall mitra'], title: 'Jakmall Mitra Dropship', url: 'https://mitra.jakmall.com/', domain: 'mitra.jakmall.com', snippet: 'Pusat Mitra Dropship Jakmall' },
  { keywords: ['orderonline', 'order online', 'orderonline.id'], title: 'OrderOnline.id Portal', url: 'https://orderonline.id/login/', domain: 'orderonline.id', snippet: 'Platform otomasi order & checkout' },
  { keywords: ['mengantar', 'mengantar.com', 'mengantar app'], title: 'Mengantar Shipping Dashboard', url: 'https://app.mengantar.com/', domain: 'app.mengantar.com', snippet: 'Platform pengiriman & COD Mengantar' },
  { keywords: ['kiriminaja', 'kirimin aja'], title: 'KiriminAja Dashboard Ekspedisi', url: 'https://dashboard.kiriminaja.com/', domain: 'dashboard.kiriminaja.com', snippet: 'Dashboard pengiriman multi ekspedisi KiriminAja' },
  { keywords: ['biteship', 'biteship dashboard'], title: 'Biteship Dashboard', url: 'https://dashboard.biteship.com/', domain: 'dashboard.biteship.com', snippet: 'Layanan API logistik & ekspedisi Biteship' },
  { keywords: ['instagram', 'ig web', 'instagram direct'], title: 'Instagram Web Inbox', url: 'https://www.instagram.com/direct/inbox/', domain: 'instagram.com', snippet: 'Instagram Direct Messages Web' },
  { keywords: ['lazada', 'lazada seller center'], title: 'Lazada Seller Center', url: 'https://sellercenter.lazada.co.id/apps/seller/chat', domain: 'sellercenter.lazada.co.id', snippet: 'Lazada Seller Center Chat' },
  { keywords: ['tiktok', 'tiktok shop', 'tiktok seller'], title: 'TikTok Shop Seller Center', url: 'https://seller-id.tokopedia.com/account/login', domain: 'seller-id.tokopedia.com', snippet: 'TikTok Shop / Tokopedia Seller Center' },
  { keywords: ['blibli', 'blibli seller'], title: 'Blibli Seller Center', url: 'https://seller.blibli.com/backend/chat', domain: 'seller.blibli.com', snippet: 'Blibli Seller Chat Portal' },
  { keywords: ['bukalapak', 'bukalapak seller'], title: 'Bukalapak Seller Center', url: 'https://seller.bukalapak.com/message', domain: 'seller.bukalapak.com', snippet: 'Bukalapak Seller Message' },
  { keywords: ['shopee', 'shopee seller'], title: 'Shopee Seller Centre', url: 'https://seller.shopee.co.id/', domain: 'seller.shopee.co.id', snippet: 'Shopee Seller Centre' },
  { keywords: ['tokopedia', 'tokopedia seller'], title: 'Tokopedia Seller Center', url: 'https://seller.tokopedia.com/chat', domain: 'seller.tokopedia.com', snippet: 'Tokopedia Seller Chat Portal' }
];

async function searchWebUrlsFallback(query) {
  const q = (query || '').trim();
  if (!q) return [];

  const results = [];
  const addedUrls = new Set();

  function addResult(item) {
    if (!item || !item.url) return;
    const cleanUrl = item.url.toLowerCase().replace(/\/+$/, '');
    if (!addedUrls.has(cleanUrl)) {
      addedUrls.add(cleanUrl);
      results.push(item);
    }
  }

  // 1. Direct domain detection
  const isDirectDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(q) && !q.includes(' ');
  const isHttpUrl = /^https?:\/\//i.test(q);

  if (isDirectDomain || isHttpUrl) {
    const directUrl = isHttpUrl ? q : `https://${q}`;
    let hostname = '';
    try {
      hostname = new URL(directUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      hostname = q;
    }
    addResult({
      title: `Buka Alamat Langsung: ${hostname}`,
      url: directUrl,
      domain: hostname,
      snippet: `Alamat web langsung: ${directUrl}`,
      isDirect: true
    });
  }

  // 2. Preset match
  const lowerQ = q.toLowerCase();
  for (const preset of POPULAR_MARKETPLACE_PRESETS_FRONTEND) {
    if (preset.keywords.some(k => lowerQ.includes(k) || k.includes(lowerQ))) {
      addResult({ ...preset, isPreset: true });
    }
  }

  // 3. Multi-Source Search in Renderer
  const tasks = [];

  // (a) Google Suggestion API
  tasks.push((async () => {
    try {
      const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&hl=id&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        const suggestions = data[1] || [];
        for (const s of suggestions) {
          if (typeof s === 'string' && /^https?:\/\//i.test(s)) {
            let hostname = '';
            try { hostname = new URL(s).hostname.replace(/^www\./, ''); } catch (e) { hostname = s; }
            addResult({
              title: `${hostname} (Website Resmi)`,
              url: s,
              domain: hostname,
              snippet: `Tautan navigasi resmi untuk "${q}"`,
              isPreset: false
            });
          }
        }
      }
    } catch (e) {}
  })());

  // (b) Wikipedia Opensearch API
  tasks.push((async () => {
    try {
      const res = await fetch(`https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`);
      if (res.ok) {
        const data = await res.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];
        const urls = data[3] || [];
        for (let i = 0; i < titles.length; i++) {
          if (urls[i]) {
            addResult({
              title: titles[i],
              url: urls[i],
              domain: 'id.wikipedia.org',
              snippet: descriptions[i] || `Informasi resmi ${titles[i]} di Wikipedia`,
              isPreset: false
            });
          }
        }
      }
    } catch (e) {}
  })());

  await Promise.allSettled(tasks);

  // Fallback domain synthesizer
  const cleanQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (results.length < 3 && cleanQ.length >= 2 && !q.includes('.')) {
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Indonesia (.id)`,
      url: `https://${cleanQ}.id/`,
      domain: `${cleanQ}.id`,
      snippet: `Rekomendasi URL Indonesia untuk ${q}`,
      isDirect: true
    });
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Global (.com)`,
      url: `https://${cleanQ}.com/`,
      domain: `${cleanQ}.com`,
      snippet: `Rekomendasi URL Global untuk ${q}`,
      isDirect: true
    });
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Co.id (.co.id)`,
      url: `https://${cleanQ}.co.id/`,
      domain: `${cleanQ}.co.id`,
      snippet: `Rekomendasi URL Perusahaan untuk ${q}`,
      isDirect: true
    });
  }

  return results.slice(0, 6);
}

function clearCustomUrlSearch() {
  if (customSearchDebounceTimer) {
    clearTimeout(customSearchDebounceTimer);
    customSearchDebounceTimer = null;
  }
  if (customUrlSpinner) customUrlSpinner.style.display = 'none';
  if (customUrlResults) customUrlResults.style.display = 'none';
  if (customResultsList) customResultsList.innerHTML = '';
  if (btnClearUrl) btnClearUrl.style.display = 'none';
  currentCustomSearchResults = [];
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
}

async function performCustomUrlSearch(query, autoSelectFirst = false) {
  const q = (query || '').trim();
  if (!q) {
    clearCustomUrlSearch();
    updateUrlPreview('custom', '');
    return;
  }

  if (btnClearUrl) btnClearUrl.style.display = 'flex';

  // Instant preview update for URLs / domains
  if (/^https?:\/\//i.test(q)) {
    updateUrlPreview('custom', q);
  } else if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(q)) {
    updateUrlPreview('custom', 'https://' + q);
  }

  // Cek cache in-memory untuk respons instan (0ms)
  const cacheKey = q.toLowerCase();
  if (customSearchCache.has(cacheKey)) {
    if (customUrlSpinner) customUrlSpinner.style.display = 'none';
    currentCustomSearchResults = customSearchCache.get(cacheKey) || [];
    renderCustomUrlResults(currentCustomSearchResults, q);
    if (autoSelectFirst && currentCustomSearchResults.length > 0) {
      selectCustomUrl(currentCustomSearchResults[0]);
    }
    return;
  }

  if (customUrlSpinner) customUrlSpinner.style.display = 'flex';

  try {
    let results = [];
    if (window.electronAPI && typeof window.electronAPI.searchUrls === 'function') {
      try {
        results = await window.electronAPI.searchUrls(q);
      } catch (errIpc) {
        console.warn('IPC search error, falling back to local search:', errIpc);
      }
    }

    if (!results || results.length === 0) {
      results = await searchWebUrlsFallback(q);
    }

    if (customUrlSpinner) customUrlSpinner.style.display = 'none';
    currentCustomSearchResults = results || [];
    customSearchCache.set(cacheKey, currentCustomSearchResults);
    renderCustomUrlResults(currentCustomSearchResults, q);

    if (autoSelectFirst && results && results.length > 0) {
      selectCustomUrl(results[0]);
    }
  } catch (err) {
    console.error('Search URLs error:', err);
    if (customUrlSpinner) customUrlSpinner.style.display = 'none';
    const fallbackResults = await searchWebUrlsFallback(q);
    currentCustomSearchResults = fallbackResults || [];
    customSearchCache.set(cacheKey, currentCustomSearchResults);
    renderCustomUrlResults(currentCustomSearchResults, q);
  }
}

function handleCustomUrlInput() {
  const query = fieldStoreUrl.value.trim();

  if (customSearchDebounceTimer) {
    clearTimeout(customSearchDebounceTimer);
  }

  if (!query) {
    clearCustomUrlSearch();
    updateUrlPreview('custom', '');
    return;
  }

  if (btnClearUrl) btnClearUrl.style.display = 'flex';

  // Instant local URL preview formatting
  if (/^https?:\/\//i.test(query)) {
    updateUrlPreview('custom', query);
  } else if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(query)) {
    updateUrlPreview('custom', 'https://' + query);
  } else {
    updateUrlPreview('custom', 'https://' + query.replace(/\s+/g, '').toLowerCase() + '.com');
  }

  // Jika hasil sudah ada di cache, tampilkan langsung tanpa jeda
  const cacheKey = query.toLowerCase();
  if (customSearchCache.has(cacheKey)) {
    performCustomUrlSearch(query, false);
    return;
  }

  // Debounce cepat (120ms) agar responsif dan tidak delay
  customSearchDebounceTimer = setTimeout(() => {
    performCustomUrlSearch(query, false);
  }, 120);
}

function renderCustomUrlResults(results, query) {
  if (!customUrlResults || !customResultsList) return;

  if (!results || results.length === 0) {
    const safeQ = typeof escapeHtml === 'function' ? escapeHtml(query) : query;
    const fallbackUrl = /^https?:\/\//i.test(query) ? query : `https://${query.replace(/\s+/g, '').toLowerCase()}`;
    customResultsList.innerHTML = `
      <div class="custom-empty-state">
        <p>Tidak ditemukan tautan spesifik untuk <em>"${safeQ}"</em>.</p>
        <button type="button" class="btn-use-direct-url" onclick="selectDirectUrl('${escapeHtml(fallbackUrl)}')">
          🌐 Gunakan URL: ${escapeHtml(fallbackUrl)}
        </button>
      </div>`;
    customUrlResults.style.display = 'block';
    return;
  }

  let html = '';
  results.forEach((item, index) => {
    const isSelected = item.url.toLowerCase() === fieldStoreUrl.value.trim().toLowerCase();
    let badgeText = item.isDirect ? 'LANGSUNG' : (item.isPreset ? 'PRESET' : 'WEB');
    let badgeColorClass = item.isDirect ? 'style="color:#3b82f6; background:rgba(59,130,246,0.15); border-color:rgba(59,130,246,0.3);"' : '';

    html += `
      <div class="custom-result-item ${isSelected ? 'selected' : ''}" data-index="${index}" onclick="onCustomResultClick(${index})" role="button" tabindex="0">
        <div class="custom-result-icon">🌐</div>
        <div class="custom-result-content">
          <div class="custom-result-header-row">
            <span class="custom-result-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
            <span class="custom-result-badge" ${badgeColorClass}>${badgeText}</span>
          </div>
          <div class="custom-result-url">
            <span class="proto-lock" title="Koneksi Aman HTTPS">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </span>
            <span>${escapeHtml(item.url)}</span>
          </div>
          ${item.snippet ? `<div class="custom-result-snippet">${escapeHtml(item.snippet)}</div>` : ''}
        </div>
      </div>`;
  });

  customResultsList.innerHTML = html;
  customUrlResults.style.display = 'block';
}

function onCustomResultClick(index) {
  if (currentCustomSearchResults && currentCustomSearchResults[index]) {
    selectCustomUrl(currentCustomSearchResults[index]);
  }
}

function selectDirectUrl(url) {
  selectCustomUrl({
    title: url.replace(/^https?:\/\//, ''),
    url: url,
    domain: url
  });
}

function selectCustomUrl(item) {
  if (!item || !item.url) return;

  if (window.AppTelemetry) {
    window.AppTelemetry.track('store_custom_url_searched');
  }

  fieldStoreUrl.value = item.url;
  updateUrlPreview('custom', item.url);

  // Auto-fill Store Name if empty or default
  if (!fieldStoreName.value.trim() || fieldStoreName.value.trim() === 'Custom' || fieldStoreName.value.trim() === 'Toko Baru') {
    let cleanName = (item.title || item.domain || '').replace(/\s*[-|–]\s*.*$/, '').replace(/\|.*$/, '').trim();
    if (cleanName.length > 30) cleanName = cleanName.substring(0, 30);
    if (cleanName) {
      fieldStoreName.value = cleanName;
      // Auto-compute Initials if empty
      if (!fieldStoreInitials.value.trim() || fieldStoreInitials.value.trim() === 'CU') {
        const words = cleanName.split(/\s+/).filter(Boolean);
        fieldStoreInitials.value = words.length > 1
          ? (words[0][0] + words[1][0]).toUpperCase()
          : cleanName.substring(0, 2).toUpperCase();
      }
    }
  }

  // Highlight selected item in list
  document.querySelectorAll('.custom-result-item').forEach((el, idx) => {
    el.classList.toggle('selected', currentCustomSearchResults[idx]?.url === item.url);
  });

  // Highlight preset chip if matching
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.url === item.url);
  });
}

window.onCustomResultClick = onCustomResultClick;
window.selectDirectUrl = selectDirectUrl;
window.selectCustomUrl = selectCustomUrl;
window.handleCustomUrlInput = handleCustomUrlInput;
window.clearCustomUrlSearch = clearCustomUrlSearch;
window.performCustomUrlSearch = performCustomUrlSearch;

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
  clearCustomUrlSearch();
  if (urlPreview) urlPreview.value = 'https://seller.shopee.co.id/';
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
  clearCustomUrlSearch();

  if (store.marketplace === 'custom') {
    fieldStoreUrl.value = store.url || '';
    customUrlGroup.style.display = 'flex';
    if (btnClearUrl) btnClearUrl.style.display = store.url ? 'flex' : 'none';
  } else {
    customUrlGroup.style.display = 'none';
  }
  if (urlPreview) {
    urlPreview.value = store.url || '';
  }

  settingsOverlay.classList.remove('active');
  modalOverlay.classList.add('active');
  setTimeout(() => fieldStoreName.focus(), 200);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  clearCustomUrlSearch();
  editingStoreId = null;
}

function setSelectedMarketplace(value) {
  fieldStoreMarketplace.value = value;
  document.querySelectorAll('.mp-option').forEach(el => {
    const isSelected = el.dataset.value === value;
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
  updateUrlPreview(value);
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
  let displayUrl = '';
  if (marketplace === 'custom') {
    let u = (customUrl || (fieldStoreUrl ? fieldStoreUrl.value : '') || '').trim();
    if (u) {
      if (!/^https?:\/\//i.test(u)) {
        u = 'https://' + u;
      }
      displayUrl = u;
    } else {
      displayUrl = (urlPreview && urlPreview.value) ? urlPreview.value : 'https://';
    }
  } else {
    displayUrl = (customUrl && typeof customUrl === 'string' && customUrl.trim()) ? customUrl.trim() : (cfg.url || '');
  }
  if (urlPreview) {
    urlPreview.value = displayUrl;
  }
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
  let url = (urlPreview ? urlPreview.value : (fieldStoreUrl ? fieldStoreUrl.value : '')).trim();

  if (!url) {
    url = cfg.url || 'https://';
  }

  // Auto-prefix https:// jika protokol belum ada
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
    if (urlPreview) urlPreview.value = url;
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
  if (typeof saveStoreTabsState === 'function') saveStoreTabsState();

  if (activeStoreId === storeId) {
    activeStoreId = null;
    webviewCont.classList.remove('active');
    tabBar.style.display = 'none';
    updateEmptyState();
  }

  stores = stores.filter(s => s.id !== storeId);
  await window.electronAPI.saveStores(stores, window.currentUser);
  if (window.AppTelemetry) {
    window.AppTelemetry.track('store_deleted');
  }
  renderSidebar(getFilteredStores());
  renderSettingsList();
  showToast('Toko dihapus.', 'success');
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
let selectedAccColor = '#df1683';
let selectedAccIcon  = '👩‍💼';

function openSettings(defaultTab = 'stores') {
  const isSuperAdmin = !!(
    window.currentUserProfile?.isSuperAdmin ||
    window.currentUserProfile?.role === 'Super Admin' ||
    window.currentUser === 'superadmin'
  );

  const saTabBtn = document.getElementById('tab-btn-superadmin');
  if (saTabBtn) {
    saTabBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }

  if (defaultTab === 'account') {
    document.getElementById('tab-btn-account')?.click();
  } else if (defaultTab === 'cache') {
    document.getElementById('tab-btn-cache')?.click();
  } else if (defaultTab === 'superadmin') {
    document.getElementById('tab-btn-superadmin')?.click();
  } else {
    document.getElementById('tab-btn-stores')?.click();
  }
  renderSettingsList();
  updateCacheSizeDisplay();
  if (typeof renderSettingsAccountTab === 'function') {
    renderSettingsAccountTab();
  }
  if (isSuperAdmin && typeof renderSuperAdminPanel === 'function') {
    renderSuperAdminPanel();
  }
  settingsOverlay.classList.add('active');
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('active');
}
window.openSettings = openSettings;
window.closeSettings = closeSettings;

async function renderSettingsAccountTab() {
  if (!window.currentUser) return;

  const currentSpan = document.getElementById('settings-current-user');
  if (currentSpan) currentSpan.textContent = window.currentUser;

  try {
    const res = await window.electronAPI.getUserProfile(window.currentUser);
    if (res && res.success && res.user) {
      const user = res.user;
      window.currentUserProfile = user;

      const nameInput = document.getElementById('acc-display-name');
      if (nameInput) nameInput.value = user.displayName || user.username;

      const autolockSelect = document.getElementById('acc-autolock-select');
      if (autolockSelect) autolockSelect.value = String(user.autoLockMinutes || 0);

      selectedAccColor = user.avatarColor || (user.isSuperAdmin ? '#e11d48' : '#df1683');
      selectedAccIcon  = user.avatarIcon || (user.isSuperAdmin ? '👑' : '👩‍💼');

      renderAccountAvatarPicker();
    }
  } catch (e) {
    console.error('Error fetching user profile:', e);
  }
}
window.renderSettingsAccountTab = renderSettingsAccountTab;

function renderAccountAvatarPicker() {
  const colorContainer = document.getElementById('acc-color-swatches');
  const iconContainer  = document.getElementById('acc-icon-swatches');
  const previewBox     = document.getElementById('acc-avatar-preview');

  if (previewBox) {
    previewBox.style.backgroundColor = selectedAccColor;
    previewBox.textContent = selectedAccIcon;
  }

  if (colorContainer) {
    colorContainer.innerHTML = '';
    const colors = typeof AVATAR_COLORS !== 'undefined' ? AVATAR_COLORS : [
      '#df1683', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'
    ];
    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `color-swatch-btn ${color === selectedAccColor ? 'active' : ''}`;
      btn.style.backgroundColor = color;
      btn.title = color;
      btn.addEventListener('click', () => {
        selectedAccColor = color;
        colorContainer.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (previewBox) previewBox.style.backgroundColor = color;
      });
      colorContainer.appendChild(btn);
    });
  }

  if (iconContainer) {
    iconContainer.innerHTML = '';
    const icons = typeof AVATAR_ICONS !== 'undefined' ? AVATAR_ICONS : [
      '👩‍💼', '👨‍💻', '🎧', '⚡', '🌟', '🛡️', '🤖', '🛍️', '📦', '🎯', '🚀', '💼'
    ];
    icons.forEach(icon => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `icon-swatch-btn ${icon === selectedAccIcon ? 'active' : ''}`;
      btn.textContent = icon;
      btn.addEventListener('click', () => {
        selectedAccIcon = icon;
        iconContainer.querySelectorAll('.icon-swatch-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (previewBox) previewBox.textContent = icon;
      });
      iconContainer.appendChild(btn);
    });
  }
}
window.renderAccountAvatarPicker = renderAccountAvatarPicker;

async function renderSuperAdminPanel() {
  const auditContainer = document.getElementById('superadmin-audit-list');
  const statUsers = document.getElementById('sa-stat-users');
  const statStores = document.getElementById('sa-stat-stores');
  const statPartitions = document.getElementById('sa-stat-partitions');
  if (!auditContainer) return;

  auditContainer.innerHTML = '<div style="padding: 18px; text-align: center; color: var(--text-muted);"><span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:8px;"></span> Memuat data audit sesi & toko seluruh pengguna...</div>';

  try {
    const res = await window.electronAPI.adminGetFullAudit({ requestingUsername: window.currentUser });
    if (!res || !res.success) {
      auditContainer.innerHTML = `<div class="no-stores-msg" style="color: #f87171;">Gagal memuat audit: ${escapeHtml(res?.error || 'Unknown error')}</div>`;
      return;
    }

    if (statUsers) statUsers.textContent = `${res.stats.totalUsers} CS`;
    if (statStores) statStores.textContent = `${res.stats.totalStores} Toko`;
    if (statPartitions) statPartitions.textContent = `${res.stats.totalPartitions} Partisi`;

    const users = res.users || [];
    if (users.length === 0) {
      auditContainer.innerHTML = '<div class="no-stores-msg">Tidak ada data pengguna terdaftar.</div>';
      return;
    }

    let html = '';
    users.forEach(u => {
      const isCurrent = u.username === window.currentUser;
      const isTargetSuperAdmin = !!u.isSuperAdmin;
      const avatarColor = u.avatarColor || (isTargetSuperAdmin ? '#e11d48' : '#df1683');
      const avatarIcon  = u.avatarIcon || (isTargetSuperAdmin ? '👑' : '👩‍💼');
      const name = u.displayName || u.username;
      const stores = u.stores || [];

      html += `
        <div class="superadmin-user-card ${isTargetSuperAdmin ? 'is-superadmin-card' : ''}" id="sa-card-${escapeHtml(u.username)}">
          <div class="superadmin-user-header" onclick="toggleSuperAdminUserDrawer('${escapeHtml(u.username)}')">
            <div class="superadmin-user-profile">
              <div class="superadmin-user-avatar" style="background-color: ${escapeHtml(avatarColor)}">
                ${escapeHtml(avatarIcon)}
              </div>
              <div class="superadmin-user-info">
                <div class="superadmin-user-name-line">
                  <span class="superadmin-user-name">${escapeHtml(name)}</span>
                  ${isCurrent ? '<span class="user-mgmt-badge-current">Akun Anda</span>' : ''}
                  <span class="role-badge ${isTargetSuperAdmin ? 'superadmin' : 'cs'}">${isTargetSuperAdmin ? '👑 Super Admin' : 'Customer Service'}</span>
                </div>
                <div class="superadmin-user-username">
                  <span>@${escapeHtml(u.username)}</span>
                  <span style="margin: 0 4px;">·</span>
                  <span class="superadmin-stores-pill">🏪 ${stores.length} Toko Marketplace</span>
                </div>
              </div>
            </div>

            <div class="superadmin-user-actions-bar" onclick="event.stopPropagation()">
              <button class="btn-icon-text" style="font-size: 11px; padding: 4px 10px;" onclick="toggleSuperAdminUserDrawer('${escapeHtml(u.username)}')" title="Lihat Sesi & Toko">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span id="sa-toggle-text-${escapeHtml(u.username)}">Lihat Sesi (${stores.length}) ▾</span>
              </button>

              ${!isCurrent ? `
                ${!isTargetSuperAdmin ? `
                  <button class="btn-mgmt-action" style="color: #f59e0b;" title="Promosikan Menjadi Super Admin (👑)" onclick="adminChangeRolePrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}', 'Super Admin')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                  <button class="btn-mgmt-action action-pin" title="Reset PIN Akun CS Ini" onclick="adminResetPinPrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3 2.5-2.5L16 5l2-2 3 3-2 2z"/>
                      <circle cx="7.5" cy="16.5" r="4.5"/>
                    </svg>
                  </button>
                  <button class="btn-mgmt-action action-session" title="Reset Total Seluruh Sesi CS Ini" onclick="adminClearSessionPrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  </button>
                  <button class="btn-mgmt-action action-delete" title="Hapus Akun CS Ini" onclick="deleteUserPrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                ` : `
                  <button class="btn-mgmt-action" style="color: #94a3b8;" title="Turunkan Menjadi Customer Service (CS)" onclick="adminChangeRolePrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}', 'Customer Service')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                  </button>
                  <button class="btn-mgmt-action action-pin" title="Reset PIN Akun Super Admin Ini" onclick="adminResetPinPrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3 2.5-2.5L16 5l2-2 3 3-2 2z"/>
                      <circle cx="7.5" cy="16.5" r="4.5"/>
                    </svg>
                  </button>
                  <button class="btn-mgmt-action action-delete" title="Hapus Akun Super Admin Ini" onclick="deleteUserPrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                `}
              ` : ''}
            </div>
          </div>

          <div class="superadmin-stores-drawer" id="sa-drawer-${escapeHtml(u.username)}" style="display: none;">
            ${stores.length === 0 ? `
              <div style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">
                Akun ini belum memiliki toko marketplace yang didaftarkan.
              </div>
            ` : stores.map(s => {
              const mpInfo = typeof getMarketplaceInfo !== 'undefined' ? getMarketplaceInfo(s.marketplace) : { name: s.marketplace, color: '#3b82f6' };
              const storeColor = s.color || mpInfo.color || '#3b82f6';
              return `
                <div class="superadmin-store-row">
                  <div class="superadmin-store-meta">
                    <div class="superadmin-store-avatar" style="background-color: ${escapeHtml(storeColor)}">
                      ${escapeHtml(s.initials || s.name.substring(0, 2))}
                    </div>
                    <div class="superadmin-store-details">
                      <div class="superadmin-store-name">
                        <span>${escapeHtml(s.name)}</span>
                        <span class="role-badge" style="font-size: 10px; margin-left: 6px; text-transform: uppercase;">${escapeHtml(s.marketplace)}</span>
                      </div>
                      <div class="superadmin-store-url" title="${escapeHtml(s.url)}">
                        <span>${escapeHtml(s.url || 'Tidak ada URL')}</span>
                        <span style="margin: 0 4px;">·</span>
                        <span class="partition-pill" title="ID Partisi Sesi Chromium">${escapeHtml(s.partition)}</span>
                      </div>
                    </div>
                  </div>
                  <div class="superadmin-store-actions">
                    <button class="btn-store-action btn-store-wipe" title="Hapus cookies & logout paksa hanya toko ini" onclick="adminClearSingleStoreSessionPrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}', '${escapeHtml(s.id)}', '${escapeHtml(s.name)}')">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      Reset Sesi
                    </button>
                    ${!isTargetSuperAdmin ? `
                      <button class="btn-store-action btn-store-del" title="Hapus toko ini dari akun CS" onclick="adminDeleteSingleStorePrompt('${escapeHtml(u.username)}', '${escapeHtml(name)}', '${escapeHtml(s.id)}', '${escapeHtml(s.name)}')">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        Hapus Toko
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    auditContainer.innerHTML = html;
  } catch (err) {
    auditContainer.innerHTML = `<div class="no-stores-msg" style="color: #f87171;">Gagal memuat audit: ${escapeHtml(err.message)}</div>`;
  }
}
window.renderSuperAdminPanel = renderSuperAdminPanel;

function toggleSuperAdminUserDrawer(username) {
  const drawer = document.getElementById(`sa-drawer-${username}`);
  const toggleText = document.getElementById(`sa-toggle-text-${username}`);
  if (!drawer) return;
  const isHidden = drawer.style.display === 'none';
  drawer.style.display = isHidden ? 'flex' : 'none';
  if (toggleText) {
    toggleText.innerHTML = isHidden ? 'Tutup Sesi ▴' : 'Lihat Sesi ▾';
  }
}
window.toggleSuperAdminUserDrawer = toggleSuperAdminUserDrawer;

// Prompt: Bersihkan Sesi 1 Toko Tertentu
async function adminClearSingleStoreSessionPrompt(targetUsername, displayName, storeId, storeName) {
  const adminPin = await showPromptDialog({
    title: 'Reset Sesi Toko Tertentu',
    message: `Anda akan menghapus sesi & cookies khusus toko <strong>"${escapeHtml(storeName)}"</strong> milik <strong>"${escapeHtml(displayName)}" (@${escapeHtml(targetUsername)})</strong>.<br><br>Masukkan <strong>PIN Super Admin</strong> Anda untuk konfirmasi:`,
    type: 'warning',
    inputType: 'password',
    placeholder: 'PIN Super Admin',
    confirmText: 'Reset Sesi Toko',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-warning'
  });

  if (!adminPin) return;

  try {
    const res = await window.electronAPI.adminClearStoreSession({
      requestingUsername: window.currentUser,
      password: adminPin,
      targetUsername,
      storeId
    });

    if (res && res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_store_session_cleared');
      }
      showToast(res.message || `Sesi toko "${storeName}" berhasil dibersihkan.`, 'success');
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res?.error || 'Gagal membersihkan sesi toko', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan: ' + e.message, 'error');
  }
}
window.adminClearSingleStoreSessionPrompt = adminClearSingleStoreSessionPrompt;

// Prompt: Hapus 1 Toko dari Akun CS
async function adminDeleteSingleStorePrompt(targetUsername, displayName, storeId, storeName) {
  const adminPin = await showPromptDialog({
    title: 'Hapus Toko dari Akun CS',
    message: `Anda akan menghapus toko <strong>"${escapeHtml(storeName)}"</strong> dari akun <strong>"${escapeHtml(displayName)}" (@${escapeHtml(targetUsername)})</strong> beserta partisinya.<br><br>Masukkan <strong>PIN Super Admin</strong> Anda untuk konfirmasi:`,
    type: 'critical',
    inputType: 'password',
    placeholder: 'PIN Super Admin',
    confirmText: 'Hapus Toko',
    cancelText: 'Batal'
  });

  if (!adminPin) return;

  try {
    const res = await window.electronAPI.adminDeleteUserStore({
      requestingUsername: window.currentUser,
      password: adminPin,
      targetUsername,
      storeId
    });

    if (res && res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_store_deleted');
      }
      showToast(res.message || `Toko "${storeName}" berhasil dihapus.`, 'success');
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res?.error || 'Gagal menghapus toko', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan: ' + e.message, 'error');
  }
}
window.adminDeleteSingleStorePrompt = adminDeleteSingleStorePrompt;

async function adminClearSessionPrompt(username, displayName) {
  const adminPin = await showPromptDialog({
    title: 'Bersihkan Sesi & Cookies User',
    message: `Anda akan menghapus total <strong>seluruh sesi login, cookies, dan cache</strong> toko marketplace milik <strong>"${escapeHtml(displayName)}" (@${escapeHtml(username)})</strong>.<br><br>User tersebut harus login ulang ke seluruh tokonya.<br><br>Masukkan <strong>PIN Super Admin</strong> Anda untuk konfirmasi:`,
    type: 'warning',
    inputType: 'password',
    placeholder: 'PIN Super Admin',
    confirmText: 'Bersihkan Sesi User',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-warning'
  });

  if (!adminPin) return;

  try {
    const res = await window.electronAPI.adminClearUserSession({
      requestingUsername: window.currentUser,
      password: adminPin,
      targetUsername: username
    });

    if (res && res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_session_cleared');
      }
      showToast(res.message || `Sesi "${displayName}" berhasil dibersihkan.`, 'success');
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res?.error || 'Gagal membersihkan sesi', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan: ' + e.message, 'error');
  }
}
window.adminClearSessionPrompt = adminClearSessionPrompt;

async function adminResetPinPrompt(username, displayName) {
  const newPin = await showPromptDialog({
    title: 'Reset PIN Pengguna',
    message: `Masukkan <strong>PIN baru</strong> untuk akun <strong>"${escapeHtml(displayName)}" (@${escapeHtml(username)})</strong>:`,
    type: 'info',
    inputType: 'password',
    placeholder: 'PIN Baru (angka/karakter)',
    confirmText: 'Lanjut',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-primary'
  });

  if (!newPin) return;

  const adminPin = await showPromptDialog({
    title: 'Konfirmasi PIN Super Admin',
    message: `Masukkan <strong>PIN Super Admin</strong> Anda untuk mengonfirmasi perubahan PIN "${escapeHtml(displayName)}":`,
    type: 'critical',
    inputType: 'password',
    placeholder: 'PIN Super Admin',
    confirmText: 'Simpan PIN Baru',
    cancelText: 'Batal'
  });

  if (!adminPin) return;

  try {
    const res = await window.electronAPI.adminResetUserPin({
      requestingUsername: window.currentUser,
      password: adminPin,
      targetUsername: username,
      newPin: newPin
    });

    if (res && res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_pin_reset');
      }
      showToast(res.message || `PIN "${displayName}" berhasil direset.`, 'success');
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res?.error || 'Gagal mereset PIN', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan: ' + e.message, 'error');
  }
}
window.adminResetPinPrompt = adminResetPinPrompt;

async function deleteUserPrompt(usernameToDelete, displayName) {
  const pin = await showPromptDialog({
    title: 'Hapus Akun Pengguna',
    message: `Anda akan menghapus akun <strong>"${escapeHtml(displayName)}" (@${escapeHtml(usernameToDelete)})</strong> beserta seluruh data tokonya secara permanen.<br><br>Masukkan <strong>PIN Super Admin Anda</strong> untuk mengonfirmasi:`,
    type: 'critical',
    inputType: 'password',
    placeholder: 'PIN Super Admin',
    confirmText: 'Hapus Akun',
    cancelText: 'Batal'
  });

  if (!pin) return;

  try {
    const res = await window.electronAPI.deleteUser({
      usernameToDelete,
      requestingUsername: window.currentUser,
      password: pin
    });

    if (res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_user_deleted');
      }
      showToast(`Akun "${displayName}" berhasil dihapus.`, 'success');
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res.error || 'Gagal menghapus akun', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan: ' + e.message, 'error');
  }
}
window.deleteUserPrompt = deleteUserPrompt;

// Prompt: Ubah Role Pengguna (Promosikan ke Super Admin / Turunkan ke CS)
async function adminChangeRolePrompt(targetUsername, displayName, newRole) {
  const isPromote = newRole === 'Super Admin';
  const actionTitle = isPromote ? 'Promosikan Menjadi Super Admin' : 'Turunkan Menjadi Customer Service';
  const message = isPromote
    ? `Anda akan memberikan hak akses <strong>👑 Super Administrator</strong> kepada <strong>"${escapeHtml(displayName)}" (@${escapeHtml(targetUsername)})</strong>.<br><br>Akun ini akan memiliki kontrol penuh atas audit sesi, reset PIN, dan manajemen toko.<br><br>Masukkan <strong>PIN Super Admin Anda</strong> untuk konfirmasi:`
    : `Anda akan menurunkan role <strong>"${escapeHtml(displayName)}" (@${escapeHtml(targetUsername)})</strong> menjadi <strong>👩‍💼 Customer Service</strong>.<br><br>Masukkan <strong>PIN Super Admin Anda</strong> untuk konfirmasi:`;

  const adminPin = await showPromptDialog({
    title: actionTitle,
    message: message,
    type: isPromote ? 'info' : 'warning',
    inputType: 'password',
    placeholder: 'PIN Super Admin Anda',
    confirmText: isPromote ? '👑 Jadikan Super Admin' : 'Ubah ke CS',
    cancelText: 'Batal',
    confirmBtnClass: isPromote ? 'btn-primary' : 'btn-warning'
  });

  if (!adminPin) return;

  try {
    const res = await window.electronAPI.adminChangeUserRole({
      requestingUsername: window.currentUser,
      password: adminPin,
      targetUsername,
      newRole
    });

    if (res && res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_role_changed');
      }
      showToast(res.message || `Role akun ${displayName} berhasil diubah!`, 'success');
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res?.error || 'Gagal mengubah role pengguna', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan: ' + e.message, 'error');
  }
}
window.adminChangeRolePrompt = adminChangeRolePrompt;

// Modal Tambah User / Admin Baru dari Super Admin Panel
function openAdminCreateUserModal() {
  const overlay = document.getElementById('modal-admin-create-user-overlay');
  if (!overlay) return;
  const dInput = document.getElementById('adm-new-display-name');
  const rInput = document.getElementById('adm-new-role');
  const pInput = document.getElementById('adm-new-password');
  const aInput = document.getElementById('adm-confirm-admin-pin');

  if (dInput) dInput.value = '';
  if (rInput) rInput.value = 'Customer Service';
  if (pInput) pInput.value = '';
  if (aInput) aInput.value = '';

  overlay.classList.add('active');
  setTimeout(() => dInput?.focus(), 150);
}
window.openAdminCreateUserModal = openAdminCreateUserModal;

function closeAdminCreateUserModal() {
  document.getElementById('modal-admin-create-user-overlay')?.classList.remove('active');
}
window.closeAdminCreateUserModal = closeAdminCreateUserModal;

async function handleAdminCreateUserSubmit(e) {
  if (e) e.preventDefault();
  const displayName = document.getElementById('adm-new-display-name')?.value.trim();
  const username = document.getElementById('adm-new-username')?.value.trim() || '';
  const role = document.getElementById('adm-new-role')?.value || 'Customer Service';
  const newPassword = document.getElementById('adm-new-password')?.value;
  const adminPassword = document.getElementById('adm-confirm-admin-pin')?.value;

  if (!displayName || !newPassword || !adminPassword) {
    showToast('Harap lengkapi semua kolom yang bertanda bintang (*)!', 'error');
    return;
  }

  const btn = document.getElementById('btn-admin-create-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Membuat...';
  }

  // Generate safe clean slug username for instant compatibility
  const baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'cs';
  const autoUsername = username || `${baseSlug}_${Date.now().toString(36).slice(-4)}`;

  try {
    const res = await window.electronAPI.adminCreateUser({
      requestingUsername: window.currentUser,
      password: adminPassword,
      newUsername: autoUsername,
      newDisplayName: displayName,
      newRole: role,
      newPassword,
      avatarColor: role === 'Super Admin' ? '#e11d48' : '#df1683',
      avatarIcon: role === 'Super Admin' ? '👑' : '👩‍💼'
    });

    if (res && res.success) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('admin_user_created');
      }
      showToast(res.message || 'Pengguna berhasil dibuat!', 'success');
      closeAdminCreateUserModal();
      if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
    } else {
      showToast(res?.error || 'Gagal membuat pengguna', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Buat Pengguna Baru';
    }
  }
}
window.handleAdminCreateUserSubmit = handleAdminCreateUserSubmit;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-admin-create-close')?.addEventListener('click', closeAdminCreateUserModal);
  document.getElementById('btn-admin-create-cancel')?.addEventListener('click', closeAdminCreateUserModal);
  document.getElementById('admin-create-user-form')?.addEventListener('submit', handleAdminCreateUserSubmit);
  document.getElementById('modal-admin-create-user-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-admin-create-user-overlay') closeAdminCreateUserModal();
  });
});

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
            <button class="btn-icon" title="Clear Cache & Reload Toko Ini (Login Tetap Aman)" onclick="clearStoreCacheAndReload('${store.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </button>
            <!-- Opsi 3: Reset Sesi Toko (Logout) -->
            <button class="btn-icon" title="Reset Total Sesi Toko Ini (Logout)" onclick="deepCleanStoreAndConfirm('${store.id}')" style="color: #f59e0b;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                <line x1="12" y1="2" x2="12" y2="12"/>
              </svg>
            </button>
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
      if (window.AppTelemetry) {
        window.AppTelemetry.track('store_cache_cleared');
      }
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
      if (window.AppTelemetry) {
        window.AppTelemetry.track('store_deep_cleaned');
      }
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
  if (window.AppTelemetry) {
    window.AppTelemetry.track('store_whitelist_toggled');
  }
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
    if (ok) {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('config_exported');
      }
      showToast('Konfigurasi berhasil diekspor ✓', 'success');
    }
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
    if (window.AppTelemetry) {
      window.AppTelemetry.track('config_imported');
    }
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
