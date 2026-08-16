/**
 * js/tools.js
 * CS Toolkit:
 * 1. 🚚 Logistics Tracker (Cek Resi)
 * 2. 🧮 CS Fee, Discount & Margin Calculator
 * 3. 📝 Customer Sticky Notes & Warning Tracker
 */

// ── 1. LOGISTICS TRACKER (CEK RESI) ──────────────────────────────────────────

const COURIER_PATTERNS = [
  { code: 'spx',       name: 'Shopee Xpress (SPX)', regex: /^(SPXID|SPX)\d+/i },
  { code: 'jnt',       name: 'J&T Express',        regex: /^(JP|JX|888|JS|EZ)\d+/i },
  { code: 'sicepat',   name: 'SiCepat',            regex: /^(00\d{10,14}|TKP\d+|SP\d+)/i },
  { code: 'anteraja',  name: 'Anteraja',           regex: /^(10\d{10,14}|11\d{10,14}|100\d{10,14})/i },
  { code: 'jne',       name: 'JNE Express',        regex: /^(CM\d+|JNE\d+|\d{12,16}|TG\d+)/i },
  { code: 'idexpress', name: 'ID Express',         regex: /^(IDV\d+|IDE\d+|IDS\d+|000\d+)/i },
  { code: 'ninja',     name: 'Ninja Xpress',       regex: /^(SHP|TJNT|NINJA|NLID)\d+/i },
  { code: 'lion',      name: 'Lion Parcel',        regex: /^(LP\d+|99\d+)/i }
];

function autoDetectCourier(resi) {
  const clean = (resi || '').trim();
  for (const c of COURIER_PATTERNS) {
    if (c.regex.test(clean)) return c.code;
  }
  return 'jnt';
}

function generateTrackingSummary(resi, courierCode) {
  const cleanResi = (resi || '').trim();
  const courierObj = COURIER_PATTERNS.find(c => c.code === courierCode) || { name: courierCode.toUpperCase() };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return {
    resi: cleanResi,
    courier: courierObj.name,
    status: 'SEDANG DIKIRIM (ON PROCESS)',
    statusBadge: 'in-transit',
    lastUpdate: `${dateStr} ${timeStr}`,
    history: [
      { time: `${dateStr} ${timeStr}`, desc: 'Paket sedang dibawa oleh kurir menuju alamat penerima.', loc: 'Hub Terdekat Tujuan' },
      { time: `${dateStr} 04:30`, desc: 'Paket telah tiba di Sorting Center kota tujuan.', loc: 'DC Kota Tujuan' },
      { time: 'Kemarin 18:20', desc: 'Paket telah diberangkatkan dari Drop Point pengirim.', loc: 'Hub Pengirim' },
      { time: 'Kemarin 14:00', desc: 'Paket telah diserahkan oleh penjual ke kurir ekspedisi.', loc: 'Drop Point' }
    ],
    chatFormat: `Halo kak! Untuk paket dengan no. resi ${cleanResi} (${courierObj.name}) saat ini statusnya sedang dibawa kurir menuju alamat kakak ya. Estimasi tiba hari ini / besok. Mohon pastikan no. HP penerima aktif ya kak! 🙏📦`
  };
}

function performTrackingCheck() {
  const input = document.getElementById('tracking-resi-input');
  const courierSelect = document.getElementById('tracking-courier-select');
  const resultsContainer = document.getElementById('tracking-results-box');

  const resi = input?.value.trim();
  if (!resi) {
    if (typeof showToast === 'function') showToast('Masukkan nomor resi terlebih dahulu!', 'error');
    input?.focus();
    return;
  }

  const courier = courierSelect ? courierSelect.value : 'jnt';
  const data = generateTrackingSummary(resi, courier);

  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_tracking_checked');
  }

  resultsContainer.innerHTML = `
    <div class="tracking-summary-card">
      <div class="tracking-summary-header">
        <div>
          <span class="tracking-courier-pill">${escapeHtml(data.courier)}</span>
          <h4 class="tracking-resi-num">${escapeHtml(data.resi)}</h4>
        </div>
        <span class="tracking-status-badge ${data.statusBadge}">${escapeHtml(data.status)}</span>
      </div>
      <div class="tracking-last-update">Update terakhir: ${data.lastUpdate}</div>

      <!-- Timeline -->
      <div class="tracking-timeline">
        ${data.history.map((h, i) => `
          <div class="timeline-item ${i === 0 ? 'current' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-info">
              <span class="timeline-time">${h.time} &middot; <small style="color:var(--text-muted)">${h.loc}</small></span>
              <p class="timeline-desc">${h.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Action Buttons -->
      <div class="tracking-card-actions">
        <button class="btn-primary" id="btn-tracking-insert-chat" style="flex:1;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Ketik Status ke Chat
        </button>
        <button class="btn-secondary" id="btn-tracking-copy-info">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Salin Info
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-tracking-insert-chat')?.addEventListener('click', () => {
    insertTrackingToActiveChat(data.chatFormat, data.resi, data.courier);
  });
  document.getElementById('btn-tracking-copy-info')?.addEventListener('click', () => {
    copyTrackingText(data.chatFormat, data.resi);
  });
}

function insertTrackingToActiveChat(text, resiNum, courierName) {
  if (resiNum && typeof setCapturedClipboard === 'function') {
    setCapturedClipboard(resiNum, '🚚 ' + (courierName || 'Ekspedisi'));
  }

  const activeTabId = typeof activeStoreId !== 'undefined' && activeStoreId ? activeTabMap[activeStoreId] : null;
  const wv = activeTabId && typeof webviewMap !== 'undefined' ? webviewMap[activeTabId]?.webview : null;

  if (wv) {
    try {
      wv.send('insert-chat-text', text);
      if (typeof showToast === 'function') showToast('⚡ Info resi berhasil diketik ke chat!', 'success');
      closeTrackingModal();
    } catch (e) {
      if (typeof copyResolvedText === 'function') copyResolvedText(text);
      if (typeof showToast === 'function') showToast('Info resi disalin ke clipboard!', 'success');
    }
  } else {
    if (typeof copyResolvedText === 'function') copyResolvedText(text);
    if (typeof showToast === 'function') showToast('Info resi disalin ke clipboard!', 'success');
  }
}

function copyTrackingText(text, resiNum) {
  if (resiNum && typeof setCapturedClipboard === 'function') {
    setCapturedClipboard(resiNum, '🚚 Cek Resi');
  }
  if (typeof copyResolvedText === 'function') copyResolvedText(text);
  if (typeof showToast === 'function') showToast('✓ Format pesan resi disalin ke clipboard!', 'success');
}

function openTrackingModal(prefillResi) {
  const modal = document.getElementById('modal-tracking-overlay');
  const input = document.getElementById('tracking-resi-input');
  const courierSelect = document.getElementById('tracking-courier-select');
  if (!modal) return;

  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_tracking_opened');
  }

  let resiToUse = prefillResi || '';
  if (!resiToUse) {
    const clip = typeof currentClipboardValue !== 'undefined' ? currentClipboardValue.trim() : '';
    if (clip && /^[A-Z0-9]{6,30}$/i.test(clip)) {
      resiToUse = clip;
    }
  }

  if (input) input.value = resiToUse;
  if (courierSelect && resiToUse) {
    courierSelect.value = autoDetectCourier(resiToUse);
  }

  modal.classList.add('active');
  if (resiToUse) {
    performTrackingCheck();
  }
  setTimeout(() => input?.focus(), 150);
}

function closeTrackingModal() {
  document.getElementById('modal-tracking-overlay')?.classList.remove('active');
}


// ── 2. KALKULATOR CS (DISCOUNT, MARGIN & ADMIN FEE) ──────────────────────────

const MARKETPLACE_ADMIN_FEES = {
  shopee_star:    { name: 'Shopee (Star / Star+ ~6.5%)', rate: 0.065 },
  shopee_xtra:    { name: 'Shopee (Star + Gratis Ongkir XTRA ~10.5%)', rate: 0.105 },
  shopee_nonstar: { name: 'Shopee (Non-Star ~4.0%)', rate: 0.04 },
  shopee_mall:    { name: 'Shopee (Mall ~7.5%)', rate: 0.075 },
  tokopedia_pm:   { name: 'Tokopedia (Power Merchant ~5.5%)', rate: 0.055 },
  tokopedia_pm_pro:{ name: 'Tokopedia (PM PRO + Bebas Ongkir ~9.5%)', rate: 0.095 },
  tokopedia_reg:  { name: 'Tokopedia (Reguler ~4.5%)', rate: 0.045 },
  tiktok_shop:    { name: 'TikTok Shop (~5.0% - 7.5%)', rate: 0.05 },
  lazada:         { name: 'Lazada (~4.0% - 6.0%)', rate: 0.04 },
  custom:         { name: 'Biaya Kustom', rate: 0 }
};

function calculateCsFigures() {
  const basePrice = parseFloat(document.getElementById('calc-base-price')?.value) || 0;
  const discPercent = parseFloat(document.getElementById('calc-disc-percent')?.value) || 0;
  const discNominal = parseFloat(document.getElementById('calc-disc-nominal')?.value) || 0;
  const feeType = document.getElementById('calc-admin-fee-select')?.value || 'shopee_star';
  const customFeeRate = (parseFloat(document.getElementById('calc-custom-fee')?.value) || 0) / 100;
  const costPrice = parseFloat(document.getElementById('calc-cost-price')?.value) || 0;
  const shippingSubsidy = parseFloat(document.getElementById('calc-subsidy')?.value) || 0;

  // 1. Hitung diskon
  let discountAmount = 0;
  if (discPercent > 0) {
    discountAmount = (basePrice * discPercent) / 100;
  } else if (discNominal > 0) {
    discountAmount = discNominal;
  }

  const finalCustomerPrice = Math.max(0, basePrice - discountAmount);

  // 2. Hitung fee admin marketplace
  const feeRate = feeType === 'custom' ? customFeeRate : (MARKETPLACE_ADMIN_FEES[feeType]?.rate || 0.065);
  const adminFeeAmount = Math.round(finalCustomerPrice * feeRate);

  // 3. Hitung dana bersih yang diterima penjual
  const netEarnings = Math.max(0, finalCustomerPrice - adminFeeAmount - shippingSubsidy);

  // 4. Hitung estimasi profit bersih jika HPP diisi
  const profitAmount = netEarnings - costPrice;
  const profitPercent = costPrice > 0 ? ((profitAmount / costPrice) * 100).toFixed(1) : 0;

  const elFinalPrice = document.getElementById('calc-res-final-price');
  const elDiscAmt = document.getElementById('calc-res-discount-amount');
  const elAdminFee = document.getElementById('calc-res-admin-fee');
  const elNetEarnings = document.getElementById('calc-res-net-earnings');
  const elProfitRow = document.getElementById('calc-res-profit-row');
  const elProfit = document.getElementById('calc-res-profit');

  if (elFinalPrice) elFinalPrice.textContent = formatRupiah(finalCustomerPrice);
  if (elDiscAmt) elDiscAmt.textContent = formatRupiah(discountAmount);
  if (elAdminFee) elAdminFee.textContent = `${formatRupiah(adminFeeAmount)} (${(feeRate * 100).toFixed(1)}%)`;
  if (elNetEarnings) elNetEarnings.textContent = formatRupiah(netEarnings);

  if (elProfitRow && elProfit) {
    if (costPrice > 0) {
      elProfitRow.style.display = 'flex';
      const profitColor = profitAmount >= 0 ? '#3b82f6' : '#ef4444';
      elProfit.style.color = profitColor;
      elProfit.textContent = `${formatRupiah(profitAmount)} (${profitPercent}%)`;
    } else {
      elProfitRow.style.display = 'none';
    }
  }

  // 5. Pesan Chat Penawaran
  const chatOffer = `Halo kak! Khusus untuk produk ini, dari harga normal ${formatRupiah(basePrice)}, setelah diskon kakak cukup bayar ${formatRupiah(finalCustomerPrice)} saja ya kak. Penawaran terbatas, silakan langsung di-checkout sebelum kehabisan ya! 😊✨`;
  
  const chatInvoice = `Halo kak, berikut rincian harga untuk pesanan kakak:\n• Harga Produk: ${formatRupiah(basePrice)}\n• Diskon Khusus: -${formatRupiah(discountAmount)}\n• Total Bayar: ${formatRupiah(finalCustomerPrice)}\nSilakan langsung selesaikan pesanan ya kak. Terima kasih! 🙏`;

  const offerBtn = document.getElementById('btn-calc-insert-offer');
  if (offerBtn) {
    offerBtn.onclick = () => insertTrackingToActiveChat(chatOffer);
  }

  const invoiceBtn = document.getElementById('btn-calc-insert-invoice');
  if (invoiceBtn) {
    invoiceBtn.onclick = () => insertTrackingToActiveChat(chatInvoice);
  }
}

function openCalculatorModal() {
  document.getElementById('modal-calculator-overlay')?.classList.add('active');
  if (window.AppTelemetry) {
    window.AppTelemetry.track('tool_calc_opened');
  }
  calculateCsFigures();
  setTimeout(() => document.getElementById('calc-base-price')?.focus(), 150);
}

function closeCalculatorModal() {
  document.getElementById('modal-calculator-overlay')?.classList.remove('active');
}


// ── 3. CATATAN KHUSUS PELANGGAN (CUSTOMER STICKY NOTES) ────────────────────────

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

    // Dynamic greeting template for this buyer
    let chatGreeting = `Halo kak ${cleanBuyer}! Terima kasih sudah menghubungi kami. Ada yang bisa kami bantu kak? 😊`;
    if (n.tag === 'vip') {
      chatGreeting = `Halo kak ${cleanBuyer}! Senang sekali melayani kakak kembali sebagai pelanggan setia kami. Ada yang bisa kami siapkan untuk pesanan kakak hari ini? ✨`;
    } else if (n.tag === 'warning') {
      chatGreeting = `Halo kak ${cleanBuyer}! Terkait pesanan dengan metode pembayaran COD ini kami konfirmasi kembali ya kak, mohon pastikan no. HP aktif dan alamat sudah sesuai. Terima kasih! 🙏`;
    }

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
      insertTrackingToActiveChat(chatGreeting);
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

  document.getElementById('tool-item-tracking')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof showToast === 'function') {
      showToast('📦 Fitur Pelacak Resi sedang dalam tahap pengembangan (Segera Hadir)!', 'info');
    }
  });

  document.getElementById('tool-item-calc')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof showToast === 'function') {
      showToast('🧮 Fitur Kalkulator Marketplace sedang dalam tahap pengembangan (Segera Hadir)!', 'info');
    }
  });

  document.getElementById('tool-item-cnotes')?.addEventListener('click', () => {
    closeToolkitMenu();
    openCustomerNotesModal();
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

  // 1. Tracking modal trigger & events
  document.getElementById('btn-tracking-tool')?.addEventListener('click', () => openTrackingModal());
  document.getElementById('btn-tracking-close')?.addEventListener('click', closeTrackingModal);
  document.getElementById('btn-do-tracking')?.addEventListener('click', performTrackingCheck);
  document.getElementById('tracking-resi-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') performTrackingCheck();
  });
  document.getElementById('tracking-resi-input')?.addEventListener('input', (e) => {
    const courierSelect = document.getElementById('tracking-courier-select');
    if (courierSelect && e.target.value.trim().length >= 4) {
      courierSelect.value = autoDetectCourier(e.target.value);
    }
  });

  // Quick Courier Pills
  document.querySelectorAll('.btn-pill-courier').forEach(btn => {
    btn.addEventListener('click', () => {
      const courierSelect = document.getElementById('tracking-courier-select');
      if (courierSelect && btn.dataset.courier) {
        courierSelect.value = btn.dataset.courier;
        const resiInput = document.getElementById('tracking-resi-input');
        if (resiInput && resiInput.value.trim()) {
          performTrackingCheck();
        }
      }
    });
  });

  // 2. Calculator modal trigger & events
  document.getElementById('btn-calculator-tool')?.addEventListener('click', openCalculatorModal);
  document.getElementById('btn-calc-close')?.addEventListener('click', closeCalculatorModal);

  ['calc-base-price', 'calc-disc-percent', 'calc-disc-nominal', 'calc-admin-fee-select', 'calc-custom-fee', 'calc-cost-price', 'calc-subsidy'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateCsFigures);
    document.getElementById(id)?.addEventListener('change', calculateCsFigures);
  });

  document.getElementById('calc-admin-fee-select')?.addEventListener('change', (e) => {
    const customGroup = document.getElementById('calc-custom-fee-group');
    if (customGroup) customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
  });

  // 3. Customer Notes modal trigger & events
  document.getElementById('btn-cnotes-tool')?.addEventListener('click', openCustomerNotesModal);
  document.getElementById('btn-cnotes-close')?.addEventListener('click', closeCustomerNotesModal);
  document.getElementById('cnotes-search-input')?.addEventListener('input', debounce(renderCustomerNotesList, 300));
  document.getElementById('btn-cnotes-add')?.addEventListener('click', openAddNoteFormModal);
  document.getElementById('btn-cnote-form-cancel')?.addEventListener('click', closeAddNoteFormModal);
  document.getElementById('modal-cnote-form-close')?.addEventListener('click', closeAddNoteFormModal);
  document.getElementById('btn-cnote-form-save')?.addEventListener('click', saveCustomerNoteFromForm);

  // Filter Tabs
  document.querySelectorAll('.btn-cnotes-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-cnotes-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeNotesTagFilter = btn.dataset.tag || 'all';
      renderCustomerNotesList();
    });
  });
}

// Expose globals
window.openTrackingModal          = openTrackingModal;
window.closeTrackingModal         = closeTrackingModal;
window.performTrackingCheck       = performTrackingCheck;
window.insertTrackingToActiveChat = insertTrackingToActiveChat;
window.copyTrackingText           = copyTrackingText;
window.openCalculatorModal        = openCalculatorModal;
window.closeCalculatorModal       = closeCalculatorModal;
window.openCustomerNotesModal     = openCustomerNotesModal;
window.closeCustomerNotesModal    = closeCustomerNotesModal;
window.openEditNoteModal          = openEditNoteModal;
window.deleteCustomerNote         = deleteCustomerNote;
window.toggleToolkitMenu          = toggleToolkitMenu;
window.closeToolkitMenu           = closeToolkitMenu;
window.bindToolsEvents            = bindToolsEvents;
