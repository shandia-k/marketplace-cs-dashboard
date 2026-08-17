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

  if (isOpen && window.AppTelemetry) {
    window.AppTelemetry.track('tools_menu_opened');
  }
}

function closeToolkitMenu() {
  toggleToolkitMenu(false);
}

function bindToolkitFab() {
  const fab = document.getElementById('btn-cs-toolkit-fab');
  const backdrop = document.getElementById('cs-toolkit-backdrop');

  fab?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleToolkitMenu();
  });

  backdrop?.addEventListener('click', () => {
    closeToolkitMenu();
  });

  // Tool item triggers
  document.getElementById('tool-item-quickreply')?.addEventListener('click', () => {
    closeToolkitMenu();
    if (typeof openQuickReplyDrawer === 'function') openQuickReplyDrawer();
  });

  document.getElementById('tool-item-scratchpad')?.addEventListener('click', () => {
    closeToolkitMenu();
    if (typeof toggleScratchpad === 'function') toggleScratchpad();
  });

  document.getElementById('tool-item-cnotes')?.addEventListener('click', () => {
    closeToolkitMenu();
    openCustomerNotesModal();
  });

  document.getElementById('tool-item-walinker')?.addEventListener('click', () => {
    closeToolkitMenu();
    openWaLinkerModal();
  });

  document.getElementById('tool-item-caseconv')?.addEventListener('click', () => {
    closeToolkitMenu();
    openCaseConvModal();
  });

  document.getElementById('tool-item-feedback')?.addEventListener('click', () => {
    closeToolkitMenu();
    if (typeof openFeedbackModal === 'function') openFeedbackModal();
  });

  document.getElementById('tool-item-onboarding')?.addEventListener('click', () => {
    closeToolkitMenu();
    if (typeof window.startOnboardingTour === 'function') window.startOnboardingTour();
  });
}

// ── BIND TOOLS EVENTS ────────────────────────────────────────────────────────
function bindToolsEvents() {
  // Bind Floating CS Toolkit FAB
  bindToolkitFab();

  // 1. Customer Notes modal trigger & events
  document.getElementById('btn-cnotes-tool')?.addEventListener('click', openCustomerNotesModal);
  document.getElementById('btn-cnotes-close')?.addEventListener('click', closeCustomerNotesModal);
  document.getElementById('cnotes-search-input')?.addEventListener('input', debounce(renderCustomerNotesList, 250));
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
      if (typeof addTab === 'function' && activeStoreId) {
        addTab(activeStoreId, waWebChatUrl, 'Chat WhatsApp');
      }
      if (typeof showToast === 'function') showToast('Membuka obrolan di WhatsApp Web...', 'success');
      return;
    }

    // Skenario B: Pengguna memiliki Toko WhatsApp di toko lain di dashboard
    if (waStore) {
      closeWaLinkerModal();
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
    if (typeof showToast === 'function') showToast('Hasil teks disalin ke clipboard ✓', 'success');
  });
  document.getElementById('btn-caseconv-insert-chat')?.addEventListener('click', () => {
    const input = document.getElementById('caseconv-input');
    const val = input?.value || '';
    if (!val.trim()) {
      if (typeof showToast === 'function') showToast('Teks masih kosong!', 'error');
      return;
    }
    insertTextToActiveChat(val);
    closeCaseConvModal();
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
