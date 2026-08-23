/**
 * js/tools.js
 * CS Toolkit:
 * 1. 📝 Customer Sticky Notes & Warning Tracker
 * 2. ⚡ Speed Dial FAB & Assistant Tools
 */

// ── HELPER: INSERT TEXT TO ACTIVE CHAT ────────────────────────────────────────
function insertTextToActiveChat(text) {
  if (!text) return;

  const activeTabId = typeof activeStoreId !== 'undefined' && activeStoreId ? activeTabMap[activeStoreId] : null;
  const wv = activeTabId && typeof webviewMap !== 'undefined' ? webviewMap[activeTabId]?.webview : null;

  if (wv) {
    try {
      wv.send('insert-chat-text', text);
      if (typeof showToast === 'function') showToast('⚡ Pesan berhasil diketik ke chat!', 'success');
    } catch (e) {
      if (typeof copyResolvedText === 'function') copyResolvedText(text);
      if (typeof showToast === 'function') showToast('Pesan disalin ke clipboard!', 'success');
    }
  } else {
    if (typeof copyResolvedText === 'function') copyResolvedText(text);
    if (typeof showToast === 'function') showToast('Pesan disalin ke clipboard!', 'success');
  }
}

// ── CATATAN KHUSUS PELANGGAN (CUSTOMER STICKY NOTES) ──────────────────────────

let customerNotes = [];
let editingNoteId = null;
let activeNotesTagFilter = 'all';

function loadCustomerNotes() {
  const saved = Storage.get('customerNotes', null);
  if (Array.isArray(saved)) {
    customerNotes = saved;
  } else {
    customerNotes = [
      {
        id: 'note-sample-1',
        buyerName: 'Budi Santoso (budi_99)',
        phone: '081234567890',
        tag: 'vip',
        note: 'Pembeli langganan partai besar. Selalu berikan bonus stiker / sample produk saat packing.',
        date: new Date().toLocaleDateString('id-ID')
      },
      {
        id: 'note-sample-2',
        buyerName: 'Rina (rina_olshop)',
        phone: '089876543210',
        tag: 'warning',
        note: 'Pernah menolak paket COD 2x. Wajib konfirmasi chat sebelum kirim pesanan baru!',
        date: new Date().toLocaleDateString('id-ID')
      }
    ];
  }
}

function saveCustomerNotes() {
  Storage.set('customerNotes', customerNotes);
}

function renderCustomerNotesList() {
  const container = document.getElementById('cnotes-list');
  const searchInput = document.getElementById('cnotes-search-input');
  if (!container) return;

  const query = (searchInput?.value || '').toLowerCase().trim();

  const filtered = customerNotes.filter(n => {
    const matchTag = activeNotesTagFilter === 'all' || n.tag === activeNotesTagFilter;
    if (!matchTag) return false;

    if (!query) return true;
    return (
      n.buyerName.toLowerCase().includes(query) ||
      (n.phone && n.phone.includes(query)) ||
      n.note.toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="qr-empty-state" style="padding:28px 16px;">
        <p>Tidak ada catatan pembeli yang cocok.</p>
      </div>`;
    return;
  }

  const tagLabels = {
    vip:     { label: '🌟 VIP Buyer', class: 'tag-vip' },
    warning: { label: '⚠️ Perhatian / COD', class: 'tag-warning' },
    return:  { label: '📦 Riwayat Retur', class: 'tag-return' },
    info:    { label: 'ℹ️ Catatan Biasa', class: 'tag-info' }
  };

  container.innerHTML = filtered.map(n => {
    const tagInfo = tagLabels[n.tag] || tagLabels.info;
    const cleanBuyer = escapeHtml(n.buyerName);

    return `
      <div class="cnote-card">
        <div class="cnote-header">
          <div>
            <h4 class="cnote-buyer-name">${cleanBuyer}</h4>
            ${n.phone ? `<span class="cnote-buyer-phone">📞 ${escapeHtml(n.phone)}</span>` : ''}
          </div>
          <span class="cnote-tag ${tagInfo.class}">${tagInfo.label}</span>
        </div>
        <div class="cnote-body">${escapeHtml(n.note)}</div>
        <div class="cnote-footer">
          <span class="cnote-date">${n.date || ''}</span>
          <div class="cnote-actions">
            <button class="qr-btn-action-icon btn-cnote-greet" title="Ketik Sapaan Khusus ke Chat" data-id="${n.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </button>
            <button class="qr-btn-action-icon" title="Edit Catatan" onclick="openEditNoteModal('${n.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="qr-btn-action-icon danger" title="Hapus Catatan" onclick="deleteCustomerNote('${n.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-cnote-greet').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const note = customerNotes.find(n => n.id === id);
      if (!note) return;
      const cleanBuyer = note.buyerName;
      let chatGreeting = `Halo kak ${cleanBuyer}! Terima kasih sudah menghubungi kami. Ada yang bisa kami bantu kak? 😊`;
      if (note.tag === 'vip') {
        chatGreeting = `Halo kak ${cleanBuyer}! Senang sekali melayani kakak kembali sebagai pelanggan setia kami. Ada yang bisa kami siapkan untuk pesanan kakak hari ini? ✨`;
      } else if (note.tag === 'warning') {
        chatGreeting = `Halo kak ${cleanBuyer}! Terkait pesanan dengan metode pembayaran COD ini kami konfirmasi kembali ya kak, mohon pastikan no. HP aktif dan alamat sudah sesuai. Terima kasih! 🙏`;
      }
      insertTextToActiveChat(chatGreeting);
      if (window.AppTelemetry) {
        window.AppTelemetry.track('tool_cnotes_greet_used');
      }
    });
  });
}

function openCustomerNotesModal() {
  loadCustomerNotes();
  document.getElementById('modal-cnotes-overlay')?.classList.add('active');
  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_cnotes_opened');
  }
  renderCustomerNotesList();
  setTimeout(() => document.getElementById('cnotes-search-input')?.focus(), 150);

  if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('use_cnotes');
  }
}

function closeCustomerNotesModal() {
  document.getElementById('modal-cnotes-overlay')?.classList.remove('active');
}

function openAddNoteFormModal() {
  editingNoteId = null;
  document.getElementById('form-cnote-buyer').value = '';
  document.getElementById('form-cnote-phone').value = '';
  document.getElementById('form-cnote-tag').value = 'info';
  document.getElementById('form-cnote-text').value = '';
  document.getElementById('modal-cnote-form-overlay')?.classList.add('active');
  setTimeout(() => document.getElementById('form-cnote-buyer')?.focus(), 150);
}

function openEditNoteModal(id) {
  const note = customerNotes.find(n => n.id === id);
  if (!note) return;

  editingNoteId = id;
  document.getElementById('form-cnote-buyer').value = note.buyerName;
  document.getElementById('form-cnote-phone').value = note.phone || '';
  document.getElementById('form-cnote-tag').value = note.tag || 'info';
  document.getElementById('form-cnote-text').value = note.note;
  document.getElementById('modal-cnote-form-overlay')?.classList.add('active');
  setTimeout(() => document.getElementById('form-cnote-buyer')?.focus(), 150);
}

function closeAddNoteFormModal() {
  document.getElementById('modal-cnote-form-overlay')?.classList.remove('active');
  editingNoteId = null;
}

function saveCustomerNoteFromForm() {
  const buyerName = document.getElementById('form-cnote-buyer').value.trim();
  const phone = document.getElementById('form-cnote-phone').value.trim();
  const tag = document.getElementById('form-cnote-tag').value;
  const note = document.getElementById('form-cnote-text').value.trim();

  if (!buyerName || !note) {
    if (typeof showToast === 'function') showToast('Nama/Username pembeli dan isi catatan wajib diisi!', 'error');
    return;
  }

  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (editingNoteId) {
    const idx = customerNotes.findIndex(n => n.id === editingNoteId);
    if (idx !== -1) {
      customerNotes[idx].buyerName = buyerName;
      customerNotes[idx].phone = phone;
      customerNotes[idx].tag = tag;
      customerNotes[idx].note = note;
    }
  } else {
    customerNotes.unshift({
      id: 'cnote-' + Date.now(),
      buyerName,
      phone,
      tag,
      note,
      date: dateStr
    });
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track(editingNoteId ? 'tool_cnotes_edited' : 'tool_cnotes_created');
  }

  saveCustomerNotes();
  closeAddNoteFormModal();
  renderCustomerNotesList();
  if (typeof showToast === 'function') showToast('Catatan pembeli berhasil disimpan ✓', 'success');

  if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('use_cnotes');
  }
}

async function deleteCustomerNote(id) {
  const note = customerNotes.find(n => n.id === id);
  const buyerName = note?.buyerName || 'pembeli ini';
  const confirmed = await showConfirmDialog({
    title: 'Hapus Catatan Pembeli',
    message: `Apakah Anda yakin ingin menghapus catatan untuk <strong>"${escapeHtml(buyerName)}"</strong>?`,
    type: 'danger',
    icon: '🗑️',
    confirmText: 'Hapus Catatan',
    cancelText: 'Batal'
  });
  if (confirmed) {
    customerNotes = customerNotes.filter(n => n.id !== id);
    saveCustomerNotes();
    renderCustomerNotesList();
    if (window.AppTelemetry) {
      window.AppTelemetry.track('tool_cnotes_deleted');
    }
    if (typeof showToast === 'function') showToast('Catatan dihapus.', 'success');
  }
}

// ── WHATSAPP DIRECT LINKER ───────────────────────────────────────────────────

function cleanIndonesianPhone(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.substring(3);
  } else if (cleaned.startsWith('62')) {
    // already 62
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

function formatIndonesianPhoneDisplay(cleanPhone) {
  if (!cleanPhone || cleanPhone.length < 8) return '+62 -';
  let num = cleanPhone.startsWith('62') ? cleanPhone.substring(2) : cleanPhone;
  if (num.length <= 3) return `+62 ${num}`;
  if (num.length <= 7) return `+62 ${num.substring(0, 3)}-${num.substring(3)}`;
  return `+62 ${num.substring(0, 3)}-${num.substring(3, 7)}-${num.substring(7)}`;
}

function updateWaLinkPreview() {
  const phoneInput = document.getElementById('wa-input-phone');
  const msgInput = document.getElementById('wa-input-msg');
  const formattedEl = document.getElementById('wa-formatted-preview');
  const linkEl = document.getElementById('wa-link-preview');
  if (!phoneInput || !formattedEl || !linkEl) return;

  const clean = cleanIndonesianPhone(phoneInput.value);
  const msg = encodeURIComponent((msgInput?.value || '').trim());
  const formatted = formatIndonesianPhoneDisplay(clean);

  formattedEl.textContent = formatted;
  if (clean && clean.length >= 9) {
    const waUrl = `https://wa.me/${clean}${msg ? `?text=${msg}` : ''}`;
    linkEl.textContent = waUrl;
    linkEl.dataset.url = waUrl;
  } else {
    linkEl.textContent = 'https://wa.me/... (masukkan nomor HP yang valid)';
    linkEl.dataset.url = '';
  }
}

function openWaLinkerModal(initialPhone = '') {
  const overlay = document.getElementById('modal-walinker-overlay');
  const phoneInput = document.getElementById('wa-input-phone');
  if (!overlay) return;

  if (phoneInput) {
    let defaultPhone = initialPhone;
    if (!defaultPhone && typeof currentClipboardValue === 'string') {
      const trimmed = currentClipboardValue.trim();
      if (/^(\+?62|0)?8[\d\s-]{6,16}$/.test(trimmed)) {
        defaultPhone = trimmed;
      }
    }
    phoneInput.value = defaultPhone || '';
  }
  updateWaLinkPreview();
  overlay.classList.add('active');
  setTimeout(() => phoneInput?.focus(), 120);

  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_walinker_opened');
  }

  if (typeof notifyAction === 'function') {
    notifyAction('use_walinker');
  } else if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('use_walinker');
  }
}

function closeWaLinkerModal() {
  document.getElementById('modal-walinker-overlay')?.classList.remove('active');
}

function findWhatsAppStore() {
  if (typeof stores === 'undefined' || !Array.isArray(stores)) return null;
  return stores.find(s => {
    const url = (s.url || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const mp = (s.marketplace || '').toLowerCase();
    return url.includes('web.whatsapp.com') || mp === 'whatsapp' || name.includes('whatsapp') || name.includes('wa web');
  }) || null;
}

function findWhatsAppTabInCurrentStore() {
  if (typeof activeStoreId === 'undefined' || !activeStoreId || typeof storeTabs === 'undefined' || !storeTabs[activeStoreId]) return null;
  return storeTabs[activeStoreId].find(t => {
    const url = (t.url || '').toLowerCase();
    const title = (t.title || '').toLowerCase();
    return url.includes('web.whatsapp.com') || title.includes('whatsapp');
  }) || null;
}

// ── SMART CASE CONVERTER ─────────────────────────────────────────────────────

function toTitleCase(str) {
  return str.replace(/[A-Za-zÀ-ÿ0-9]+/g, (txt) => {
    if (/^(II|III|IV|VI|VII|VIII|IX|XI|XII|COD|JNE|JNT|SICEPAT|WA|CS|RT|RW|NO|KAV|BLOK|GANG|GG|JL|JLN)$/i.test(txt)) {
      return txt.toUpperCase();
    }
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

function toSentenceCase(str) {
  return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
}

function cleanExtraSpaces(str) {
  return str
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''))
    .join('\n')
    .trim();
}

function transformCase(mode) {
  const input = document.getElementById('caseconv-input');
  if (!input) return;
  const val = input.value;
  if (!val.trim()) {
    if (typeof showToast === 'function') showToast('Ketik atau tempel teks terlebih dahulu!', 'error');
    return;
  }

  let result = val;
  if (mode === 'title') {
    result = toTitleCase(val);
  } else if (mode === 'upper') {
    result = val.toUpperCase();
  } else if (mode === 'lower') {
    result = val.toLowerCase();
  } else if (mode === 'sentence') {
    result = toSentenceCase(val);
  } else if (mode === 'clean-spaces') {
    result = cleanExtraSpaces(val);
  }

  input.value = result;
  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_caseconv_transformed');
  }
  if (typeof showToast === 'function') showToast('Teks berhasil diformat ✓', 'success');
}

function openCaseConvModal(initialText = '') {
  const overlay = document.getElementById('modal-caseconv-overlay');
  const input = document.getElementById('caseconv-input');
  if (!overlay) return;

  if (input && initialText) {
    input.value = initialText;
  } else if (input && !input.value && typeof currentClipboardValue === 'string') {
    input.value = currentClipboardValue;
  }
  overlay.classList.add('active');
  setTimeout(() => input?.focus(), 120);

  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_caseconv_opened');
  }
}

function closeCaseConvModal() {
  document.getElementById('modal-caseconv-overlay')?.classList.remove('active');
}

// ── CS TOOLKIT FAB & SPEED DIAL MENU ─────────────────────────────────────────
function toggleToolkitMenu(forceState) {
  const container = document.getElementById('cs-toolkit-fab-container');
  const fab = document.getElementById('btn-cs-toolkit-fab');
  if (!container) return;

  const isOpen = forceState !== undefined ? forceState : !container.classList.contains('open');
  container.classList.toggle('open', isOpen);
  fab?.classList.toggle('active', isOpen);

  // Jika menu dibuka, kecilkan checklist onboarding agar tidak bertumpukan secara visual
  if (isOpen && window.OnboardingManager && typeof window.OnboardingManager.getState === 'function') {
    const state = window.OnboardingManager.getState();
    if (!state.checklistCollapsed && !state.checklistDismissed) {
      window.OnboardingManager.toggleChecklistCollapse();
    }
  }

  if (isOpen && window.AppTelemetry) {
    window.AppTelemetry.track('tools_menu_opened');
  }
}

function closeToolkitMenu() {
  toggleToolkitMenu(false);
}

// ── DRAGGABLE FLOATING DOCK & POSITION PERSISTENCE ───────────────────────────
let isDockDragging = false;
let dockDragStartX = 0;
let dockDragStartY = 0;
let dockInitialLeft = 0;
let dockInitialTop = 0;
let dockMoved = false;

function getFloatingDockEl() {
  return document.getElementById('floating-bottom-dock') || (typeof document.querySelector === 'function' ? document.querySelector('.floating-bottom-dock') : null);
}

function initDraggableDock() {
  const dock = getFloatingDockEl();
  const fab = document.getElementById('btn-cs-toolkit-fab');
  if (!dock || !fab) return;

  // 1. Muat posisi tersimpan dari localStorage jika pernah digeser
  const savedPos = localStorage.getItem('cs_dock_position');
  if (savedPos) {
    try {
      const pos = JSON.parse(savedPos);
      if (typeof pos.left === 'number' && typeof pos.top === 'number') {
        const maxLeft = Math.max(10, (window.innerWidth || 1200) - (dock.offsetWidth || 120) - 10);
        const maxTop = Math.max(10, (window.innerHeight || 800) - (dock.offsetHeight || 50) - 10);
        const clampLeft = Math.min(Math.max(10, pos.left), maxLeft);
        const clampTop = Math.min(Math.max(10, pos.top), maxTop);

        dock.style.left = `${clampLeft}px`;
        dock.style.top = `${clampTop}px`;
        dock.style.right = 'auto';
        dock.style.bottom = 'auto';
        updateDockSmartClasses(dock, clampLeft, clampTop);
      }
    } catch (e) {
      console.warn('Failed restoring dock position:', e);
    }
  }

  // 2. Mouse Drag Handlers pada tombol Tools CS
  fab.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Hanya tombol kiri mouse

    isDockDragging = true;
    dockMoved = false;
    dockDragStartX = e.clientX;
    dockDragStartY = e.clientY;

    const rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : { left: 0, top: 0 };
    dockInitialLeft = rect.left;
    dockInitialTop = rect.top;

    document.addEventListener('mousemove', onDockMouseMove);
    document.addEventListener('mouseup', onDockMouseUp);
  });

  // 3. Double-Click untuk reset kembali ke posisi default (kanan bawah)
  fab.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetDockPosition();
  });
}

function onDockMouseMove(e) {
  if (!isDockDragging) return;
  const dock = getFloatingDockEl();
  if (!dock) return;

  const dx = e.clientX - dockDragStartX;
  const dy = e.clientY - dockDragStartY;

  // Ambang batas 4px untuk membedakan antara klik biasa dan drag
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    dockMoved = true;
    dock.classList.add('is-dragging');
  }

  if (dockMoved) {
    let newLeft = dockInitialLeft + dx;
    let newTop = dockInitialTop + dy;

    // Batasi dalam batas layar
    const maxLeft = Math.max(10, (window.innerWidth || 1200) - (dock.offsetWidth || 120) - 10);
    const maxTop = Math.max(10, (window.innerHeight || 800) - (dock.offsetHeight || 50) - 10);

    newLeft = Math.min(Math.max(10, newLeft), maxLeft);
    newTop = Math.min(Math.max(10, newTop), maxTop);

    dock.style.left = `${newLeft}px`;
    dock.style.top = `${newTop}px`;
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';

    updateDockSmartClasses(dock, newLeft, newTop);
  }
}

function onDockMouseUp() {
  if (!isDockDragging) return;
  isDockDragging = false;

  const dock = getFloatingDockEl();
  document.removeEventListener('mousemove', onDockMouseMove);
  document.removeEventListener('mouseup', onDockMouseUp);

  if (dock) {
    dock.classList.remove('is-dragging');
    if (dockMoved) {
      const rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : { left: 0, top: 0 };
      localStorage.setItem('cs_dock_position', JSON.stringify({ left: rect.left, top: rect.top }));
    }
  }
}

function updateDockSmartClasses(dock, left, top) {
  const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
  const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1200;
  const isTopHalf = top < (vh * 0.45);
  const isLeftHalf = left < (vw * 0.5);

  dock.classList.toggle('dock-top', isTopHalf);
  dock.classList.toggle('dock-left', isLeftHalf);
}

function resetDockPosition() {
  const dock = getFloatingDockEl();
  if (!dock) return;
  localStorage.removeItem('cs_dock_position');
  dock.style.left = '';
  dock.style.top = '';
  dock.style.right = '';
  dock.style.bottom = '';
  dock.classList.remove('dock-top', 'dock-left');
  if (typeof showToast === 'function') {
    showToast('Posisi Tools CS dikembalikan ke kanan bawah', '');
  }
}
window.resetDockPosition = resetDockPosition;

function bindToolkitFab() {
  const fab = document.getElementById('btn-cs-toolkit-fab');
  const backdrop = document.getElementById('cs-toolkit-backdrop');

  if (fab) {
    fab.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Jangan buka menu popover jika user baru saja melakukan drag
      if (dockMoved) return;
      toggleToolkitMenu();
    };
  }

  if (backdrop) {
    backdrop.onclick = () => {
      closeToolkitMenu();
    };
  }

  initDraggableDock();
}

// ── BIND TOOLS EVENTS ────────────────────────────────────────────────────────
let isToolsEventsBound = false;

function bindToolsEvents() {
  loadCustomerNotes();

  // Selalu pastikan FAB terpasang handler tunggal
  bindToolkitFab();

  if (isToolsEventsBound) return;
  isToolsEventsBound = true;

  // 1. Customer Notes modal trigger & events
  document.getElementById('btn-cnotes-tool')?.addEventListener('click', openCustomerNotesModal);
  document.getElementById('btn-cnotes-close')?.addEventListener('click', closeCustomerNotesModal);
  document.getElementById('cnotes-search-input')?.addEventListener('input', typeof debounce === 'function' ? debounce(renderCustomerNotesList, 180) : renderCustomerNotesList);
  document.getElementById('btn-cnotes-add')?.addEventListener('click', openAddNoteFormModal);
  document.getElementById('btn-cnote-form-cancel')?.addEventListener('click', closeAddNoteFormModal);
  document.getElementById('modal-cnote-form-close')?.addEventListener('click', closeAddNoteFormModal);
  document.getElementById('btn-cnote-form-save')?.addEventListener('click', saveCustomerNoteFromForm);

  // Filter Tabs Customer Notes
  document.querySelectorAll('.btn-cnotes-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-cnotes-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeNotesTagFilter = btn.dataset.tag || 'all';
      renderCustomerNotesList();
    });
  });

  // 2. WhatsApp Linker events
  document.getElementById('btn-walinker-close')?.addEventListener('click', closeWaLinkerModal);
  document.getElementById('wa-input-phone')?.addEventListener('input', updateWaLinkPreview);
  document.getElementById('wa-input-msg')?.addEventListener('input', updateWaLinkPreview);
  document.getElementById('btn-wa-copy-link')?.addEventListener('click', () => {
    const linkEl = document.getElementById('wa-link-preview');
    const url = linkEl?.dataset.url || linkEl?.textContent;
    if (!url || !url.startsWith('https://wa.me/')) {
      if (typeof showToast === 'function') showToast('Nomor WhatsApp belum valid!', 'error');
      return;
    }
    if (typeof copyResolvedText === 'function') copyResolvedText(url);
    else navigator.clipboard.writeText(url);
    if (window.AppTelemetry) {
      window.AppTelemetry.track('tool_walinker_link_copied');
    }
    if (typeof showToast === 'function') showToast('Tautan WhatsApp disalin ke clipboard ✓', 'success');
  });

  document.getElementById('btn-wa-open-tab')?.addEventListener('click', async () => {
    const linkEl = document.getElementById('wa-link-preview');
    const url = linkEl?.dataset.url || linkEl?.textContent;
    if (!url || !url.startsWith('https://wa.me/')) {
      if (typeof showToast === 'function') showToast('Nomor WhatsApp belum valid!', 'error');
      return;
    }

    const phoneInput = document.getElementById('wa-input-phone');
    const msgInput = document.getElementById('wa-input-msg');
    const cleanPhone = cleanIndonesianPhone(phoneInput?.value || '');
    const cleanMsg = encodeURIComponent((msgInput?.value || '').trim());
    const waWebChatUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}${cleanMsg ? `&text=${cleanMsg}` : ''}`;

    const waStore = findWhatsAppStore();
    const waTabInCurrent = findWhatsAppTabInCurrentStore();

    // Skenario A: Toko aktif saat ini adalah WhatsApp atau memiliki tab WhatsApp Web
    const curStore = (typeof stores !== 'undefined' && Array.isArray(stores)) ? stores.find(s => s.id === activeStoreId) : null;
    const isCurrentStoreWa = curStore && ((curStore.url || '').toLowerCase().includes('web.whatsapp.com') || (curStore.marketplace || '').toLowerCase() === 'whatsapp' || (curStore.name || '').toLowerCase().includes('whatsapp'));

    if (isCurrentStoreWa || waTabInCurrent) {
      closeWaLinkerModal();
      if (window.AppTelemetry) {
        window.AppTelemetry.track('tool_walinker_web_opened');
      }
      if (typeof addTab === 'function' && activeStoreId) {
        addTab(activeStoreId, waWebChatUrl, 'Chat WhatsApp');
      }
      if (typeof showToast === 'function') showToast('Membuka obrolan di WhatsApp Web...', 'success');
      return;
    }

    // Skenario B: Pengguna memiliki Toko WhatsApp di toko lain di dashboard
    if (waStore) {
      closeWaLinkerModal();
      if (window.AppTelemetry) {
        window.AppTelemetry.track('tool_walinker_web_opened');
      }
      if (typeof activateStore === 'function') {
        activateStore(waStore.id);
        setTimeout(() => {
          if (typeof addTab === 'function') {
            addTab(waStore.id, waWebChatUrl, 'Chat WhatsApp');
          }
        }, 150);
      }
      if (typeof showToast === 'function') showToast(`Beralih ke "${waStore.name}" & membuka chat WhatsApp...`, 'success');
      return;
    }

    // Skenario C (FALLBACK): Belum memiliki toko ataupun tab web.whatsapp.com
    const confirmed = await showConfirmDialog({
      title: 'Toko WhatsApp Web Belum Tersedia',
      message: `Fitur WhatsApp Direct membutuhkan toko atau tab <strong>WhatsApp Web (web.whatsapp.com)</strong> agar sesi login Anda tersimpan aman dan tidak ter-logout.<br><br>Buat <strong>Toko WhatsApp Web</strong> sekarang untuk melanjutkan?`,
      type: 'warning',
      icon: '💬',
      confirmText: '+ Buat Toko WhatsApp',
      cancelText: 'Batal',
      confirmBtnClass: 'btn-primary'
    });

    if (confirmed) {
      closeWaLinkerModal();
      if (typeof openAddModal === 'function') {
        openAddModal();
        setTimeout(() => {
          const customOpt = document.querySelector('.mp-option[data-value="custom"]');
          customOpt?.click();
          const nameInput = document.getElementById('store-name');
          const initialsInput = document.getElementById('store-initials');
          const urlInput = document.getElementById('store-url');
          const colorInput = document.getElementById('store-color');
          if (nameInput) nameInput.value = 'WhatsApp Web';
          if (initialsInput) initialsInput.value = 'WA';
          if (urlInput) urlInput.value = 'https://web.whatsapp.com/';
          if (colorInput) colorInput.value = '#25d366';
          if (typeof updateUrlPreview === 'function') updateUrlPreview();
        }, 120);
      }
    }
  });

  // 3. Smart Case Converter events
  document.getElementById('btn-caseconv-close')?.addEventListener('click', closeCaseConvModal);
  document.querySelectorAll('.btn-case-action').forEach(btn => {
    btn.addEventListener('click', () => {
      transformCase(btn.dataset.mode);
    });
  });
  document.getElementById('btn-caseconv-copy')?.addEventListener('click', () => {
    const input = document.getElementById('caseconv-input');
    const val = input?.value || '';
    if (!val.trim()) {
      if (typeof showToast === 'function') showToast('Teks masih kosong!', 'error');
      return;
    }
    if (typeof copyResolvedText === 'function') copyResolvedText(val);
    else navigator.clipboard.writeText(val);
    if (window.AppTelemetry) {
      window.AppTelemetry.track('tool_caseconv_copied');
    }
    if (typeof showToast === 'function') showToast('Hasil teks disalin ke clipboard ✓', 'success');
  });
  document.getElementById('btn-caseconv-insert-chat')?.addEventListener('click', () => {
    const input = document.getElementById('caseconv-input');
    const val = input?.value || '';
    if (!val.trim()) {
      if (typeof showToast === 'function') showToast('Teks masih kosong!', 'error');
      return;
    }
    if (window.AppTelemetry) {
      window.AppTelemetry.track('tool_caseconv_inserted_chat');
    }
    insertTextToActiveChat(val);
    closeCaseConvModal();
  });

  // 4. Modal Backdrop (outside click) Dismissal
  document.getElementById('modal-cnotes-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-cnotes-overlay') closeCustomerNotesModal();
  });
  document.getElementById('modal-cnote-form-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-cnote-form-overlay') closeAddNoteFormModal();
  });
  document.getElementById('modal-walinker-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-walinker-overlay') closeWaLinkerModal();
  });
  document.getElementById('modal-caseconv-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-caseconv-overlay') closeCaseConvModal();
  });

  // 5. Find in Page (Ctrl+F) Event Bindings
  initFindInPageEvents();
}

// ── FIND IN PAGE (Ctrl+F) FLOATING TOOLBAR CONTROLLER ────────────────────────
let findInPageActiveQuery = '';
let currentFindRequestId = null;
let currentMatchOrdinal = 0;
let totalMatchesCount = 0;
let findDebounceTimer = null;

function formatMatchCounter(activeMatch, totalMatches, query = '') {
  if (!query || query.trim() === '') {
    return { text: '0/0', className: '', isNoMatches: false, isHasMatches: false };
  }
  const active = typeof activeMatch === 'number' ? activeMatch : 0;
  const total = typeof totalMatches === 'number' ? totalMatches : 0;

  if (total === 0) {
    return { text: '0/0', className: 'no-matches', isNoMatches: true, isHasMatches: false };
  }
  return { text: `${active}/${total}`, className: 'has-matches', isNoMatches: false, isHasMatches: true };
}

function updateFindCounter(activeMatch, totalMatches) {
  const countEl = document.getElementById('find-match-count');
  const inputEl = document.getElementById('find-in-page-input');
  const wrapEl = inputEl?.closest('.find-input-wrap');
  if (!countEl) return;

  const query = inputEl ? inputEl.value : findInPageActiveQuery;
  const { text, className, isNoMatches, isHasMatches } = formatMatchCounter(activeMatch, totalMatches, query);

  countEl.textContent = text;
  countEl.className = 'find-match-count ' + className;

  if (wrapEl) {
    wrapEl.classList.toggle('has-no-matches', isNoMatches);
    wrapEl.classList.toggle('has-matches', isHasMatches);
  }
}

function openFindInPage(initialText = '') {
  const bar = document.getElementById('find-in-page-bar');
  const input = document.getElementById('find-in-page-input');
  if (!bar || !input) return;

  const wv = (typeof getActiveWebview === 'function' ? getActiveWebview() : null) ||
             document.querySelector('webview.store-webview.visible') ||
             document.querySelector('webview.visible');
  if (!wv) return; // Hanya buka toolbar jika ada webview aktif

  bar.style.display = 'flex';

  if (typeof initialText === 'string' && initialText.trim().length > 0) {
    input.value = initialText.trim();
  } else {
    input.value = '';
  }

  input.focus();
  input.select();

  if (input.value.trim().length > 0) {
    clearTimeout(findDebounceTimer);
    findInActiveWebview(true, true);
  } else {
    updateFindCounter(0, 0);
  }
}

function closeFindInPage(options = {}) {
  const bar = document.getElementById('find-in-page-bar');
  if (bar) bar.style.display = 'none';

  const input = document.getElementById('find-in-page-input');
  if (input) input.value = '';

  const wv = typeof getActiveWebview === 'function' ? getActiveWebview() : document.querySelector('webview.store-webview.visible');
  let wcId = typeof getActiveWcId === 'function' ? getActiveWcId() : null;

  if (!wcId && wv && typeof wv.getWebContentsId === 'function') {
    try { wcId = wv.getWebContentsId(); } catch (e) { }
  }

  // Bersihkan via IPC WebContents (prioritas — lebih reliable)
  if (window.electronAPI?.stopFindInPage && wcId) {
    try {
      window.electronAPI.stopFindInPage({ wcId, action: 'clearSelection' });
    } catch (e) { }
  } else if (wv && typeof wv.stopFindInPage === 'function') {
    try {
      wv.stopFindInPage('clearSelection');
    } catch (e) { }
  }

  // Bersihkan juga seluruh webview di background jika ada sesi pencarian yang tertinggal
  if (typeof webviewMap === 'object' && webviewMap !== null) {
    Object.values(webviewMap).forEach(entry => {
      if (entry?.wcId && window.electronAPI?.stopFindInPage) {
        try { window.electronAPI.stopFindInPage({ wcId: entry.wcId, action: 'clearSelection' }); } catch (e) { }
      } else if (entry?.webview && typeof entry.webview.stopFindInPage === 'function') {
        try { entry.webview.stopFindInPage('clearSelection'); } catch (e) { }
      }
    });
  }

  findInPageActiveQuery = '';
  currentFindRequestId = null;
  currentMatchOrdinal = 0;
  totalMatchesCount = 0;
  updateFindCounter(0, 0);

  if (!options.skipFocus && wv && typeof wv.focus === 'function') {
    try { wv.focus(); } catch (e) { }
  }
}

async function findInActiveWebview(forward = true, findNext = true) {
  const input = document.getElementById('find-in-page-input');
  const rawQuery = input ? input.value : '';
  const query = rawQuery.trim();
  const wv = typeof getActiveWebview === 'function' ? getActiveWebview() : document.querySelector('webview.store-webview.visible');
  let wcId = typeof getActiveWcId === 'function' ? getActiveWcId() : null;

  if (!wcId && wv && typeof wv.getWebContentsId === 'function') {
    try { wcId = wv.getWebContentsId(); } catch (e) { }
  }

  if (!wv && !wcId) {
    return;
  }

  // Jika input kosong, bersihkan seleksi di layar
  if (!query) {
    if (window.electronAPI?.stopFindInPage && wcId) {
      try { await window.electronAPI.stopFindInPage({ wcId, action: 'clearSelection' }); } catch (e) { }
    } else if (wv && typeof wv.stopFindInPage === 'function') {
      try { wv.stopFindInPage('clearSelection'); } catch (e) { }
    }
    findInPageActiveQuery = '';
    currentFindRequestId = null;
    currentMatchOrdinal = 0;
    totalMatchesCount = 0;
    updateFindCounter(0, 0);
    return;
  }

  if (query !== findInPageActiveQuery) {
    currentMatchOrdinal = 0;
    totalMatchesCount = 0;
  }

  findInPageActiveQuery = query;

  // Single-path execution: IPC (langsung ke WebContents di main process)
  if (window.electronAPI?.findInPage && wcId) {
    try {
      const reqId = await window.electronAPI.findInPage({
        wcId,
        text: query,
        forward: Boolean(forward),
        findNext: Boolean(findNext),
        matchCase: false
      });
      if (typeof reqId === 'number') {
        currentFindRequestId = reqId;
      }
    } catch (err) {
      console.warn('[FindInPage:IPC] Error finding text:', err);
    }
  } else if (wv && typeof wv.findInPage === 'function') {
    try {
      const reqId = wv.findInPage(query, {
        forward: Boolean(forward),
        findNext: Boolean(findNext),
        matchCase: false
      });
      if (typeof reqId === 'number') {
        currentFindRequestId = reqId;
      }
    } catch (e) {
      console.error('[FindInPage:DOM] Error wv.findInPage:', e);
    }
  }
}

function handleFoundInPageResult(targetIdentifier, result) {
  if (!result) return;

  if (typeof result.matches === 'number') {
    totalMatchesCount = result.matches;
  }

  if (typeof result.activeMatchOrdinal === 'number') {
    if (result.activeMatchOrdinal > 0) {
      currentMatchOrdinal = result.activeMatchOrdinal;
    } else if (totalMatchesCount > 0 && currentMatchOrdinal === 0) {
      currentMatchOrdinal = 1;
    } else if (totalMatchesCount === 0) {
      currentMatchOrdinal = 0;
    }
  }

  updateFindCounter(currentMatchOrdinal, totalMatchesCount);
}

function initFindInPageEvents() {
  const input = document.getElementById('find-in-page-input');
  const btnPrev = document.getElementById('btn-find-prev');
  const btnNext = document.getElementById('btn-find-next');
  const btnClose = document.getElementById('btn-find-close');

  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(findDebounceTimer);
      findDebounceTimer = setTimeout(() => {
        findInActiveWebview(true, true);
      }, 150);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'F3') {
        e.preventDefault();
        clearTimeout(findDebounceTimer);
        if (e.shiftKey) {
          findInActiveWebview(false, true);
        } else {
          findInActiveWebview(true, true);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        clearTimeout(findDebounceTimer);
        findInActiveWebview(true, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        clearTimeout(findDebounceTimer);
        findInActiveWebview(false, true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeFindInPage();
      }
    });
  }

  btnPrev?.addEventListener('click', () => {
    clearTimeout(findDebounceTimer);
    findInActiveWebview(false, true);
  });

  btnNext?.addEventListener('click', () => {
    clearTimeout(findDebounceTimer);
    findInActiveWebview(true, true);
  });

  btnClose?.addEventListener('click', () => {
    closeFindInPage();
  });
}

// Expose globals
window.insertTextToActiveChat     = insertTextToActiveChat;
window.openCustomerNotesModal     = openCustomerNotesModal;
window.closeCustomerNotesModal    = closeCustomerNotesModal;
window.openEditNoteModal          = openEditNoteModal;
window.deleteCustomerNote         = deleteCustomerNote;
window.openWaLinkerModal          = openWaLinkerModal;
window.closeWaLinkerModal         = closeWaLinkerModal;
window.openCaseConvModal          = openCaseConvModal;
window.closeCaseConvModal         = closeCaseConvModal;
window.transformCase              = transformCase;
window.toggleToolkitMenu          = toggleToolkitMenu;
window.closeToolkitMenu           = closeToolkitMenu;
window.bindToolsEvents            = bindToolsEvents;
window.openFindInPage             = openFindInPage;
window.closeFindInPage            = closeFindInPage;
window.findInActiveWebview        = findInActiveWebview;
window.handleFoundInPageResult    = handleFoundInPageResult;
window.formatMatchCounter         = formatMatchCounter;
window.updateFindCounter          = updateFindCounter;
