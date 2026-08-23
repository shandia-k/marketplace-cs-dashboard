/**
 * telegram-mini-app/js/tma-app.js
 * Comprehensive Client Controller for Developer Telegram Mini App
 * Telegram WebApp SDK, Ticket Management, Visual Chat, Telemetry Analytics & Charts
 */

// ── State Variables ──────────────────────────────────────────────────────────
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyZ9Vh5b71X50NbOURsA2snf4afRUetg1f0oUdQWk33Z6M6BUmk8TwBkr-JisXszxSr/exec";

let appState = {
  gasUrl: localStorage.getItem('tma_gas_url') || DEFAULT_GAS_URL,
  activeTab: 'tickets',
  currentStatusFilter: 'all',
  searchQuery: '',
  tickets: [],
  selectedTicket: null,
  telemetryData: {
    sessions: [],
    kpi: { totalSessions: 0, activeUsers: 0, totalStores: 0, avgDuration: 0 },
    features: {},
    marketplaces: {},
    versions: {}
  },
  charts: {
    features: null,
    marketplaces: null,
    versions: null
  },
  isLoading: false
};

// ── DOM Element Shortcuts ───────────────────────────────────────────────────
const el = {
  // Tabs & Views
  navTabs: document.querySelectorAll('.nav-tab'),
  viewTickets: document.getElementById('viewTickets'),
  viewDetail: document.getElementById('viewDetail'),
  viewAnalytics: document.getElementById('viewAnalytics'),
  viewSettings: document.getElementById('viewSettings'),
  syncBanner: document.getElementById('syncBanner'),
  syncText: document.getElementById('syncText'),
  tabBadgeTickets: document.getElementById('tabBadgeTickets'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  
  // Ticket List View
  ticketSearchInput: document.getElementById('ticketSearchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  filterPills: document.querySelectorAll('.filter-pill'),
  ticketsListContainer: document.getElementById('ticketsListContainer'),
  emptyTicketsState: document.getElementById('emptyTicketsState'),
  countAll: document.getElementById('countAll'),
  countOpen: document.getElementById('countOpen'),
  countInProgress: document.getElementById('countInProgress'),
  countNeedInfo: document.getElementById('countNeedInfo'),
  countResolved: document.getElementById('countResolved'),
  countClosed: document.getElementById('countClosed'),

  // Detail & Chat View
  btnBackToTickets: document.getElementById('btnBackToTickets'),
  detailStatusSelect: document.getElementById('detailStatusSelect'),
  detailTicketId: document.getElementById('detailTicketId'),
  detailTicketType: document.getElementById('detailTicketType'),
  detailTicketTime: document.getElementById('detailTicketTime'),
  detailTicketTitle: document.getElementById('detailTicketTitle'),
  detailReporterName: document.getElementById('detailReporterName'),
  detailReporterMarketplaces: document.getElementById('detailReporterMarketplaces'),
  detailSystemInfo: document.getElementById('detailSystemInfo'),
  chatMessagesContainer: document.getElementById('chatMessagesContainer'),
  replyTextInput: document.getElementById('replyTextInput'),
  btnSendReply: document.getElementById('btnSendReply'),
  quickReplyChips: document.querySelectorAll('.qr-chip'),

  // Telemetry View
  kpiTotalSessions: document.getElementById('kpiTotalSessions'),
  kpiActiveUsers: document.getElementById('kpiActiveUsers'),
  kpiTotalStores: document.getElementById('kpiTotalStores'),
  kpiAvgDuration: document.getElementById('kpiAvgDuration'),
  chartFeaturesCanvas: document.getElementById('chartFeatures'),
  chartMarketplacesCanvas: document.getElementById('chartMarketplaces'),
  chartVersionsCanvas: document.getElementById('chartVersions'),
  telemetryTableBody: document.getElementById('telemetryTableBody'),
  sessionLogCount: document.getElementById('sessionLogCount'),

  // Settings View
  inputGasUrl: document.getElementById('inputGasUrl'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnTestConnection: document.getElementById('btnTestConnection'),
  connectionStatusBox: document.getElementById('connectionStatusBox'),
  infoTgMode: document.getElementById('infoTgMode'),
  infoTgUser: document.getElementById('infoTgUser'),
  infoTgPlatform: document.getElementById('infoTgPlatform'),
  infoTgVersion: document.getElementById('infoTgVersion'),

  // Lightbox & Toast
  lightboxModal: document.getElementById('lightboxModal'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxCaption: document.getElementById('lightboxCaption'),
  btnCloseLightbox: document.getElementById('btnCloseLightbox'),
  toastContainer: document.getElementById('toastContainer')
};

// ── Telegram WebApp SDK Initialization ──────────────────────────────────────
function initTelegramWebApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    console.log('[TMA] Running in standalone web browser mode.');
    if (el.infoTgMode) el.infoTgMode.textContent = 'Standalone Browser Mode';
    return;
  }

  tg.ready();
  tg.expand();
  if (typeof tg.enableClosingConfirmation === 'function') {
    tg.enableClosingConfirmation();
  }

  // Populate User Info
  const user = tg.initDataUnsafe?.user;
  if (user && el.infoTgUser) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    el.infoTgUser.textContent = `${fullName} (@${user.username || 'user'})`;
  }
  if (el.infoTgPlatform) el.infoTgPlatform.textContent = tg.platform || 'Unknown';
  if (el.infoTgVersion) el.infoTgVersion.textContent = tg.version || '8.0';

  // Native BackButton handler
  if (tg.BackButton) {
    tg.BackButton.onClick(() => {
      if (appState.activeTab === 'detail') {
        switchTab('tickets');
      }
    });
  }
}

function triggerHaptic(type = 'light') {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    if (type === 'success' || type === 'error' || type === 'warning') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  }
}

// ── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  if (!el.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ── Navigation & Tab Switching ──────────────────────────────────────────────
function switchTab(targetTab) {
  triggerHaptic('light');
  appState.activeTab = targetTab;

  const views = {
    tickets: el.viewTickets,
    detail: el.viewDetail,
    analytics: el.viewAnalytics,
    settings: el.viewSettings
  };

  Object.entries(views).forEach(([tabName, viewEl]) => {
    if (!viewEl) return;
    if (tabName === targetTab) {
      viewEl.classList.remove('hidden');
      viewEl.classList.add('active');
    } else {
      viewEl.classList.add('hidden');
      viewEl.classList.remove('active');
    }
  });

  el.navTabs.forEach(tabBtn => {
    const tabName = tabBtn.getAttribute('data-tab');
    if (tabName === targetTab || (targetTab === 'detail' && tabName === 'tickets')) {
      tabBtn.classList.add('active');
    } else {
      tabBtn.classList.remove('active');
    }
  });

  const tg = window.Telegram?.WebApp;
  if (tg?.BackButton) {
    if (targetTab === 'detail') {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }
  }

  if (targetTab === 'analytics') {
    renderAnalyticsCharts();
  }
}

// ── API & Cloud Synchronization ─────────────────────────────────────────────
function showSyncSpinner(text = 'Menyinkronkan...') {
  if (el.syncBanner) {
    el.syncBanner.classList.remove('hidden');
    if (el.syncText) el.syncText.textContent = text;
  }
}

function hideSyncSpinner() {
  if (el.syncBanner) {
    el.syncBanner.classList.add('hidden');
  }
}

async function fetchFromBackend(payload) {
  if (!appState.gasUrl) {
    throw new Error('URL Google Apps Script belum dikonfigurasi.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  const response = await fetch(appState.gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Mode text/plain mencegah CORS preflight di GAS
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function loadAllData(silent = false) {
  if (!silent) showSyncSpinner('Memuat data tiket & telemetri...');
  appState.isLoading = true;

  try {
    // 1. Ambil Tiket Dev
    const ticketRes = await fetchFromBackend({
      action: 'SYNC_TICKETS',
      isSuperAdmin: true,
      username: 'developer'
    });

    if (ticketRes && Array.isArray(ticketRes.tickets)) {
      appState.tickets = ticketRes.tickets;
    }

    // 2. Ambil Telemetri & Analitik
    const telemetryRes = await fetchFromBackend({
      action: 'GET_TELEMETRY_ANALYTICS'
    });

    if (telemetryRes && telemetryRes.success) {
      processTelemetryData(telemetryRes);
    }

    renderTicketList();
    updateUnreadBadge();
    if (!silent) showToast('Data berhasil diperbarui!', 'success');
  } catch (err) {
    console.warn('[TMA Fetch Error]', err);
    if (!silent) showToast(`Gagal sinkron: ${err.message}`, 'error');
    
    // Gunakan Mock Data jika database cloud kosong / belum siap
    if (appState.tickets.length === 0) {
      loadFallbackMockData();
    }
  } finally {
    hideSyncSpinner();
    appState.isLoading = false;
  }
}

// ── Fallback Demo/Mock Data untuk Preview Offline ───────────────────────────
function loadFallbackMockData() {
  console.log('[TMA] Loading demo mock data for preview.');
  appState.tickets = [
    {
      id: "TKT-2608-8F2A",
      type: "bug",
      title: "Tombol Kirim Pesan Shopee Terpotong di Bagian Bawah",
      status: "open",
      priority: "high",
      reporter: { username: "cs_ani", displayName: "Ani Rahmawati", role: "Customer Service" },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      storeCount: 4,
      marketplaces: "shopee (3), tokopedia (1)",
      systemInfo: "OS: Windows 11 Pro 64-bit\nElectron: 30.0.0 | App: v1.0.17\nFree RAM: 8.24 GB / 16.00 GB",
      messages: [
        {
          id: "msg_demo_1",
          sender: { username: "cs_ani", displayName: "Ani Rahmawati", role: "user" },
          content: "Halo tim developer, saat buka chat toko Shopee Fashion, tombol kirim pesannya terpotong ke bawah layar jika resolusi laptop 1366x768.",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isDevReply: false,
          images: []
        }
      ]
    },
    {
      id: "TKT-2608-9C4B",
      type: "saran",
      title: "Usulan Shortcut Keyboard untuk Navigasi Antar Tab Toko",
      status: "in_progress",
      priority: "normal",
      reporter: { username: "cs_budi", displayName: "Budi Santoso", role: "Customer Service" },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 14400000).toISOString(),
      storeCount: 6,
      marketplaces: "tokopedia (4), lazada (2)",
      systemInfo: "OS: Windows 10 Home 64-bit\nElectron: 30.0.0 | App: v1.0.17\nFree RAM: 4.10 GB / 8.00 GB",
      messages: [
        {
          id: "msg_demo_2",
          sender: { username: "cs_budi", displayName: "Budi Santoso", role: "user" },
          content: "Apakah bisa ditambahkan shortcut keyboard Ctrl+Tab untuk pindah tab toko secara cepat seperti browser?",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isDevReply: false,
          images: []
        },
        {
          id: "msg_demo_3",
          sender: { username: "developer", displayName: "Tim Developer", role: "developer" },
          content: "Halo Budi, usulan yang bagus! Fitur shortcut Ctrl+Tab dan Ctrl+1..9 sedang kami implementasikan untuk update v1.0.18.",
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          isDevReply: true,
          images: []
        }
      ]
    }
  ];

  // Mock Telemetri
  processTelemetryData({
    sessions: [
      { timestamp: "2026-08-24 01:45:10", version: "1.0.17", duration: 120, storeCount: 5, marketplaces: "shopee (3), tokopedia (2)", events: { quick_reply_used: 42, scratchpad_opened: 15, search_used: 8 } },
      { timestamp: "2026-08-24 00:15:30", version: "1.0.17", duration: 85, storeCount: 4, marketplaces: "shopee (2), lazada (2)", events: { quick_reply_used: 28, ocr_scan_performed: 6, tools_dock_opened: 12 } },
      { timestamp: "2026-08-23 22:50:00", version: "1.0.14", duration: 45, storeCount: 2, marketplaces: "tokopedia (2)", events: { quick_reply_used: 10, search_used: 3 } }
    ],
    kpi: { totalSessions: 48, activeUsers: 6, totalStores: 26, avgDuration: 74 },
    features: { "Quick Reply": 240, "Scratchpad Catatan": 115, "Pencarian Dedicated": 88, "Tools CS Dock": 64, "OCR Tesseract": 32 },
    marketplaces: { "Shopee": 14, "Tokopedia": 8, "Lazada": 3, "TikTok Shop": 1 },
    versions: { "v1.0.17": 38, "v1.0.14": 10 }
  });

  renderTicketList();
}

// ── Rendering Daftar Tiket ──────────────────────────────────────────────────
function renderTicketList() {
  if (!el.ticketsListContainer) return;

  const query = (appState.searchQuery || '').toLowerCase().trim();
  const filter = appState.currentStatusFilter;

  // Hitung counter filter
  let countAll = 0, countOpen = 0, countProg = 0, countInfo = 0, countRes = 0, countClosed = 0;
  
  appState.tickets.forEach(t => {
    countAll++;
    const s = String(t.status || 'open').toLowerCase();
    if (s === 'open') countOpen++;
    else if (s === 'in_progress') countProg++;
    else if (s === 'need_info') countInfo++;
    else if (s === 'resolved') countRes++;
    else if (s === 'closed') countClosed++;
  });

  if (el.countAll) el.countAll.textContent = countAll;
  if (el.countOpen) el.countOpen.textContent = countOpen;
  if (el.countInProgress) el.countInProgress.textContent = countProg;
  if (el.countNeedInfo) el.countNeedInfo.textContent = countInfo;
  if (el.countResolved) el.countResolved.textContent = countRes;
  if (el.countClosed) el.countClosed.textContent = countClosed;

  // Filter tiket aktif
  const filtered = appState.tickets.filter(t => {
    const s = String(t.status || 'open').toLowerCase();
    if (filter !== 'all' && s !== filter) return false;

    if (query) {
      const matchId = String(t.id || '').toLowerCase().includes(query);
      const matchTitle = String(t.title || '').toLowerCase().includes(query);
      const matchUser = String(t.reporter?.displayName || t.reporter?.username || '').toLowerCase().includes(query);
      const matchMsg = (t.messages || []).some(m => String(m.content || '').toLowerCase().includes(query));
      if (!matchId && !matchTitle && !matchUser && !matchMsg) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    el.ticketsListContainer.innerHTML = '';
    if (el.emptyTicketsState) el.emptyTicketsState.classList.remove('hidden');
    return;
  }

  if (el.emptyTicketsState) el.emptyTicketsState.classList.add('hidden');

  const statusLabels = {
    open: '🟡 Menunggu',
    in_progress: '🔵 Dikerjakan',
    need_info: '🟣 Butuh Info',
    resolved: '🟢 Selesai',
    closed: '⚫ Ditutup'
  };

  const typeIcons = {
    bug: '🐛 BUG',
    saran: '💡 SARAN',
    pertanyaan: '❓ TANYA'
  };

  el.ticketsListContainer.innerHTML = filtered.map(t => {
    const st = String(t.status || 'open').toLowerCase();
    const tp = String(t.type || 'bug').toLowerCase();
    const lastMsg = (t.messages && t.messages.length > 0) ? t.messages[t.messages.length - 1] : null;
    const snippet = lastMsg ? (lastMsg.content || 'Lampiran gambar') : (t.title || '');
    const dateFormatted = formatTimeAgo(t.updatedAt || t.createdAt);
    const hasImages = (t.messages || []).some(m => Array.isArray(m.images) && m.images.length > 0);

    return `
      <div class="ticket-card" data-ticket-id="${escapeHtml(t.id)}">
        <div class="ticket-card-header">
          <span class="ticket-id-tag">#${escapeHtml(t.id)}</span>
          <span class="ticket-status-tag status-${st}">${statusLabels[st] || st}</span>
        </div>
        <div class="ticket-card-title">${escapeHtml(t.title || 'Laporan Baru')}</div>
        <div class="ticket-card-snippet">${escapeHtml(snippet)}</div>
        <div class="ticket-card-footer">
          <div class="reporter-meta">
            <span>👤 ${escapeHtml(t.reporter?.displayName || t.reporter?.username || 'CS')}</span>
          </div>
          <div class="ticket-badges-meta">
            ${hasImages ? '<span class="img-badge">📷 Foto</span>' : ''}
            <span>${dateFormatted}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event listener klik kartu tiket
  el.ticketsListContainer.querySelectorAll('.ticket-card').forEach(card => {
    card.addEventListener('click', () => {
      const ticketId = card.getAttribute('data-ticket-id');
      openTicketDetail(ticketId);
    });
  });
}

// ── Detail Tiket & Visual Thread Chat ───────────────────────────────────────
function openTicketDetail(ticketId) {
  triggerHaptic('light');
  const ticket = appState.tickets.find(t => t.id === ticketId);
  if (!ticket) return;

  appState.selectedTicket = ticket;

  // Header Details
  if (el.detailTicketId) el.detailTicketId.textContent = `#${ticket.id}`;
  if (el.detailTicketType) {
    const tp = String(ticket.type || 'bug').toUpperCase();
    el.detailTicketType.textContent = tp === 'BUG' ? '🐛 BUG' : (tp === 'SARAN' ? '💡 SARAN' : '❓ PERTANYAAN');
  }
  if (el.detailTicketTime) el.detailTicketTime.textContent = formatTimeAgo(ticket.updatedAt || ticket.createdAt);
  if (el.detailTicketTitle) el.detailTicketTitle.textContent = ticket.title || 'Laporan Tanpa Judul';

  const repName = ticket.reporter?.displayName || ticket.reporter?.username || 'CS';
  const repRole = ticket.reporter?.role || 'Customer Service';
  if (el.detailReporterName) el.detailReporterName.textContent = `${repName} (${repRole})`;
  
  const mps = ticket.marketplaces || '-';
  const storesCnt = ticket.storeCount || 0;
  if (el.detailReporterMarketplaces) el.detailReporterMarketplaces.textContent = `Marketplace: ${mps} (${storesCnt} Toko Aktif)`;

  if (el.detailSystemInfo) {
    const sys = typeof ticket.systemInfo === 'object' ? JSON.stringify(ticket.systemInfo, null, 2) : String(ticket.systemInfo || '-');
    el.detailSystemInfo.innerHTML = `<pre class="diag-pre">${escapeHtml(sys)}</pre>`;
  }

  if (el.detailStatusSelect) {
    el.detailStatusSelect.value = String(ticket.status || 'open').toLowerCase();
  }

  renderChatMessages(ticket);
  switchTab('detail');
}

function renderChatMessages(ticket) {
  if (!el.chatMessagesContainer) return;

  const messages = ticket.messages || [];
  if (messages.length === 0) {
    el.chatMessagesContainer.innerHTML = '<div class="empty-state"><p class="empty-subtitle">Belum ada percakapan pada tiket ini.</p></div>';
    return;
  }

  el.chatMessagesContainer.innerHTML = messages.map(msg => {
    const isDev = msg.isDevReply || msg.sender?.role === 'developer' || msg.sender?.role === 'superadmin';
    const isSystem = msg.sender?.role === 'system' || msg.sender?.username === 'system';

    if (isSystem) {
      return `
        <div class="chat-bubble-row system-event">
          <div class="chat-bubble">⚙️ ${escapeHtml(msg.content)}</div>
        </div>
      `;
    }

    const rowClass = isDev ? 'dev-user' : 'cs-user';
    const senderName = isDev ? '👨‍💻 Tim Developer' : `👤 ${escapeHtml(msg.sender?.displayName || msg.sender?.username || 'CS')}`;
    const timeFormatted = formatTimeClock(msg.timestamp);

    let imagesHtml = '';
    if (Array.isArray(msg.images) && msg.images.length > 0) {
      imagesHtml = `
        <div class="chat-images-grid">
          ${msg.images.map((img, idx) => {
            const imgSrc = img.base64 || '';
            const caption = escapeHtml(img.name || `Screenshot [Gambar ${idx + 1}]`);
            return `<img class="chat-thumbnail-img" src="${imgSrc}" alt="${caption}" onclick="openLightbox('${imgSrc}', '${caption}')">`;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="chat-bubble-row ${rowClass}">
        <div class="chat-sender-name">${senderName}</div>
        <div class="chat-bubble">
          <div class="chat-text">${escapeHtml(msg.content || '')}</div>
          ${imagesHtml}
          <div class="chat-time">${timeFormatted}</div>
        </div>
      </div>
    `;
  }).join('');

  // Scroll otomatis ke bawah
  setTimeout(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, 100);
}

// ── Mengirim Balasan Developer ──────────────────────────────────────────────
async function sendDeveloperReply() {
  const ticket = appState.selectedTicket;
  if (!ticket) return;

  const content = el.replyTextInput?.value?.trim();
  if (!content) {
    showToast('Tuliskan teks balasan terlebih dahulu', 'warning');
    return;
  }

  triggerHaptic('medium');
  const nowIso = new Date().toISOString();

  // Optimistic UI Update
  const newMsg = {
    id: `msg_dev_${Date.now()}`,
    ticketId: ticket.id,
    timestamp: nowIso,
    sender: {
      username: 'developer',
      displayName: 'Tim Developer',
      role: 'developer'
    },
    content: content,
    isDevReply: true,
    images: []
  };

  if (!Array.isArray(ticket.messages)) ticket.messages = [];
  ticket.messages.push(newMsg);
  ticket.updatedAt = nowIso;

  if (el.replyTextInput) el.replyTextInput.value = '';
  renderChatMessages(ticket);

  showToast('Mengirim balasan ke CS...', 'info');

  try {
    const res = await fetchFromBackend({
      action: 'ADD_REPLY',
      ticketId: ticket.id,
      message: newMsg,
      reporter: ticket.reporter
    });

    if (res && res.success) {
      triggerHaptic('success');
      showToast('✅ Balasan berhasil terkirim ke CS!', 'success');
    } else {
      showToast('Peringatan: Gagal sync cloud, tersimpan lokal', 'warning');
    }
  } catch (err) {
    console.error('Failed sending reply to GAS:', err);
    showToast('Gagal mengirim balasan ke server cloud', 'error');
  }
}

// ── Mengubah Status Tiket ───────────────────────────────────────────────────
async function updateTicketStatusFromSelect(newStatus) {
  const ticket = appState.selectedTicket;
  if (!ticket || !newStatus) return;

  triggerHaptic('light');
  ticket.status = newStatus;
  ticket.updatedAt = new Date().toISOString();

  renderTicketList();
  showToast(`Status diubah ke: ${newStatus.toUpperCase()}`, 'info');

  try {
    await fetchFromBackend({
      action: 'UPDATE_STATUS',
      ticketId: ticket.id,
      status: newStatus,
      updatedBy: 'Developer (via Mini App)'
    });
    triggerHaptic('success');
  } catch (err) {
    console.error('Failed updating ticket status:', err);
  }
}

// ── Telemetry & Analytics Processor ─────────────────────────────────────────
function processTelemetryData(res) {
  const sessions = Array.isArray(res.sessions) ? res.sessions : [];
  const kpi = res.kpi || { totalSessions: sessions.length, activeUsers: 0, totalStores: 0, avgDuration: 0 };
  const features = res.features || {};
  const marketplaces = res.marketplaces || {};
  const versions = res.versions || {};

  appState.telemetryData = { sessions, kpi, features, marketplaces, versions };

  // Render KPI
  if (el.kpiTotalSessions) el.kpiTotalSessions.textContent = kpi.totalSessions || sessions.length;
  if (el.kpiActiveUsers) el.kpiActiveUsers.textContent = kpi.activeUsers || '-';
  if (el.kpiTotalStores) el.kpiTotalStores.textContent = kpi.totalStores || '-';
  if (el.kpiAvgDuration) el.kpiAvgDuration.textContent = `${kpi.avgDuration || 0}m`;

  // Render Table Logs
  if (el.sessionLogCount) el.sessionLogCount.textContent = sessions.length;
  if (el.telemetryTableBody) {
    if (sessions.length === 0) {
      el.telemetryTableBody.innerHTML = '<tr><td colspan="6" class="table-empty-cell">Belum ada riwayat sesi telemetri tercatat.</td></tr>';
    } else {
      el.telemetryTableBody.innerHTML = sessions.slice(0, 50).map(s => {
        const eventsSummary = s.events ? Object.entries(s.events).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
        return `
          <tr>
            <td>${escapeHtml(s.timestamp || '-')}</td>
            <td><code>${escapeHtml(s.version || '1.0.0')}</code></td>
            <td><strong>${s.duration || 0} mnt</strong></td>
            <td>${s.storeCount || 0} Toko</td>
            <td>${escapeHtml(s.marketplaces || '-')}</td>
            <td><small>${escapeHtml(eventsSummary)}</small></td>
          </tr>
        `;
      }).join('');
    }
  }
}

function renderAnalyticsCharts() {
  if (typeof Chart === 'undefined') return;

  const data = appState.telemetryData;
  const isDark = !document.body.classList.contains('light-theme');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // 1. Feature Usage Chart (Bar Chart)
  if (el.chartFeaturesCanvas) {
    if (appState.charts.features) appState.charts.features.destroy();

    const featLabels = Object.keys(data.features || {});
    const featValues = Object.values(data.features || {});

    appState.charts.features = new Chart(el.chartFeaturesCanvas, {
      type: 'bar',
      data: {
        labels: featLabels.length ? featLabels : ['Quick Reply', 'Scratchpad', 'Search', 'Tools CS'],
        datasets: [{
          label: 'Total Penggunaan (Kali)',
          data: featValues.length ? featValues : [0, 0, 0, 0],
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } }
        }
      }
    });
  }

  // 2. Marketplace Distribution Chart (Doughnut)
  if (el.chartMarketplacesCanvas) {
    if (appState.charts.marketplaces) appState.charts.marketplaces.destroy();

    const mpLabels = Object.keys(data.marketplaces || {});
    const mpValues = Object.values(data.marketplaces || {});

    appState.charts.marketplaces = new Chart(el.chartMarketplacesCanvas, {
      type: 'doughnut',
      data: {
        labels: mpLabels.length ? mpLabels : ['Shopee', 'Tokopedia', 'Lazada'],
        datasets: [{
          data: mpValues.length ? mpValues : [60, 30, 10],
          backgroundColor: ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  }

  // 3. Versions Adoption Chart (Doughnut)
  if (el.chartVersionsCanvas) {
    if (appState.charts.versions) appState.charts.versions.destroy();

    const verLabels = Object.keys(data.versions || {});
    const verValues = Object.values(data.versions || {});

    appState.charts.versions = new Chart(el.chartVersionsCanvas, {
      type: 'doughnut',
      data: {
        labels: verLabels.length ? verLabels : ['v1.0.17'],
        datasets: [{
          data: verValues.length ? verValues : [100],
          backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ec4899'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  }
}

// ── Lightbox Image Modal ────────────────────────────────────────────────────
window.openLightbox = function(imgSrc, caption = '') {
  triggerHaptic('light');
  if (!el.lightboxModal || !el.lightboxImg) return;
  el.lightboxImg.src = imgSrc;
  if (el.lightboxCaption) el.lightboxCaption.textContent = caption;
  el.lightboxModal.classList.remove('hidden');
};

function closeLightbox() {
  if (!el.lightboxModal) return;
  el.lightboxModal.classList.add('hidden');
  if (el.lightboxImg) el.lightboxImg.src = '';
}

// ── Helper Utilities ────────────────────────────────────────────────────────
function updateUnreadBadge() {
  const openCount = appState.tickets.filter(t => t.status === 'open').length;
  if (el.tabBadgeTickets) {
    if (openCount > 0) {
      el.tabBadgeTickets.textContent = openCount;
      el.tabBadgeTickets.classList.remove('hidden');
    } else {
      el.tabBadgeTickets.classList.add('hidden');
    }
  }
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'Baru saja';
  const past = new Date(isoString).getTime();
  const diffSec = Math.floor((Date.now() - past) / 1000);

  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;
  return `${Math.floor(diffSec / 86400)}h lalu`;
}

function formatTimeClock(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event Listeners Setup ───────────────────────────────────────────────────
function setupEventListeners() {
  // Navigation Tabs
  el.navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Refresh Button
  if (el.btnRefresh) {
    el.btnRefresh.addEventListener('click', () => {
      triggerHaptic('medium');
      loadAllData(false);
    });
  }

  // Theme Toggle Button
  if (el.btnThemeToggle) {
    el.btnThemeToggle.addEventListener('click', () => {
      triggerHaptic('light');
      document.body.classList.toggle('light-theme');
      if (appState.activeTab === 'analytics') {
        renderAnalyticsCharts();
      }
    });
  }

  // Ticket Search
  if (el.ticketSearchInput) {
    el.ticketSearchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      if (el.btnClearSearch) {
        if (appState.searchQuery.length > 0) el.btnClearSearch.classList.remove('hidden');
        else el.btnClearSearch.classList.add('hidden');
      }
      renderTicketList();
    });
  }

  if (el.btnClearSearch) {
    el.btnClearSearch.addEventListener('click', () => {
      if (el.ticketSearchInput) el.ticketSearchInput.value = '';
      appState.searchQuery = '';
      el.btnClearSearch.classList.add('hidden');
      renderTicketList();
    });
  }

  // Filter Pills
  el.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      triggerHaptic('light');
      el.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      appState.currentStatusFilter = pill.getAttribute('data-status') || 'all';
      renderTicketList();
    });
  });

  // Back to tickets list
  if (el.btnBackToTickets) {
    el.btnBackToTickets.addEventListener('click', () => {
      switchTab('tickets');
    });
  }

  // Quick reply chips
  el.quickReplyChips.forEach(chip => {
    chip.addEventListener('click', () => {
      triggerHaptic('light');
      const text = chip.getAttribute('data-text');
      if (el.replyTextInput && text) {
        el.replyTextInput.value = text;
        el.replyTextInput.focus();
      }
    });
  });

  // Send developer reply
  if (el.btnSendReply) {
    el.btnSendReply.addEventListener('click', sendDeveloperReply);
  }

  if (el.replyTextInput) {
    el.replyTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDeveloperReply();
      }
    });
  }

  // Detail status dropdown change
  if (el.detailStatusSelect) {
    el.detailStatusSelect.addEventListener('change', (e) => {
      updateTicketStatusFromSelect(e.target.value);
    });
  }

  // Lightbox Modal closing
  if (el.btnCloseLightbox) el.btnCloseLightbox.addEventListener('click', closeLightbox);
  if (el.lightboxModal) {
    el.lightboxModal.addEventListener('click', (e) => {
      if (e.target === el.lightboxModal || e.target.classList.contains('lightbox-backdrop')) {
        closeLightbox();
      }
    });
  }

  // Settings Save & Test
  if (el.inputGasUrl) {
    el.inputGasUrl.value = appState.gasUrl;
  }

  if (el.btnSaveSettings) {
    el.btnSaveSettings.addEventListener('click', () => {
      const url = el.inputGasUrl?.value?.trim();
      if (!url) {
        showToast('URL tidak boleh kosong', 'warning');
        return;
      }
      appState.gasUrl = url;
      localStorage.setItem('tma_gas_url', url);
      triggerHaptic('success');
      showToast('Konfigurasi URL tersimpan!', 'success');
      loadAllData(false);
    });
  }

  if (el.btnTestConnection) {
    el.btnTestConnection.addEventListener('click', async () => {
      triggerHaptic('light');
      if (el.connectionStatusBox) {
        el.connectionStatusBox.className = 'status-box info';
        el.connectionStatusBox.textContent = 'Menguji koneksi ke Google Apps Script...';
        el.connectionStatusBox.classList.remove('hidden');
      }

      try {
        const res = await fetchFromBackend({ action: 'SYNC_TICKETS', username: 'test' });
        if (res && res.success) {
          el.connectionStatusBox.className = 'status-box success';
          el.connectionStatusBox.textContent = `✅ Koneksi Berhasil! Database terhubung (${res.tickets?.length || 0} tiket ditemukan).`;
        } else {
          el.connectionStatusBox.className = 'status-box error';
          el.connectionStatusBox.textContent = '❌ Respons server tidak sesuai format.';
        }
      } catch (err) {
        el.connectionStatusBox.className = 'status-box error';
        el.connectionStatusBox.textContent = `❌ Koneksi Gagal: ${err.message}`;
      }
    });
  }
}

// ── Application Bootstrap ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTelegramWebApp();
  setupEventListeners();
  loadAllData(false);
});
