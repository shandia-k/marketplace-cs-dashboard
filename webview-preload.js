/**
 * webview-preload.js
 * Script yang diinjeksi ke dalam setiap webview marketplace.
 * Fitur:
 * 1. Smart Inline Quick Reply Autocomplete (Ctrl+Space pada chatbox yang aktif)
 * 2. Smart Clipboard History Switcher (Multi-Customer Handle)
 * 3. Real-time Clipboard Auto-Capture (Copy & Cut listener)
 * 4. Sinkronisasi Tema Global (Dark / Light Mode dengan CSS Variables)
 * 5. Deteksi Pesan Belum Terbaca (Title & DOM Badge)
 * 6. Draft Detection (Mencegah Hard Hibernate saat mengetik)
 * 7. Navigasi & Zoom Shortcuts
 */
const { ipcRenderer } = require('electron');

// ── ANTI-AUTOMATION & BOT DETECTION MASKING ──────────────────────────────────
try {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });
} catch (e) {}

// ── STATE & TEMPLATES (Synced from host dashboard) ───────────────────────────
let smartTemplates = [];
let currentStoreName = '';
let currentCsName = '';
let currentClipboardValue = '';
let inlineClipboardHistory = [];
let currentTheme = 'dark';
let isInlinePopupOpen = false;
let isInlineHistoryOpen = false;
let activeTargetInput = null;
let inlineSelectedIndex = 0;
let inlineFilteredTemplates = [];
let inlineQuery = '';
let popupElement = null;

// Sinkronisasi data template, store, cs, clipboard, riwayat, & tema dari host dashboard
ipcRenderer.on('sync-smart-templates', (event, data) => {
  if (data) {
    if (Array.isArray(data.templates) && data.templates.length > 0) {
      smartTemplates = data.templates;
    }
    if (data.storeName) currentStoreName = data.storeName;
    if (data.csName) currentCsName = data.csName;
    if (typeof data.clipboard === 'string') {
      currentClipboardValue = data.clipboard;
    }
    if (Array.isArray(data.history)) {
      inlineClipboardHistory = data.history;
    }
    if (data.theme) {
      currentTheme = data.theme;
      if (popupElement) {
        popupElement.setAttribute('data-theme', currentTheme);
      }
    }
    if (isInlinePopupOpen) {
      renderInlineItems();
      updatePopupPosition();
    }
  }
});

// Minta data terkini dari host dashboard segera setelah webview terpasang
try {
  ipcRenderer.sendToHost('request-quickreply-data');
} catch (e) {}

window.addEventListener('DOMContentLoaded', () => {
  try {
    ipcRenderer.sendToHost('request-quickreply-data');
  } catch (e) {}
});

// ── REAL-TIME CLIPBOARD AUTO-CAPTURE (COPY & CUT) ─────────────────────────────
function captureClipboardFromDOM() {
  setTimeout(async () => {
    try {
      let text = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        text = (await navigator.clipboard.readText())?.trim();
      }
      if (!text) {
        text = window.getSelection().toString().trim();
      }
      if (text && text.length > 0) {
        currentClipboardValue = text;
        ipcRenderer.sendToHost('clipboard-copied', text);
        if (isInlinePopupOpen) {
          renderInlineItems();
        }
      }
    } catch (e) {}
  }, 40);
}

document.addEventListener('copy', captureClipboardFromDOM, true);
document.addEventListener('cut', captureClipboardFromDOM, true);

// ── CUSTOMER / BUYER NAME AUTO-DETECTOR ──────────────────────────────────────
function detectActiveCustomerName() {
  const selectors = [
    // WhatsApp Web
    '#main header span[dir="auto"]',
    'header span[data-testid="conversation-info-header-chat-title"]',
    'header [data-testid="chat-title"]',
    'header span[title]',
    // Tokopedia Seller
    '[data-testid="chat-header-name"]',
    '[data-testid="header-chat-name"]',
    '[data-testid*="chat-header"] [class*="name" i]',
    'h6[data-testid*="name" i]',
    '.css-header-name',
    // Shopee Seller Centre
    '.chat-header-title',
    '.chat-header .user-name',
    '.shopee-chat-header__name',
    '.conversation-header-name',
    '[class*="chat-header"] [class*="name" i]',
    '[class*="conversation-header"] [class*="title" i]',
    // TikTok Shop Seller Center
    '[class*="chat-header"] [class*="user-name" i]',
    '[class*="session-header"] [class*="title" i]',
    '.im-chat-header__title',
    // Lazada Seller Center
    '.im-header-title',
    '.chat-header-user',
    '.chat-user-name',
    // Active chat conversation item fallback
    '[class*="chat-item"][class*="active" i] [class*="name" i]',
    '[class*="conversation-item"][class*="selected" i] [class*="name" i]'
  ];

  for (const sel of selectors) {
    try {
      const list = document.querySelectorAll(sel);
      for (const el of list) {
        if (el.offsetParent !== null) {
          let text = (el.getAttribute('title') || el.innerText || el.textContent || '').trim();
          if (text && text.length > 0 && text.length < 50) {
            const lower = text.toLowerCase();
            if (lower.includes('search') || lower.includes('cari') || lower.includes('online') || lower.includes('ketik')) {
              continue;
            }
            // Bersihkan format nama: ambil baris pertama jika multi-baris
            text = text.split('\n')[0].replace(/[\r\t]+/g, ' ').trim();
            // Jika ada format "Budi (Buyer VIP)" atau "Andi - Jakarta", ambil nama utama jika terlalu panjang
            if (text.length > 25 && text.includes('(')) {
              text = text.split('(')[0].trim();
            }
            if (text) return text;
          }
        }
      }
    } catch (e) {}
  }
  return '';
}

// ── VARIABLE RESOLVER ────────────────────────────────────────────────────────
function getGreetingTime() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
}

function resolveVariables(rawText, overrideClipboard) {
  if (!rawText) return '';
  const clip = (overrideClipboard !== undefined ? overrideClipboard : currentClipboardValue).trim();
  const store = currentStoreName || 'Toko Kami';
  const waktu = getGreetingTime();
  const cs = currentCsName || 'CS';
  const customer = detectActiveCustomerName() || 'Kak';

  return rawText
    .replace(/\{(clipboard|order|resi)\}/gi, () => clip || '...')
    .replace(/\{toko\}/gi, () => store)
    .replace(/\{waktu\}/gi, () => waktu)
    .replace(/\{(cs|nama_cs|nama|cs_name|nama_pengguna|user)\}/gi, () => cs)
    .replace(/\{(pembeli|customer|buyer|nama_pembeli|nama_customer)\}/gi, () => customer);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 15) return 'Baru saja';
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return `${Math.floor(diffHour / 24)} hari lalu`;
}

function highlightVariablesHtml(rawText, overrideClipboard, query) {
  if (!rawText) return '';
  const clip = (overrideClipboard !== undefined ? overrideClipboard : currentClipboardValue).trim();
  const store = currentStoreName || 'Toko Kami';
  const waktu = getGreetingTime();
  const cs = currentCsName || 'CS';
  const customer = detectActiveCustomerName() || 'Kak';

  let escaped = escapeHtml(rawText);

  const clipPill = `<span class="cs-clip-pill">${escapeHtml(clip || '{clipboard}')}</span>`;
  const storePill = `<span class="cs-var-pill">${escapeHtml(store)}</span>`;
  const waktuPill = `<span class="cs-var-pill">${escapeHtml(waktu)}</span>`;
  const csPill = `<span class="cs-var-pill" style="color:#10b981;font-weight:600;">${escapeHtml(cs)}</span>`;
  const custPill = `<span class="cs-var-pill" style="color:#38bdf8;font-weight:600;">${escapeHtml(customer)}</span>`;

  escaped = escaped.replace(/\{(clipboard|order|resi)\}/gi, '___CS_CLIP_VAR___');
  escaped = escaped.replace(/\{toko\}/gi, '___CS_STORE_VAR___');
  escaped = escaped.replace(/\{waktu\}/gi, '___CS_WAKTU_VAR___');
  escaped = escaped.replace(/\{(cs|nama_cs|nama|cs_name|nama_pengguna|user)\}/gi, '___CS_NAME_VAR___');
  escaped = escaped.replace(/\{(pembeli|customer|buyer|nama_pembeli|nama_customer)\}/gi, '___CS_CUST_VAR___');

  if (query && query.trim()) {
    try {
      const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${cleanQ})`, 'gi');
      escaped = escaped.replace(regex, '<mark class="cs-query-highlight">$1</mark>');
    } catch (e) {}
  }

  escaped = escaped.replace(/___CS_CLIP_VAR___/g, clipPill);
  escaped = escaped.replace(/___CS_STORE_VAR___/g, storePill);
  escaped = escaped.replace(/___CS_WAKTU_VAR___/g, waktuPill);
  escaped = escaped.replace(/___CS_NAME_VAR___/g, csPill);
  escaped = escaped.replace(/___CS_CUST_VAR___/g, custPill);

  return escaped;
}

// ── TARGET INPUT DETECTION & INJECTION ────────────────────────────────────────
function isEditable(el) {
  if (!el || el === document.body) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT' && !['checkbox', 'radio', 'file', 'submit', 'button', 'color', 'hidden'].includes(el.type)) return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
  if (el.closest && el.closest('[contenteditable="true"]')) return true;
  return false;
}

function findChatInput() {
  const active = document.activeElement;
  if (isEditable(active)) {
    return active.isContentEditable ? active : (active.closest('[contenteditable="true"]') || active);
  }

  const selectors = [
    // Shopee
    '.chat-input-textarea',
    '.chat-input [contenteditable="true"]',
    '.shopee-react-chat-input',
    '[class*="chat-input"] textarea',
    '[class*="chat-input"] [contenteditable="true"]',
    // Tokopedia
    '[data-testid*="chat-input"]',
    '[data-testid="input-chat"]',
    '.css-chat-input',
    // WhatsApp Web
    'footer div[contenteditable="true"]',
    'div[data-tab="10"]',
    'div[title*="pesan" i]',
    'div[title*="message" i]',
    // Lazada
    '.chat-editor [contenteditable="true"]',
    '.next-input textarea',
    // TikTok Shop
    'div[data-slate-editor="true"]',
    '.chat-input-box textarea',
    // General fallback
    '[contenteditable="true"]',
    'textarea',
    'input[type="text"]',
    'input[type="search"]'
  ];
  for (const s of selectors) {
    try {
      const list = document.querySelectorAll(s);
      for (const el of list) {
        if (el.offsetParent !== null && !el.disabled && !el.readOnly) {
          return el;
        }
      }
    } catch (e) {}
  }
  return null;
}

// ── INLINE AUTOCOMPLETE POPUP INJECTION & RENDERING ──────────────────────────
function injectPopupStyles() {
  if (document.getElementById('cs-inline-smart-styles')) return;

  const style = document.createElement('style');
  style.id = 'cs-inline-smart-styles';
  style.textContent = `
    [data-cs-chat-highlight="true"] {
      outline: 2.5px solid #df1683 !important;
      box-shadow: 0 0 16px rgba(223, 22, 131, 0.55) !important;
      border-radius: 8px !important;
      transition: outline 0.15s ease, box-shadow 0.15s ease !important;
    }

    #cs-smart-inline-popup {
      --cs-bg: #161b27;
      --cs-header-bg: #1e2535;
      --cs-search-bg: #121620;
      --cs-input-bg: #1e2535;
      --cs-input-color: #ffffff;
      --cs-input-border: rgba(255, 255, 255, 0.12);
      --cs-card-bg: #1e2535;
      --cs-card-border: rgba(255, 255, 255, 0.08);
      --cs-card-hover: #252d3d;
      --cs-card-selected: rgba(223, 22, 131, 0.18);
      --cs-text-primary: #f1f5f9;
      --cs-text-secondary: #94a3b8;
      --cs-text-muted: #64748b;
      --cs-border-color: rgba(255, 255, 255, 0.08);
      --cs-clip-pill-bg: rgba(223, 22, 131, 0.2);
      --cs-clip-pill-color: #ff55a3;
      --cs-var-pill-bg: rgba(255, 255, 255, 0.1);
      --cs-var-pill-color: #e2e8f0;
      --cs-kbd-bg: #252d3d;
      --cs-kbd-border: rgba(255, 255, 255, 0.12);
      --cs-kbd-color: #cbd5e1;
      --cs-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(223, 22, 131, 0.25);
      --cs-scrollbar: #3f3f46;

      position: fixed;
      z-index: 2147483647;
      width: 480px;
      max-width: calc(100vw - 24px);
      max-height: 420px;
      background: var(--cs-bg) !important;
      color: var(--cs-text-primary) !important;
      border: 1.5px solid #df1683 !important;
      border-radius: 14px !important;
      box-shadow: var(--cs-shadow) !important;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: csInlinePopIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes csInlinePopIn {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    #cs-smart-inline-popup[data-theme="light"] {
      --cs-bg: #ffffff;
      --cs-header-bg: #f8fafc;
      --cs-search-bg: #f1f5f9;
      --cs-input-bg: #ffffff;
      --cs-input-color: #0f172a;
      --cs-input-border: #cbd5e1;
      --cs-card-bg: #f8fafc;
      --cs-card-border: #e2e8f0;
      --cs-card-hover: #f1f5f9;
      --cs-card-selected: rgba(223, 22, 131, 0.12);
      --cs-text-primary: #0f172a;
      --cs-text-secondary: #475569;
      --cs-text-muted: #94a3b8;
      --cs-border-color: #e2e8f0;
      --cs-clip-pill-bg: rgba(223, 22, 131, 0.15);
      --cs-clip-pill-color: #df1683;
      --cs-var-pill-bg: rgba(0, 0, 0, 0.06);
      --cs-var-pill-color: #334155;
      --cs-kbd-bg: #ffffff;
      --cs-kbd-border: #cbd5e1;
      --cs-kbd-color: #334155;
      --cs-shadow: 0 16px 40px rgba(0, 0, 0, 0.18), 0 0 20px rgba(223, 22, 131, 0.2);
      --cs-scrollbar: #cbd5e1;
    }

    .cs-inline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--cs-header-bg) !important;
      border-bottom: 1px solid var(--cs-border-color) !important;
      gap: 8px;
    }

    .cs-inline-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 12.5px;
      color: #df1683;
      letter-spacing: 0.3px;
    }

    .cs-inline-hint {
      font-size: 11px;
      color: var(--cs-text-muted) !important;
    }

    .cs-inline-hint kbd {
      background: var(--cs-kbd-bg) !important;
      border: 1px solid var(--cs-kbd-border) !important;
      color: var(--cs-kbd-color) !important;
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 10px;
    }

    .cs-inline-search-bar {
      padding: 8px 12px;
      background: var(--cs-search-bg) !important;
      border-bottom: 1px solid var(--cs-border-color) !important;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cs-inline-search-bar input {
      flex: 1;
      background: var(--cs-input-bg) !important;
      border: 1px solid var(--cs-input-border) !important;
      border-radius: 6px;
      color: var(--cs-input-color) !important;
      padding: 6px 10px;
      font-size: 12.5px;
      outline: none;
      pointer-events: auto !important;
      user-select: text !important;
      -webkit-user-select: text !important;
      cursor: text !important;
    }

    .cs-inline-search-bar input:focus {
      border-color: #df1683 !important;
    }

    .cs-inline-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 260px;
    }

    .cs-inline-list::-webkit-scrollbar {
      width: 5px;
    }

    .cs-inline-list::-webkit-scrollbar-thumb {
      background: var(--cs-scrollbar) !important;
      border-radius: 99px;
    }

    .cs-inline-item {
      padding: 9px 12px;
      border-radius: 8px;
      background: var(--cs-card-bg) !important;
      border: 1px solid var(--cs-card-border) !important;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.12s ease;
    }

    .cs-inline-item:hover {
      background: var(--cs-card-hover) !important;
      border-color: rgba(223, 22, 131, 0.4) !important;
    }

    .cs-inline-item.selected {
      background: var(--cs-card-selected) !important;
      border-color: #df1683 !important;
      box-shadow: 0 0 10px rgba(223, 22, 131, 0.25);
    }

    .cs-inline-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .cs-inline-item-title {
      font-weight: 600;
      font-size: 12.5px;
      color: var(--cs-text-primary) !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cs-inline-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .cs-badge-greeting  { background: rgba(59, 130, 246, 0.18); color: #3b82f6; }
    .cs-badge-order     { background: rgba(16, 185, 129, 0.18); color: #10b981; }
    .cs-badge-complaint { background: rgba(239, 68, 68, 0.18);  color: #ef4444; }
    .cs-badge-product   { background: rgba(168, 85, 247, 0.18); color: #a855f7; }
    .cs-badge-custom    { background: rgba(223, 22, 131, 0.18); color: #df1683; }

    .cs-inline-item-content {
      font-size: 12px;
      color: var(--cs-text-secondary) !important;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .cs-clip-pill {
      background: var(--cs-clip-pill-bg) !important;
      color: var(--cs-clip-pill-color) !important;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 600;
      font-family: monospace;
    }

    .cs-var-pill {
      background: var(--cs-var-pill-bg) !important;
      color: var(--cs-var-pill-color) !important;
      padding: 1px 5px;
      border-radius: 4px;
    }

    mark.cs-query-highlight {
      background: rgba(223, 22, 131, 0.28) !important;
      color: #df1683 !important;
      padding: 1px 3px !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }

    .cs-inline-empty {
      padding: 16px 14px;
      text-align: center;
      font-size: 12px;
      color: var(--cs-text-muted) !important;
      background: var(--cs-card-bg);
      border: 1px dashed var(--cs-card-border);
      border-radius: 10px;
      margin: 8px 4px;
    }

    .cs-inline-footer {
      padding: 7px 12px;
      background: var(--cs-search-bg) !important;
      border-top: 1px solid var(--cs-border-color) !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--cs-text-muted) !important;
    }

    /* ── Inline History Dropdown / Switcher ── */
    .cs-inline-clip-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--cs-kbd-bg);
      border: 1px solid var(--cs-kbd-border);
      color: var(--cs-clip-pill-color);
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: monospace;
    }

    .cs-inline-clip-toggle:hover {
      background: var(--cs-card-hover);
      border-color: #df1683;
    }

    .cs-inline-history-dropdown {
      background: var(--cs-bg);
      border-top: 1px solid var(--cs-border-color);
      max-height: 170px;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cs-inline-hist-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--cs-card-bg);
      border: 1px solid var(--cs-card-border);
      cursor: pointer;
      font-size: 11.5px;
      gap: 8px;
      transition: all 0.12s ease;
    }

    .cs-inline-hist-item:hover {
      background: var(--cs-card-hover);
      border-color: #df1683;
    }

    .cs-inline-hist-item.active {
      background: var(--cs-card-selected);
      border-color: #df1683;
    }

    .cs-inline-hist-text {
      font-family: monospace;
      font-weight: 600;
      color: var(--cs-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
      max-width: 240px;
    }

    .cs-inline-hist-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      color: var(--cs-text-muted);
    }
  `;
  document.head.appendChild(style);
}

function updatePopupPosition() {
  if (!popupElement || !activeTargetInput || !isInlinePopupOpen) return;

  const rect = activeTargetInput.getBoundingClientRect();
  const popupWidth = 480;
  const popupHeight = popupElement.offsetHeight || 320;
  const margin = 8;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top, left;

  left = Math.max(12, Math.min(rect.left, window.innerWidth - popupWidth - 12));

  if (spaceBelow < popupHeight + margin && spaceAbove > spaceBelow) {
    top = Math.max(12, rect.top - popupHeight - margin);
  } else {
    top = Math.min(window.innerHeight - popupHeight - 12, rect.bottom + margin);
  }

  popupElement.style.top = `${top}px`;
  popupElement.style.left = `${left}px`;
}

function renderInlineHistory() {
  if (!popupElement) return;
  const historyDrop = popupElement.querySelector('#cs-inline-history-drop');
  if (!historyDrop) return;

  if (inlineClipboardHistory.length === 0) {
    historyDrop.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--cs-text-muted); font-size: 11.5px;">
        Belum ada riwayat clipboard. Copy / Cut nomor pesanan/resi untuk mengisi riwayat.
      </div>`;
    return;
  }

  historyDrop.innerHTML = inlineClipboardHistory.map(item => {
    const isActive = item.text === currentClipboardValue;
    const relTime = formatRelativeTime(item.time);
    const rawText = (item.text || '').trim();
    const cleanText = rawText.replace(/[\r\n\t]+/g, ' ');
    const previewText = cleanText.length > 80 ? cleanText.substring(0, 77) + '…' : cleanText;
    const tooltipTitle = escapeHtml(rawText.length > 180 ? rawText.substring(0, 177) + '…' : rawText);

    return `
      <div class="cs-inline-hist-item ${isActive ? 'active' : ''}" data-text="${escapeHtml(item.text)}" data-source="${escapeHtml(item.source || '')}" title="${tooltipTitle}">
        <span class="cs-inline-hist-text">${escapeHtml(previewText)}</span>
        <div class="cs-inline-hist-meta">
          <span>${escapeHtml(item.source || 'Luar')}</span>
          <span>&middot;</span>
          <span>${relTime}</span>
          ${isActive ? '<span style="color:#10b981; font-weight:700;">✓</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  historyDrop.querySelectorAll('.cs-inline-hist-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const txt = el.dataset.text;
      const src = el.dataset.source;
      if (txt) {
        currentClipboardValue = txt;
        ipcRenderer.sendToHost('clipboard-copied', txt);
        toggleInlineHistory(false);
        renderInlineItems();
        updateClipboardBtnText();
      }
    });
  });
}

function updateClipboardBtnText() {
  if (!popupElement) return;
  const btn = popupElement.querySelector('#cs-inline-clip-btn');
  if (btn) {
    const clipSnippet = currentClipboardValue ? (currentClipboardValue.length > 14 ? currentClipboardValue.substring(0, 12) + '…' : currentClipboardValue) : 'Riwayat Clip';
    btn.innerHTML = `<span>📋 ${escapeHtml(clipSnippet)}</span><span style="font-size:9px; opacity:0.7;">▾</span>`;
  }
}

function toggleInlineHistory(forceState) {
  if (!popupElement) return;
  const historyDrop = popupElement.querySelector('#cs-inline-history-drop');
  if (!historyDrop) return;

  isInlineHistoryOpen = forceState !== undefined ? forceState : !isInlineHistoryOpen;
  historyDrop.style.display = isInlineHistoryOpen ? 'flex' : 'none';
  if (isInlineHistoryOpen) {
    renderInlineHistory();
  }
  updatePopupPosition();
}

function renderInlineItems() {
  if (!popupElement) return;

  const listContainer = popupElement.querySelector('#cs-inline-items-list');
  const countBadge = popupElement.querySelector('#cs-inline-match-count');
  if (!listContainer) return;

  const q = inlineQuery.toLowerCase().trim();

  inlineFilteredTemplates = smartTemplates.filter(t => {
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  });

  if (countBadge) {
    countBadge.textContent = `${inlineFilteredTemplates.length} template`;
  }

  if (inlineSelectedIndex >= inlineFilteredTemplates.length) {
    inlineSelectedIndex = Math.max(0, inlineFilteredTemplates.length - 1);
  }

  if (inlineFilteredTemplates.length === 0) {
    listContainer.innerHTML = `
      <div class="cs-inline-empty">
        🔍 Tidak ada template yang cocok dengan kata kunci "<b>${escapeHtml(inlineQuery)}</b>"
      </div>`;
    return;
  }

  const categoryLabels = {
    greeting:  { label: 'Sapaan', class: 'cs-badge-greeting' },
    order:     { label: 'Pesanan & Resi', class: 'cs-badge-order' },
    complaint: { label: 'Komplain', class: 'cs-badge-complaint' },
    product:   { label: 'Produk', class: 'cs-badge-product' },
    custom:    { label: 'Kustom', class: 'cs-badge-custom' }
  };

  listContainer.innerHTML = inlineFilteredTemplates.map((t, idx) => {
    const isSelected = idx === inlineSelectedIndex;
    const cat = categoryLabels[t.category] || categoryLabels.custom;

    let titleHtml = escapeHtml(t.title);
    if (q) {
      try {
        const cleanQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${cleanQ})`, 'gi');
        titleHtml = titleHtml.replace(regex, '<mark class="cs-query-highlight">$1</mark>');
      } catch (e) {}
    }

    const previewHtml = highlightVariablesHtml(t.content, undefined, q);

    return `
      <div class="cs-inline-item ${isSelected ? 'selected' : ''}" data-index="${idx}">
        <div class="cs-inline-item-top">
          <div class="cs-inline-item-title">
            <span style="color:#df1683; font-size:11px; font-weight:700;">[${idx + 1}]</span>
            <span>${titleHtml}</span>
          </div>
          <span class="cs-inline-badge ${cat.class}">${cat.label}</span>
        </div>
        <div class="cs-inline-item-content">${previewHtml}</div>
      </div>
    `;
  }).join('');

  const selectedEl = listContainer.querySelector('.cs-inline-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }

  listContainer.querySelectorAll('.cs-inline-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      selectInlineTemplate(idx);
    });
  });

  updateClipboardBtnText();
}

let isInsertingTemplate = false;

function selectInlineTemplate(index) {
  if (isInsertingTemplate) return;
  isInsertingTemplate = true;

  try {
    const tpl = inlineFilteredTemplates[index];
    if (!tpl || !activeTargetInput) return;

    const resolved = resolveVariables(tpl.content);
    insertTextIntoTarget(activeTargetInput, resolved, inlineQuery);
    try {
      ipcRenderer.sendToHost('quick-reply-used');
    } catch (e) {}
    closeInlineSmartQuickReply();
  } finally {
    setTimeout(() => {
      isInsertingTemplate = false;
    }, 250);
  }
}

function setNativeValue(element, value) {
  try {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    if (element._valueTracker) {
      element._valueTracker.setValue(value);
    }
  } catch (e) {
    element.value = value;
  }
}

function insertTextIntoTarget(target, text, replaceQuery = '') {
  if (!target || !text) return;
  target.focus();

  if (target.isContentEditable || (target.getAttribute && target.getAttribute('contenteditable') === 'true')) {
    target.focus();
    if (replaceQuery && target.innerText && target.innerText.endsWith(replaceQuery)) {
      for (let i = 0; i < replaceQuery.length; i++) {
        try { document.execCommand('delete', false, null); } catch (e) {}
      }
    }

    let inserted = false;
    try {
      inserted = document.execCommand('insertText', false, text);
    } catch (e) {
      inserted = false;
    }

    // Fallback hanya jika browser execCommand tidak didukung
    if (!inserted) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        target.textContent += text;
      }

      try {
        target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      } catch (e) {}
    }
  } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    target.focus();
    const val = target.value || '';
    let start = target.selectionStart || 0;
    let end = target.selectionEnd || 0;

    if (replaceQuery && val.substring(0, start).endsWith(replaceQuery)) {
      start -= replaceQuery.length;
    }

    const newVal = val.substring(0, start) + text + val.substring(end);
    setNativeValue(target, newVal);
    target.selectionStart = target.selectionEnd = start + text.length;

    try {
      target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } catch (e) {}
  }
}

async function showInlineSmartQuickReply(target) {
  injectPopupStyles();

  // Cek clipboard terkini secara langsung via navigator.clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const clip = (await navigator.clipboard.readText())?.trim();
      if (clip) {
        currentClipboardValue = clip;
        ipcRenderer.sendToHost('clipboard-copied', clip);
      }
    }
  } catch (e) {}

  // Request latest data/clipboard/theme/history from host
  ipcRenderer.sendToHost('request-quickreply-data');
  ipcRenderer.sendToHost('inline-popup-opened');

  activeTargetInput = target;
  isInlinePopupOpen = true;
  isInlineHistoryOpen = false;
  inlineSelectedIndex = 0;
  inlineQuery = '';

  activeTargetInput.setAttribute('data-cs-chat-highlight', 'true');

  if (!popupElement) {
    popupElement = document.createElement('div');
    popupElement.id = 'cs-smart-inline-popup';
    popupElement.innerHTML = `
      <div class="cs-inline-header">
        <div class="cs-inline-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>Smart Quick Reply</span>
        </div>
        <div class="cs-inline-hint">
          <kbd>↑↓</kbd> Pilih &middot; <kbd>Enter</kbd> Ketik &middot; <kbd>Esc</kbd> Tutup
        </div>
      </div>
      <div class="cs-inline-search-bar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="cs-inline-filter-input" placeholder="Ketik kata (cth: 'hal', 'resi', 'order')...">
        <span id="cs-inline-match-count" style="font-size:11px; white-space:nowrap; opacity:0.8;"></span>
      </div>
      <div class="cs-inline-list" id="cs-inline-items-list"></div>
      <div class="cs-inline-history-dropdown" id="cs-inline-history-drop" style="display:none;"></div>
      <div class="cs-inline-footer">
        <div class="cs-inline-clip-toggle" id="cs-inline-clip-btn" title="Klik untuk pilih riwayat clipboard">
          <span>📋 Clip</span><span style="font-size:9px; opacity:0.7;">▾</span>
        </div>
        <span><span style="color:#df1683; font-weight:700;">⚡</span> Ketik cepat CS</span>
      </div>
    `;
    document.body.appendChild(popupElement);

    const filterInput = popupElement.querySelector('#cs-inline-filter-input');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        inlineQuery = e.target.value;
        inlineSelectedIndex = 0;
        renderInlineItems();
      });
      filterInput.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      filterInput.addEventListener('click', (e) => {
        e.stopPropagation();
        filterInput.focus();
      });
      filterInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
          // Handled in global or dispatch
          return;
        }
      });
    }

    const clipBtn = popupElement.querySelector('#cs-inline-clip-btn');
    if (clipBtn) {
      clipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleInlineHistory();
      });
    }
  }

  popupElement.setAttribute('data-theme', currentTheme || 'dark');
  popupElement.style.display = 'flex';
  const filterInput = popupElement.querySelector('#cs-inline-filter-input');
  if (filterInput) {
    filterInput.value = '';
    filterInput.style.pointerEvents = 'auto';
  }

  const historyDrop = popupElement.querySelector('#cs-inline-history-drop');
  if (historyDrop) historyDrop.style.display = 'none';
  isInlineHistoryOpen = false;

  renderInlineItems();
  updatePopupPosition();

  setTimeout(() => {
    const filterInput = popupElement?.querySelector('#cs-inline-filter-input');
    if (filterInput) {
      filterInput.focus();
      filterInput.select();
    }
  }, 40);
}

function closeInlineSmartQuickReply() {
  if (popupElement) {
    popupElement.style.display = 'none';
  }
  if (activeTargetInput) {
    activeTargetInput.removeAttribute('data-cs-chat-highlight');
    activeTargetInput.focus();
  }
  isInlinePopupOpen = false;
  isInlineHistoryOpen = false;
  activeTargetInput = null;
  ipcRenderer.sendToHost('inline-popup-closed');
}

// ── KEYBOARD NAVIGATION FOR INLINE POPUP ─────────────────────────────────────
document.addEventListener('keydown', function (e) {
  // 1. Smart Quick Reply Trigger: Ctrl+Space / Alt+Q
  if ((e.ctrlKey && e.code === 'Space') || (e.altKey && (e.key === 'q' || e.key === 'Q'))) {
    e.preventDefault();
    e.stopPropagation();

    if (isInlinePopupOpen) {
      closeInlineSmartQuickReply();
      return;
    }

    const target = findChatInput();
    if (target) {
      showInlineSmartQuickReply(target);
    } else {
      ipcRenderer.sendToHost('open-quick-reply');
    }
    return;
  }

  // 2. Jika Inline Popup sedang terbuka
  if (isInlinePopupOpen) {
    const filterInput = popupElement?.querySelector('#cs-inline-filter-input');
    const isFilterFocused = document.activeElement === filterInput;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (inlineFilteredTemplates.length > 0) {
        inlineSelectedIndex = (inlineSelectedIndex + 1) % inlineFilteredTemplates.length;
        renderInlineItems();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (inlineFilteredTemplates.length > 0) {
        inlineSelectedIndex = (inlineSelectedIndex - 1 + inlineFilteredTemplates.length) % inlineFilteredTemplates.length;
        renderInlineItems();
      }
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (inlineFilteredTemplates.length > 0) {
        selectInlineTemplate(inlineSelectedIndex);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isInlineHistoryOpen) {
        toggleInlineHistory(false);
      } else {
        closeInlineSmartQuickReply();
      }
      return;
    }

    // Jika filter input belum fokus tapi user mengetik huruf / karakter umum, otomatis arahkan ke filter input!
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && !isFilterFocused) {
      if (filterInput) {
        filterInput.focus();
        filterInput.value += e.key;
        inlineQuery = filterInput.value;
        inlineSelectedIndex = 0;
        renderInlineItems();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
  }

  // 3. Switch Store Shortcuts (Ctrl+1..9, Alt+Up/Down)
  if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.sendToHost('switch-store-index', parseInt(e.key, 10));
    return;
  }

  if (e.altKey && e.key === 'ArrowUp') {
    e.preventDefault();
    ipcRenderer.sendToHost('switch-store-relative', -1);
    return;
  }
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    ipcRenderer.sendToHost('switch-store-relative', 1);
    return;
  }

  // 4. Zoom & Browser Navigation
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    ipcRenderer.sendToHost('zoom-reset');
  }
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    ipcRenderer.sendToHost('zoom-change', 1);
  }
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    ipcRenderer.sendToHost('zoom-change', -1);
  }
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    ipcRenderer.sendToHost('nav-back');
  }
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    ipcRenderer.sendToHost('nav-forward');
  }
  if (e.key === 'F5' && !e.ctrlKey) {
    e.preventDefault();
    ipcRenderer.sendToHost('nav-refresh');
  }
}, true);

// Klik di luar popup untuk menutup
document.addEventListener('mousedown', function (e) {
  if (isInlinePopupOpen && popupElement) {
    if (!popupElement.contains(e.target) && e.target !== activeTargetInput) {
      closeInlineSmartQuickReply();
    }
  }
}, true);

window.addEventListener('scroll', updatePopupPosition, true);
window.addEventListener('resize', updatePopupPosition);

// ── Ctrl+Click - Buka Link di Tab Baru ────────────────────────────────────────
document.addEventListener('click', function (e) {
  if (e.ctrlKey || e.metaKey) {
    const link = e.target.closest('a[href]');
    if (link && link.href && !link.href.startsWith('javascript:') && link.href !== '#') {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.sendToHost('ctrl-click-link', link.href);
    }
  }
}, true);

// ── Ctrl+Scroll - Zoom In/Out ────────────────────────────────────────────────
window.addEventListener('wheel', function (e) {
  if (e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.sendToHost('zoom-change', e.deltaY > 0 ? -1 : 1);
  }
}, { passive: false, capture: true });

// ── Direct Text Insertion from Host Drawer ───────────────────────────────────
ipcRenderer.on('insert-chat-text', (event, text) => {
  if (!text) return;
  const target = findChatInput() || document.activeElement;
  if (target) {
    const custName = detectActiveCustomerName() || 'Kak';
    const resolved = text.replace(/\{(pembeli|customer|buyer|nama_pembeli|nama_customer)\}/gi, custName);
    insertTextIntoTarget(target, resolved, '');
  }
});

// ── Draft Detection (Mencegah Hard Hibernate) ─────────────────────────────────
let hasDraft = false;
document.addEventListener('input', function (e) {
  const el = e.target;
  if (!el) return;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
    if (el.tagName === 'INPUT' && ['checkbox', 'radio', 'file', 'submit', 'button', 'color', 'hidden'].includes(el.type)) {
      return;
    }
    const val = el.value !== undefined ? el.value : el.textContent;
    const isDirty = val.trim().length > 0;
    if (isDirty !== hasDraft) {
      hasDraft = isDirty;
      ipcRenderer.sendToHost('draft-status', hasDraft);
    }
  }
}, true);

// ── Unread Count Detection (Title & DOM Badge) ───────────────────────────────
let lastSentUnread = 0;
let unreadDebounceTimer = null;

function parseUnreadFromTitle(title) {
  if (!title || typeof title !== 'string') return 0;
  let m = title.match(/\((\d+)\+?\)/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/\[(\d+)\+?\]/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/(\d+)\+?\s*(?:pesan|message|msg|chat|unread|email)/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}

function parseUnreadFromDOM() {
  try {
    // 1. Deteksi Gmail Inbox (.bsU badge dan baris email belum dibaca tr.zA.zE)
    const gmailBsU = document.querySelectorAll('.bsU, a[href*="#inbox"] .bsU, div[data-tooltip*="Inbox"] .bsU, div[data-tooltip*="Kotak Masuk"] .bsU');
    if (gmailBsU && gmailBsU.length > 0) {
      let bsuSum = 0;
      gmailBsU.forEach(el => {
        const text = el.textContent.trim().replace(/[^0-9]/g, '');
        const num = parseInt(text, 10);
        if (!isNaN(num) && num > 0) bsuSum += num;
      });
      if (bsuSum > 0) return bsuSum;
    }

    const gmailUnreadRows = document.querySelectorAll('tr.zA.zE, tr.zE');
    if (gmailUnreadRows && gmailUnreadRows.length > 0) {
      return gmailUnreadRows.length;
    }

    // 2. Deteksi WhatsApp Web (akumulasi total angka di seluruh badge chat aktif)
    const waBadges = document.querySelectorAll('span[data-testid="icon-unread-count"], span[data-icon="unread-count"], [data-testid="unread-count"], span[aria-label*="unread" i], span[aria-label*="belum dibaca" i]');
    if (waBadges && waBadges.length > 0) {
      let waSum = 0;
      waBadges.forEach(el => {
        const text = el.textContent.trim();
        if (/^\d{1,4}\+?$/.test(text)) {
          const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > 0) waSum += num;
        } else {
          const aria = el.getAttribute('aria-label') || '';
          const m = aria.match(/(\d+)/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > 0) waSum += num;
          }
        }
      });
      if (waSum > 0) return waSum;
    }

    // 3. Deteksi Marketplace (Shopee, Tokopedia, Lazada, TikTok Shop, Blibli, Bukalapak)
    const badgeSelectors = [
      '.chat-list-item__unread',
      '.shopee-badge',
      '[data-testid*="badge"]',
      '.badge-count',
      '.unread-badge',
      '.chat-unread-count',
      '[class*="unread-count"]',
      '[class*="badge-count"]'
    ];
    for (const sel of badgeSelectors) {
      const els = document.querySelectorAll(sel);
      let sum = 0;
      els.forEach(el => {
        const text = el.textContent.trim();
        if (/^\d{1,4}\+?$/.test(text)) {
          const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > 0 && num < 1000) sum += num;
        }
      });
      if (sum > 0) return sum;
    }
  } catch (e) {}
  return 0;
}

function checkUnread() {
  // 1. Cek DOM terlebih dahulu untuk akurasi jumlah pesan total (mendukung akumulasi multi-pesan WA & baris Gmail)
  let count = parseUnreadFromDOM();
  
  // 2. Jika DOM belum memuat badge, baru periksa title sebagai fallback
  if (count === 0) {
    const titleCount = parseUnreadFromTitle(document.title);
    if (titleCount > 0) count = titleCount;
  }
  
  if (count !== lastSentUnread) {
    lastSentUnread = count;
    try {
      ipcRenderer.sendToHost('unread-count', count);
    } catch (e) {}
  }
}

function scheduleUnreadCheck(delay = 1000) {
  if (unreadDebounceTimer) return;
  unreadDebounceTimer = setTimeout(() => {
    unreadDebounceTimer = null;
    checkUnread();
  }, delay);
}

// Observe title changes (WhatsApp & marketplace selalu mengupdate <title>)
const titleObserver = new MutationObserver(() => scheduleUnreadCheck(150));
const titleEl = document.querySelector('title');
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
}

// Observe DOM body mutations (diberi debounce 1 detik agar responsif terhadap pesan masuk baru)
const bodyObserver = new MutationObserver(() => scheduleUnreadCheck(1000));
if (document.body) {
  bodyObserver.observe(document.body, { childList: true, subtree: false });
} else {
  window.addEventListener('DOMContentLoaded', () => {
    if (document.body) bodyObserver.observe(document.body, { childList: true, subtree: false });
  });
}

setInterval(checkUnread, 2000);
window.addEventListener('load', () => setTimeout(checkUnread, 1500));

// ── SYNC STATUS DETECTION (WhatsApp & Marketplace Initial Sync) ─────────────
let isCurrentlySyncing = false;
let cleanConsecutiveChecks = 0;
let lastSentSyncState = { isSyncing: false, progress: null };

function checkSyncStatus() {
  try {
    const host = window.location.hostname || '';
    const isWhatsApp = host.includes('whatsapp.com');

    if (!isWhatsApp) return;

    // 1. Cek apakah WhatsApp masih di layar startup script loading atau QR code
    const isStartupScreen = !!document.getElementById('initial_startup');
    const isQrScreen = !!document.querySelector('canvas[aria-label*="Scan" i], [data-testid="qrcode"]');
    if (isStartupScreen || isQrScreen) {
      // Masih di layar loading bundle script atau QR code, abaikan (bukan sinkronisasi chat)
      return;
    }

    // 2. Cari progress bar sinkronisasi di mana saja di dalam halaman WhatsApp
    const syncProgressEl = document.querySelector('progress, [role="progressbar"], [data-testid*="progress"], [data-testid="sync-progress"], [data-testid*="sync"]');
    
    // 3. Periksa seluruh elemen banner status, alert, drawer, dan modal popups
    const alertBanners = document.querySelectorAll('[role="status"], [role="alert"], [data-testid*="sync"], [data-testid*="banner"], [data-testid*="drawer"], [data-animate-modal-popup], [data-animate-drawer-left]');
    let bannerText = '';
    alertBanners.forEach(b => { bannerText += ' ' + (b.textContent || ''); });

    // Fallback: periksa juga teks container chat utama jika ada
    const sidePane = document.getElementById('pane-side') || document.getElementById('side');
    if (sidePane) {
      bannerText += ' ' + (sidePane.textContent ? sidePane.textContent.substring(0, 1500) : '');
    }

    const isSyncMatch = /mengunduh pesan|downloading messages|organizing messages|memuat obrolan|sinkronisasi riwayat|syncing older messages|downloading chats|sinkronisasi chat|sinkronisasi/i.test(bannerText);

    // Cek teks yang menyatakan sinkronisasi telah selesai 100%
    const isCompletedMatch = /terakhir disinkronkan|sinkronisasi selesai|all messages synced|last synced|riwayat pesan telah diunduh|riwayat chat selesai/i.test(bannerText);

    const isSyncingNow = !!(syncProgressEl || isSyncMatch);

    if (isSyncingNow) {
      cleanConsecutiveChecks = 0;
      isCurrentlySyncing = true;

      // Ekstrak persentase riil dari progress bar atau teks banner jika ada
      let percent = null;
      if (syncProgressEl) {
        const val = syncProgressEl.getAttribute('value') || syncProgressEl.getAttribute('aria-valuenow');
        const max = syncProgressEl.getAttribute('max') || syncProgressEl.getAttribute('aria-valuemax') || 100;
        if (val) {
          const numVal = parseFloat(val);
          const numMax = parseFloat(max);
          if (!isNaN(numVal) && !isNaN(numMax) && numMax > 0 && numVal <= numMax) {
            percent = Math.round((numVal / numMax) * 100);
          }
        }
      }
      if (percent === null && bannerText) {
        const match = bannerText.match(/(?:mengunduh|downloading|organizing|memuat|sinkronisasi|sync|messages|obrolan|chat)[^\n\r%]{0,40}?(\d{1,3})\s*%/i) ||
                      bannerText.match(/(\d{1,3})\s*%\s*(?:selesai|completed|mengunduh|downloading|sinkronisasi)/i) ||
                      bannerText.match(/(\d{1,3})\s*%/);
        if (match) {
          const p = parseInt(match[1], 10);
          if (p >= 0 && p <= 100) percent = p;
        }
      }

      // Jika persentase sudah 100% atau teks menyatakan selesai
      if (percent === 100 || isCompletedMatch) {
        isCurrentlySyncing = false;
        cleanConsecutiveChecks = 0;
        lastSentSyncState = { isSyncing: false, progress: null };
        try {
          ipcRenderer.sendToHost('sync-status', {
            isSyncing: false,
            completed: true,
            type: 'whatsapp'
          });
        } catch (e) {}
        return;
      }

      // Kirim IPC hanya jika state sinkronisasi atau persentase berubah
      if (!lastSentSyncState.isSyncing || lastSentSyncState.progress !== percent) {
        lastSentSyncState = { isSyncing: true, progress: percent };
        try {
          ipcRenderer.sendToHost('sync-status', {
            isSyncing: true,
            progress: percent,
            type: 'whatsapp'
          });
        } catch (e) {}
      }
    } else {
      // Banner tidak terlihat di layar saat ini (misal user beralih dari menu Profil ke menu Chat list).
      // Status sinkronisasi TETAP aktif di background sampai WhatsApp menyatakan selesai.
      if (isCurrentlySyncing && isCompletedMatch) {
        cleanConsecutiveChecks++;
        if (cleanConsecutiveChecks >= 2) {
          isCurrentlySyncing = false;
          cleanConsecutiveChecks = 0;
          lastSentSyncState = { isSyncing: false, progress: null };
          try {
            ipcRenderer.sendToHost('sync-status', {
              isSyncing: false,
              completed: true,
              type: 'whatsapp'
            });
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

setInterval(checkSyncStatus, 2500);
window.addEventListener('load', () => setTimeout(checkSyncStatus, 2000));



