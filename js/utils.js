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

// ── Ram Indicator Update ──────────────────────────────────────────────────────
function updateRamIndicator(mb) {
  const indicator = document.getElementById('ram-indicator');
  const ramText   = document.getElementById('ram-text');
  if (!indicator || !ramText) return;

  ramText.textContent = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  const pct = mb / RAM_THRESHOLD_MB;
  indicator.className = 'titlebar-ram';
  if (pct >= 0.9)       indicator.classList.add('danger');
  else if (pct >= 0.65) indicator.classList.add('warning');
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

// ── Debounce ──────────────────────────────────────────────────────────────────
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
