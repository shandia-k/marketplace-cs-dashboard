// ── Sidebar Collapse ──────────────────────────────────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
}

// ── Store Ordering ─────────────────────────────────────────────────────────────
function getOrderedStores() {
  const userPrefix = window.currentUser ? ('_' + window.currentUser) : '';
  const savedOrderStr = localStorage.getItem('storeOrder' + userPrefix);
  let orderedStores = [...stores];
  
  if (savedOrderStr) {
    try {
      const savedOrder = JSON.parse(savedOrderStr);
      orderedStores.sort((a, b) => {
        const idxA = savedOrder.indexOf(a.id);
        const idxB = savedOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } catch(e) {}
  }
  return orderedStores;
}

function saveStoreOrder(currentOrderedStores) {
  const userPrefix = window.currentUser ? ('_' + window.currentUser) : '';
  const order = currentOrderedStores.map(s => s.id);
  localStorage.setItem('storeOrder' + userPrefix, JSON.stringify(order));
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
      const leafBadge = '<span class="hibernate-badge">&#x1F343;</span>';
      const unread = unreadMap[store.id] || 0;
      const unreadBadge = unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : '';
      const shieldBadge = store.hibernationWhitelisted ? '<span class="whitelist-badge">🛡️</span>' : '';
      html += `
        <div class="store-item ${isActive ? 'active' : ''} ${allHibernated ? 'hibernated' : ''}" data-id="${store.id}" title="${escapeHtml(store.name)}${allHibernated ? ' (Tidur)' : ''}" draggable="true">
          <div class="store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}${allHibernated ? leafBadge : ''}${shieldBadge}${unreadBadge}</div>
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
      document.querySelectorAll('.store-item.drag-over').forEach(d => d.classList.remove('drag-over'));
      el.classList.add('drag-over');
    }
  });

  el.addEventListener('dragleave', () => {
    el.classList.remove('drag-over');
  });

  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (!dragSrcId || el.dataset.id === dragSrcId) return;

    const ordered = getOrderedStores();
    const srcIdx  = ordered.findIndex(s => s.id === dragSrcId);
    const destIdx = ordered.findIndex(s => s.id === el.dataset.id);
    if (srcIdx === -1 || destIdx === -1) return;

    // Reorder
    const [moved] = ordered.splice(srcIdx, 1);
    ordered.splice(destIdx, 0, moved);

    // Save only the order for the current user
    saveStoreOrder(ordered);
    
    // Note: We don't save to global stores.json to prevent affecting other users
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

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-feedback')) {
    feedbackModal.classList.add('active');
    if (feedbackMessage) feedbackMessage.focus();
  }
});

const closeFeedbackModal = () => {
  feedbackModal.classList.remove('active');
  feedbackMessage.value = '';
};

if (btnFeedbackClose) btnFeedbackClose.addEventListener('click', closeFeedbackModal);
if (btnFeedbackCancel) btnFeedbackCancel.addEventListener('click', closeFeedbackModal);

if (btnFeedbackSubmit) {
  btnFeedbackSubmit.addEventListener('click', async () => {
    const msg = feedbackMessage.value.trim();
    if (!msg) {
      showToast('Deskripsi tidak boleh kosong.', 'error');
      return;
    }

    btnFeedbackSubmit.disabled = true;
    btnFeedbackSubmit.textContent = 'Mengirim...';

    // Prepare diagnostic config safely (no passwords)
    const safeConfig = JSON.stringify(stores.map(s => ({ name: s.name, type: s.type })), null, 2);

    try {
      const response = await window.electronAPI.submitFeedback({
        type: feedbackType.value,
        message: msg,
        storesConfig: safeConfig
      });

      if (response.success) {
        showToast('Feedback berhasil dikirim. Terima kasih!', 'success');
        closeFeedbackModal();
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err) {
      showToast('Gagal mengirim feedback: ' + err.message, 'error');
    } finally {
      btnFeedbackSubmit.disabled = false;
      btnFeedbackSubmit.textContent = 'Kirim Feedback';
    }
  });
}
