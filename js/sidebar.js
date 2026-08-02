// ── Sidebar Collapse ──────────────────────────────────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
}

// ── Search / Filter ───────────────────────────────────────────────────────────
function getFilteredStores() {
  const q = searchInput.value.toLowerCase().trim();
  if (!q) return stores;
  return stores.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (MARKETPLACE_CONFIG[s.marketplace]?.label || '').toLowerCase().includes(q)
  );
}

// ── Render Sidebar ───────────────────────────────────────────────────────────
function renderSidebar(filteredStores) {
  if (filteredStores.length === 0) {
    sidebarContent.innerHTML = `<div class="no-stores-msg">Belum ada toko.<br>Klik <strong>+ Tambah Toko</strong> untuk memulai.</div>`;
    return;
  }

  // Group by marketplace
  const groups = {};
  filteredStores.forEach(store => {
    if (!groups[store.marketplace]) groups[store.marketplace] = [];
    groups[store.marketplace].push(store);
  });

  let html = '';
  for (const [mp, mpStores] of Object.entries(groups)) {
    const cfg = MARKETPLACE_CONFIG[mp] || MARKETPLACE_CONFIG.custom;
    html += `<div class="store-group">
      <div class="store-group-header">
        <div class="store-group-dot" style="background:${cfg.groupColor}"></div>
        ${cfg.label}
      </div>`;
    mpStores.forEach(store => {
      const isActive = store.id === activeStoreId;
      const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
      const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
      const storeTabList = storeTabs[store.id] || [];
      const allHibernated = storeTabList.length > 0 && storeTabList.every(t => webviewMap[t.id]?.hibernated);
      const leafBadge = '<span class="hibernate-badge">&#x1F343;</span>';
      html += `
        <div class="store-item ${isActive ? 'active' : ''} ${allHibernated ? 'hibernated' : ''}" data-id="${store.id}" title="${escapeHtml(store.name)}${allHibernated ? ' (Tidur)' : ''}">
          <div class="store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}${allHibernated ? leafBadge : ''}</div>
          <div class="store-info">
            <div class="store-name">${escapeHtml(store.name)}</div>
            <div class="store-marketplace-label">${cfg.label}${allHibernated ? ' &middot; Tidur' : ''}</div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  sidebarContent.innerHTML = html;

  sidebarContent.querySelectorAll('.store-item').forEach(el => {
    el.addEventListener('click', () => activateStore(el.dataset.id));
  });
}
