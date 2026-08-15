// ── Sidebar Collapse ──────────────────────────────────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
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
      const isSyncing = storeTabList.some(t => webviewMap[t.id]?.isSyncing);
      const syncBadge = `
        <span class="sidebar-sync-badge" title="Sedang menyinkronkan chat...">
          <svg class="sync-spin" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </span>`;
      const unread = unreadMap[store.id] || 0;
      const unreadBadge = unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : '';
      const leafBadge = `<span class="hibernate-badge" title="Toko ini sedang tidur (hemat RAM)">🍃</span>`;
      const shieldBadge = store.hibernationWhitelisted ? '<span class="whitelist-badge" title="Toko ini dikecualikan dari hibernasi otomatis">🛡️</span>' : '';

      const statusLabel = isSyncing 
        ? '<span style="color:#3b82f6; font-weight:600;">&middot; Menyinkronkan...</span>' 
        : (allHibernated ? '&middot; Tidur' : '');

      html += `
        <div class="store-item ${isActive ? 'active' : ''} ${allHibernated ? 'hibernated' : ''} ${isSyncing ? 'syncing' : ''}" data-id="${store.id}" title="${escapeHtml(store.name)}${isSyncing ? ' (Menyinkronkan chat...)' : (allHibernated ? ' (Tidur)' : '')}" draggable="true">
          <div class="store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}${isSyncing ? syncBadge : (allHibernated ? leafBadge : '')}${shieldBadge}${unreadBadge}</div>
          <div class="store-info">
            <div class="store-name">${escapeHtml(store.name)}</div>
            <div class="store-marketplace-label">${cfg.label} ${statusLabel}</div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  if (sidebarContent.dataset.lastHtml === html) {
    return; // Tidak ada perubahan, jangan reset DOM agar tidak berkedip!
  }
  sidebarContent.dataset.lastHtml = html;
  sidebarContent.innerHTML = html;

  sidebarContent.querySelectorAll('.store-item').forEach(el => {
    el.addEventListener('click', () => activateStore(el.dataset.id));
    bindDragEvents(el);
  });
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
    
    // Force DOM update by resetting cached html
    sidebarContent.dataset.lastHtml = '';
    renderSidebar(getFilteredStores());
  });
}

// ==========================================
// Feedback Modal Logic
// ==========================================
const feedbackModal = document.getElementById('feedback-modal');
const btnFeedbackClose = document.getElementById('btn-feedback-close');
const btnFeedbackCancel = document.getElementById('btn-feedback-cancel');
const btnFeedbackSubmit = document.getElementById('btn-feedback-submit');
const feedbackType = document.getElementById('feedback-type');
const feedbackMessage = document.getElementById('feedback-message');

function openFeedbackModal() {
  if (feedbackModal) {
    feedbackModal.classList.add('active');
    setTimeout(() => {
      if (feedbackMessage) feedbackMessage.focus();
    }, 150);
  }
}

function closeFeedbackModal() {
  if (feedbackModal) {
    feedbackModal.classList.remove('active');
  }
  if (feedbackMessage) {
    feedbackMessage.value = '';
  }
}

window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-feedback')) {
    openFeedbackModal();
  } else if (e.target === feedbackModal) {
    closeFeedbackModal();
  }
});

if (btnFeedbackClose) btnFeedbackClose.addEventListener('click', closeFeedbackModal);
if (btnFeedbackCancel) btnFeedbackCancel.addEventListener('click', closeFeedbackModal);

if (btnFeedbackSubmit) {
  btnFeedbackSubmit.addEventListener('click', async () => {
    const msg = feedbackMessage ? feedbackMessage.value.trim() : '';
    if (!msg) {
      showToast('Deskripsi tidak boleh kosong.', 'error');
      return;
    }

    btnFeedbackSubmit.disabled = true;
    btnFeedbackSubmit.textContent = 'Mengirim...';

    // Prepare diagnostic config safely (no passwords)
    const safeConfig = JSON.stringify((typeof stores !== 'undefined' ? stores : []).map(s => ({ name: s.name, marketplace: s.marketplace })), null, 2);

    try {
      const response = await window.electronAPI.submitFeedback({
        type: feedbackType ? feedbackType.value : 'bug',
        message: msg,
        storesConfig: safeConfig
      });

      if (response && response.success) {
        showToast('Feedback berhasil dikirim. Terima kasih!', 'success');
        closeFeedbackModal();
      } else {
        throw new Error((response && response.error) || 'Gagal terhubung ke server');
      }
    } catch (err) {
      showToast('Gagal mengirim feedback: ' + err.message, 'error');
    } finally {
      btnFeedbackSubmit.disabled = false;
      btnFeedbackSubmit.textContent = 'Kirim Feedback';
    }
  });
}
