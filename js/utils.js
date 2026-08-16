// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const toast   = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = 'toast', 3000);
}


// ── Zoom Indicator ─────────────────────────────────────────────────────────────
function showZoomIndicator(percent) {
  let indicator = document.getElementById('zoom-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'zoom-indicator';
    indicator.className = 'zoom-indicator';
    document.body.appendChild(indicator);
  }

  const isDefault = percent === 100;
  indicator.innerHTML = isDefault
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> ${percent}%`
    : `${percent > 100 ? '🔍+' : '🔍-'} ${percent}%`;

  indicator.classList.add('visible');
  clearTimeout(zoomIndicatorTimer);
  zoomIndicatorTimer = setTimeout(() => {
    indicator?.classList.remove('visible');
  }, 1800);
}

// ── Web Audio Notification Chime ─────────────────────────────────────────────
let audioCtx = null;
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Nada pertama (G5 - 783.99 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Nada kedua (C6 - 1046.50 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.10);
    gain2.gain.setValueAtTime(0.15, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.10);
    osc2.stop(now + 0.35);
  } catch (e) {
    // Abaikan jika browser memblokir audio sebelum user gesture
  }
}

// ── Time & Greeting Helpers ──────────────────────────────────────────────────
function getGreetingTime() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
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

// ── Text & Currency Helpers ──────────────────────────────────────────────────
function formatRupiah(num) {
  return 'Rp ' + Math.round(Number(num) || 0).toLocaleString('id-ID');
}

// ── Store Partition Key Helper ───────────────────────────────────────────────
function getStorePartition(store, username) {
  const user = username || window.currentUser;
  if (user && store && store.id) {
    return `persist:user_${user}_${store.id}`;
  }
  return store?.partition || `persist:${store?.id || 'default'}`;
}

// ── Unified Template Engine ──────────────────────────────────────────────────
function resolveTemplateVariables(rawText, options = {}) {
  if (!rawText) return '';
  const opts = typeof options === 'string' ? { clipboard: options } : (options || {});
  const clip = (opts.clipboard !== undefined ? opts.clipboard : (window.currentClipboardValue || '')).trim();
  const store = opts.storeName || (window.stores && window.activeStoreId ? window.stores.find(s => s.id === window.activeStoreId)?.name : '') || 'Toko Kami';
  const waktu = opts.waktu || getGreetingTime();

  return rawText
    .replace(/\{(clipboard|order|resi)\}/gi, () => clip || '...')
    .replace(/\{toko\}/gi, () => store)
    .replace(/\{waktu\}/gi, () => waktu);
}

// ── Modern Custom Confirmation & Danger Zone Dialog ──────────────────────────
/**
 * Modern Custom Confirmation Modal
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Message body (supports HTML & newlines)
 * @param {string} [options.type='info'] - 'info' | 'warning' | 'danger' | 'critical'
 * @param {string} [options.icon] - Custom icon / emoji
 * @param {string} [options.confirmText='Lanjutkan'] - Text on confirm button
 * @param {string} [options.cancelText='Batal'] - Text on cancel button
 * @param {string} [options.confirmBtnClass] - Custom button CSS class
 * @param {string} [options.requireText] - Keyword user must type (e.g. 'RESET', 'HAPUS') for critical actions
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
function showConfirmDialog(options = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-modal-overlay');
    if (!overlay) {
      // Fallback
      resolve(window.confirm(options.message || options.title || 'Konfirmasi'));
      return;
    }

    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const iconEl = document.getElementById('confirm-modal-icon');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirm = document.getElementById('btn-confirm-ok');
    const inputGroup = document.getElementById('confirm-modal-input-group');
    const inputField = document.getElementById('confirm-modal-input');
    const inputHint = document.getElementById('confirm-modal-input-hint');

    const type = options.type || 'info';
    const requireText = options.requireText ? String(options.requireText).trim() : null;

    // Set title and message
    if (titleEl) titleEl.textContent = options.title || 'Konfirmasi Tindakan';
    if (msgEl) {
      const msg = options.message || '';
      msgEl.innerHTML = msg.includes('<') ? msg : escapeHtml(msg).replace(/\n/g, '<br>');
    }

    // Set icon & badge styling based on type
    const defaultIcons = {
      info: 'ℹ️',
      warning: '⚠️',
      danger: '🗑️',
      critical: '🚨'
    };
    if (iconEl) {
      iconEl.className = `confirm-icon-box type-${type}`;
      iconEl.innerHTML = options.icon || defaultIcons[type] || '⚠️';
    }

    // Set button labels & styles
    if (btnCancel) btnCancel.textContent = options.cancelText || 'Batal';
    if (btnConfirm) {
      btnConfirm.textContent = options.confirmText || (type === 'danger' || type === 'critical' ? 'Ya, Lanjutkan' : 'Lanjutkan');
      btnConfirm.className = options.confirmBtnClass || (type === 'critical' || type === 'danger' ? 'btn-danger' : (type === 'warning' ? 'btn-warning' : 'btn-primary'));
    }

    // Handle requireText input (Danger Zone verification)
    if (requireText && inputGroup && inputField) {
      inputGroup.style.display = 'flex';
      inputField.value = '';
      if (inputHint) {
        inputHint.innerHTML = `Ketik <strong style="color:#ef4444; font-weight:700; user-select:all; background:var(--bg-tertiary); padding:2px 7px; border-radius:4px; border:1px solid rgba(239,68,68,0.3); font-family:monospace;">${escapeHtml(requireText)}</strong> untuk mengonfirmasi:`;
      }
      btnConfirm.disabled = true;
      btnConfirm.style.opacity = '0.4';
      btnConfirm.style.cursor = 'not-allowed';

      inputField.oninput = () => {
        const matches = inputField.value.trim().toUpperCase() === requireText.toUpperCase();
        btnConfirm.disabled = !matches;
        btnConfirm.style.opacity = matches ? '1' : '0.4';
        btnConfirm.style.cursor = matches ? 'pointer' : 'not-allowed';
      };
    } else if (inputGroup) {
      inputGroup.style.display = 'none';
      if (inputField) inputField.value = '';
      btnConfirm.disabled = false;
      btnConfirm.style.opacity = '1';
      btnConfirm.style.cursor = 'pointer';
    }

    // Cleanup & Close helper
    let isHandled = false;
    const cleanup = (result) => {
      if (isHandled) return;
      isHandled = true;
      overlay.classList.remove('active');
      document.removeEventListener('keydown', onKeyDown);
      btnCancel.onclick = null;
      btnConfirm.onclick = null;
      overlay.onclick = null;
      if (inputField) inputField.oninput = null;
      resolve(result);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup(false);
      } else if (e.key === 'Enter') {
        if (!btnConfirm.disabled) {
          cleanup(true);
        }
      }
    };

    btnCancel.onclick = (e) => {
      e.preventDefault();
      cleanup(false);
    };
    btnConfirm.onclick = (e) => {
      e.preventDefault();
      if (!btnConfirm.disabled) cleanup(true);
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) cleanup(false);
    };

    document.addEventListener('keydown', onKeyDown);
    overlay.classList.add('active');

    setTimeout(() => {
      if (requireText && inputField) {
        inputField.focus();
      } else if (btnConfirm) {
        btnConfirm.focus();
      }
    }, 120);
  });
}

window.showConfirmDialog = showConfirmDialog;

// ── Debounce ──────────────────────────────────────────────────────────────────
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
window.debounce = debounce;
