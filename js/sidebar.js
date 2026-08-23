// ── Sidebar Hover Expand & Pin Logic ──────────────────────────────────────────
let sidebarCollapseTimer = null;

function expandSidebar() {
  if (sidebarCollapseTimer) {
    clearTimeout(sidebarCollapseTimer);
    sidebarCollapseTimer = null;
  }
  sidebarCollapsed = false;
  if (sidebarEl) {
    sidebarEl.classList.remove('collapsed');
    sidebarEl.classList.add('expanded');
  }
  if (typeof updateSidebarScrollAffordance === 'function') {
    setTimeout(updateSidebarScrollAffordance, 100);
  }
}

function collapseSidebar(immediate = false) {
  if (sidebarPinned) return; // Jangan collapse jika sedang di-pin

  if (immediate) {
    if (sidebarEl && sidebarEl.matches(':hover')) return; // Jangan collapse jika mouse masih di atas sidebar
    if (sidebarCollapseTimer) {
      clearTimeout(sidebarCollapseTimer);
      sidebarCollapseTimer = null;
    }
    sidebarCollapsed = true;
    if (sidebarEl) {
      sidebarEl.classList.remove('expanded');
      sidebarEl.classList.add('collapsed');
    }
    if (typeof updateSidebarScrollAffordance === 'function') {
      setTimeout(updateSidebarScrollAffordance, 100);
    }
    return;
  }

  if (sidebarCollapseTimer) clearTimeout(sidebarCollapseTimer);
  sidebarCollapseTimer = setTimeout(() => {
    if (sidebarPinned) return;
    if (sidebarEl && sidebarEl.matches(':hover')) return; // Jangan collapse jika mouse masih di atas sidebar
    sidebarCollapsed = true;
    if (sidebarEl) {
      sidebarEl.classList.remove('expanded');
      sidebarEl.classList.add('collapsed');
    }
    if (typeof updateSidebarScrollAffordance === 'function') {
      setTimeout(updateSidebarScrollAffordance, 100);
    }
  }, 120);
}

function togglePinSidebar() {
  sidebarPinned = !sidebarPinned;
  Storage.set('sidebarPinned', sidebarPinned);
  updateSidebarPinUI();

  if (sidebarPinned) {
    expandSidebar();
  } else {
    // Jika di-unpin dan kursor tidak sedang di atas sidebar, collapse
    if (!sidebarEl || !sidebarEl.matches(':hover')) {
      collapseSidebar(true);
    }
  }
}

function updateSidebarPinUI() {
  const pinBtn = document.getElementById('btn-pin-sidebar');
  const appLayout = document.getElementById('app-layout');
  if (!sidebarEl) return;

  if (sidebarPinned) {
    sidebarEl.classList.add('pinned');
    if (appLayout) appLayout.classList.add('sidebar-pinned');
    if (pinBtn) {
      pinBtn.classList.add('pinned');
      pinBtn.title = 'Lepas Sematan Sidebar (Otomatis Sembunyi)';
      pinBtn.setAttribute('aria-label', 'Lepas Sematan Sidebar');
    }
  } else {
    sidebarEl.classList.remove('pinned');
    if (appLayout) appLayout.classList.remove('sidebar-pinned');
    if (pinBtn) {
      pinBtn.classList.remove('pinned');
      pinBtn.title = 'Sematkan Sidebar (Tetap Terbuka)';
      pinBtn.setAttribute('aria-label', 'Sematkan Sidebar');
    }
  }
}

function initSidebarHoverAndPin() {
  if (!sidebarEl) return;

  // Restore saved pin state
  sidebarPinned = Storage.get('sidebarPinned', false);
  updateSidebarPinUI();

  if (sidebarPinned) {
    expandSidebar();
  } else {
    collapseSidebar(true);
  }

  sidebarEl.addEventListener('mouseenter', () => {
    if (!sidebarPinned) {
      expandSidebar();
    }
  });

  sidebarEl.addEventListener('mousemove', () => {
    if (!sidebarPinned && sidebarEl.classList.contains('collapsed')) {
      expandSidebar();
    }
  });

  sidebarEl.addEventListener('mouseleave', (e) => {
    if (sidebarPinned) return;
    // Jangan collapse jika kursor masih di dalam boundary sidebar
    if (e.relatedTarget && sidebarEl.contains(e.relatedTarget)) return;
    if (sidebarEl.matches(':hover')) return;
    // Jika focus masih di input pencarian, jangan collapse dulu
    if (searchInput && document.activeElement === searchInput) return;
    // Jika popover user menu masih terbuka, jangan collapse dulu
    const userPopover = document.getElementById('user-popover-menu');
    if (userPopover && userPopover.classList.contains('active')) return;
    collapseSidebar(false);
  });

  if (searchInput) {
    searchInput.addEventListener('blur', () => {
      if (!sidebarPinned && sidebarEl && !sidebarEl.matches(':hover')) {
        collapseSidebar(false);
      }
    });
  }
}

// Backward compatibility
function toggleSidebar() {
  togglePinSidebar();
}

// ── Store Ordering ─────────────────────────────────────────────────────────────
function getOrderedStores() {
  const savedOrder = Storage.get('storeOrder', null);
  let orderedStores = [...stores];
  
  if (Array.isArray(savedOrder)) {
    orderedStores.sort((a, b) => {
      const idxA = savedOrder.indexOf(a.id);
      const idxB = savedOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }
  return orderedStores;
}

function saveStoreOrder(currentOrderedStores) {
  const order = currentOrderedStores.map(s => s.id);
  Storage.set('storeOrder', order);
}

// ── Search / Filter ───────────────────────────────────────────────────────────
function getFilteredStores() {
  const q = searchInput.value.toLowerCase().trim();
  const ordered = getOrderedStores();
  if (!q) return ordered;
  return ordered.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (MARKETPLACE_CONFIG[s.marketplace]?.label || '').toLowerCase().includes(q)
  );
}

// ── Render Sidebar ───────────────────────────────────────────────────────────
function renderSidebar(filteredStores) {
  if (!sidebarContent) return;

  if (!filteredStores || filteredStores.length === 0) {
    sidebarContent.dataset.lastHtml = '';
    sidebarContent.dataset.lastUser = window.currentUser || '';
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
      <div class="store-group-header" aria-label="${escapeHtml(cfg.label)}">
        <div class="store-group-dot" style="background:${cfg.groupColor}"></div>
        <span class="store-group-label">${escapeHtml(cfg.label)}</span>
      </div>`;
    mpStores.forEach(store => {
      const isActive = store.id === activeStoreId;
      const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
      const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
      const storeTabList = storeTabs[store.id] || [];
      const isSyncing = storeTabList.some(t => webviewMap[t.id]?.isSyncing);
      const syncBadge = `
        <span class="sidebar-sync-badge" title="Sedang menyinkronkan chat...">
          <svg class="sync-spin" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </span>`;
      const unread = unreadMap[store.id] || 0;
      const unreadBadge = unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : '';

      const statusLabel = isSyncing 
        ? '<span style="color:#3b82f6; font-weight:600;">&middot; Menyinkronkan...</span>' 
        : '';

      html += `
        <div class="store-item ${isActive ? 'active' : ''} ${isSyncing ? 'syncing' : ''}" data-id="${store.id}" aria-label="${escapeHtml(store.name)}" draggable="true">
          <div class="store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}${isSyncing ? syncBadge : ''}${unreadBadge}</div>
          <div class="store-info">
            <div class="store-name">${escapeHtml(store.name)}</div>
            <div class="store-marketplace-label">${cfg.label} ${statusLabel}</div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  const hasStoreItems = sidebarContent.querySelector('.store-item') !== null;
  const isSameUser = sidebarContent.dataset.lastUser === (window.currentUser || '');

  if (hasStoreItems && isSameUser && sidebarContent.dataset.lastHtml === html) {
    return; // Tidak ada perubahan dan DOM toko sudah ada, jangan reset agar tidak berkedip!
  }

  sidebarContent.dataset.lastHtml = html;
  sidebarContent.dataset.lastUser = window.currentUser || '';
  sidebarContent.innerHTML = html;

  // Pastikan sidebar tetap expanded jika mouse saat ini sedang berada di atas sidebar
  if (!sidebarPinned && sidebarEl && sidebarEl.matches(':hover')) {
    sidebarEl.classList.remove('collapsed');
    sidebarEl.classList.add('expanded');
    sidebarCollapsed = false;
    if (sidebarCollapseTimer) {
      clearTimeout(sidebarCollapseTimer);
      sidebarCollapseTimer = null;
    }
  }

  sidebarContent.querySelectorAll('.store-item').forEach(el => {
    el.addEventListener('click', () => activateStore(el.dataset.id));
    bindDragEvents(el);
  });

  if (typeof updateSidebarScrollAffordance === 'function') {
    setTimeout(updateSidebarScrollAffordance, 50);
  }
  if (typeof triggerSidebarScrollNudge === 'function') {
    setTimeout(triggerSidebarScrollNudge, 100);
  }
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
let dragSrcId = null;

function bindDragEvents(el) {
  el.addEventListener('dragstart', e => {
    dragSrcId = el.dataset.id;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcId);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    document.querySelectorAll('.store-item.drag-over').forEach(d => d.classList.remove('drag-over'));
    dragSrcId = null;
  });

  el.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (el.dataset.id !== dragSrcId) {
      document.querySelectorAll('.store-item.drag-over').forEach(d => {
        if (d !== el) d.classList.remove('drag-over');
      });
      el.classList.add('drag-over');
    }
  });

  el.addEventListener('dragleave', e => {
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('drag-over');
    }
  });

  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (!dragSrcId || el.dataset.id === dragSrcId) return;

    const ordered = getOrderedStores();
    const srcIdx  = ordered.findIndex(s => s.id === dragSrcId);
    if (srcIdx === -1) return;

    // Reorder presisi
    const [moved] = ordered.splice(srcIdx, 1);
    const targetIdx = ordered.findIndex(s => s.id === el.dataset.id);
    if (targetIdx !== -1) {
      ordered.splice(targetIdx, 0, moved);
    } else {
      ordered.push(moved);
    }

    // Save only the order for the current user
    saveStoreOrder(ordered);
    if (window.AppTelemetry) {
      window.AppTelemetry.track('store_reordered');
    }
    
    // Force DOM update by resetting cached html
    sidebarContent.dataset.lastHtml = '';
    renderSidebar(getFilteredStores());
  });
}

// ── Smart Sidebar Scroll Affordance (Theme-Agnostic CSS Masking) ────────────
function updateSidebarScrollAffordance() {
  if (!sidebarContent) return;

  const scrollTop = sidebarContent.scrollTop;
  const scrollHeight = sidebarContent.scrollHeight;
  const clientHeight = sidebarContent.clientHeight;
  const canScroll = scrollHeight > clientHeight + 4;

  if (!canScroll) {
    sidebarContent.classList.remove('mask-top', 'mask-bottom', 'mask-both');
    return;
  }

  const hasTop = scrollTop > 8;
  const hasBottom = scrollTop + clientHeight < scrollHeight - 8;

  sidebarContent.classList.toggle('mask-top', hasTop && !hasBottom);
  sidebarContent.classList.toggle('mask-bottom', hasBottom && !hasTop);
  sidebarContent.classList.toggle('mask-both', hasTop && hasBottom);
}

let isSidebarScrollAffordanceBound = false;
function initSidebarScrollAffordance() {
  if (isSidebarScrollAffordanceBound) return;
  if (!sidebarContent) return;
  isSidebarScrollAffordanceBound = true;

  sidebarContent.addEventListener('scroll', updateSidebarScrollAffordance, { passive: true });
  window.addEventListener('resize', updateSidebarScrollAffordance, { passive: true });

  // Meneruskan scroll mouse wheel dari header/footer ke sidebar-content (terutama saat collapsed)
  sidebarEl?.addEventListener('wheel', (e) => {
    if (!sidebarContent) return;
    if (!e.target.closest('#sidebar-content') && !e.target.closest('#sidebar-user-card')) {
      sidebarContent.scrollTop += e.deltaY;
    }
  }, { passive: true });

  updateSidebarScrollAffordance();
  triggerSidebarScrollNudge();
}

let hasPlayedSidebarScrollNudge = false;

function triggerSidebarScrollNudge() {
  if (!sidebarContent || hasPlayedSidebarScrollNudge) return;

  const canScroll = sidebarContent.scrollHeight > sidebarContent.clientHeight + 10;
  if (!canScroll) return;

  hasPlayedSidebarScrollNudge = true;

  // Beri jeda 400ms setelah render agar user melihat posisi awal, lalu lakukan micro-peek bounce
  setTimeout(() => {
    if (!sidebarContent) return;
    if (sidebarContent.scrollTop > 5) return; // Batalkan jika user sudah scroll sendiri

    sidebarContent.classList.add('scroll-peek-nudge');

    setTimeout(() => {
      sidebarContent?.classList.remove('scroll-peek-nudge');
      updateSidebarScrollAffordance();
    }, 950);
  }, 400);
}

window.updateSidebarScrollAffordance = updateSidebarScrollAffordance;
window.triggerSidebarScrollNudge     = triggerSidebarScrollNudge;
window.initSidebarScrollAffordance   = initSidebarScrollAffordance;
window.togglePinSidebar              = togglePinSidebar;
window.toggleSidebar                 = toggleSidebar;
window.expandSidebar                 = expandSidebar;
window.collapseSidebar               = collapseSidebar;
window.initSidebarHoverAndPin        = initSidebarHoverAndPin;

function initSidebarModules() {
  initSidebarScrollAffordance();
  initSidebarHoverAndPin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarModules);
} else {
  initSidebarModules();
}
