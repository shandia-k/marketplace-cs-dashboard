/**
 * webview-preload.js
 * Script yang diinjeksi ke dalam setiap webview.
 * Menangkap: Ctrl+Click (tab baru), Ctrl+Scroll (zoom), Alt+←/→ (nav), F5 (refresh).
 */
const { ipcRenderer } = require('electron');

// ── Ctrl+Click → Buka Link di Tab Baru ───────────────────────────────────────
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

// ── Ctrl+Scroll → Zoom In/Out ─────────────────────────────────────────────────
window.addEventListener('wheel', function (e) {
  if (e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.sendToHost('zoom-change', e.deltaY > 0 ? -1 : 1);
  }
}, { passive: false, capture: true });

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', function (e) {
  // Ctrl+0 → Reset Zoom
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    ipcRenderer.sendToHost('zoom-reset');
  }
  // Ctrl+= / Ctrl++ → Zoom In
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    ipcRenderer.sendToHost('zoom-change', 1);
  }
  // Ctrl+- → Zoom Out
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    ipcRenderer.sendToHost('zoom-change', -1);
  }
  // Alt+← → Back
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    ipcRenderer.sendToHost('nav-back');
  }
  // Alt+→ → Forward
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    ipcRenderer.sendToHost('nav-forward');
  }
  // F5 → Refresh
  if (e.key === 'F5' && !e.ctrlKey) {
    e.preventDefault();
    ipcRenderer.sendToHost('nav-refresh');
  }
}, true);

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
