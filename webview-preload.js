/**
 * webview-preload.js
 * Script yang diinjeksi ke dalam setiap webview.
 * Menangkap: Ctrl+Click (tab baru), Ctrl+Scroll (zoom), Alt+Panah (nav), F5 (refresh),
 *            dan jumlah pesan belum terbaca dari judul halaman.
 */
const { ipcRenderer } = require('electron');

// -- Ctrl+Click - Buka Link di Tab Baru
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

// -- Ctrl+Scroll - Zoom In/Out
window.addEventListener('wheel', function (e) {
  if (e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.sendToHost('zoom-change', e.deltaY > 0 ? -1 : 1);
  }
}, { passive: false, capture: true });

// -- Keyboard Shortcuts
document.addEventListener('keydown', function (e) {
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

// -- Draft Detection (Mencegah Hard Hibernate)
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

// -- Unread Count Detection (dari judul halaman)
// Format yang dideteksi:
//   (N) Chat - Shopee: "(3) Chat - Seller Centre"
//   N pesan  - Tokopedia/Blibli: "5 pesan baru"
//   [N]      - Format umum: "[2] Dashboard"
function parseUnreadFromTitle(title) {
  if (!title) return 0;
  let m = title.match(/^\((\d+)\)/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/^\[(\d+)\]/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/^(\d+)\s*(pesan|message|msg|chat)/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}

let lastSentUnread = -1;

function checkUnread() {
  const count = parseUnreadFromTitle(document.title);
  if (count !== lastSentUnread) {
    lastSentUnread = count;
    ipcRenderer.sendToHost('unread-count', count);
  }
}

// Observe title changes via MutationObserver
const titleObserver = new MutationObserver(() => checkUnread());
const titleEl = document.querySelector('title');
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
}

// Polling ringan sebagai fallback
setInterval(checkUnread, 3000);

// Cek pertama kali setelah halaman load
window.addEventListener('load', () => setTimeout(checkUnread, 1000));
