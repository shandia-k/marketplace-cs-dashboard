// -- Status Bar Logic
const statusBarEl = document.getElementById('status-bar');

let sessionStartTime = Date.now();
let statusBarInterval = null;

function updateStatusBar() {
  if (!statusBarEl) return;

  // Hitung statistik
  const totalStores = stores.length;
  const openStores = Object.keys(storeTabs).length;

  let totalTabs = 0;
  let sleepingTabs = 0;
  Object.values(storeTabs).forEach(tabs => {
    totalTabs += tabs.length;
    tabs.forEach(tab => {
      if (webviewMap[tab.id]?.hibernated) sleepingTabs++;
    });
  });

  const activeTabs = totalTabs - sleepingTabs;

  // Session timer
  const elapsedMs = Date.now() - sessionStartTime;
  const hours   = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // RAM
  const ramStr = ramUsageMB >= 1024
    ? `${(ramUsageMB / 1024).toFixed(1)} GB`
    : `${Math.round(ramUsageMB)} MB`;

  if (totalStores === 0) {
    statusBarEl.style.display = 'none';
    return;
  }

  statusBarEl.style.display = 'flex';
  statusBarEl.innerHTML = `
    <div class="status-bar-group">
      <span class="status-dot status-green"></span>
      <span>${openStores} toko dibuka</span>
    </div>
    <div class="status-bar-sep"></div>
    <div class="status-bar-group">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <span>${activeTabs} tab aktif</span>
      ${sleepingTabs > 0 ? `<span class="status-sleep">&#x1F343; ${sleepingTabs} tidur</span>` : ''}
    </div>
    <div class="status-bar-sep"></div>
    <div class="status-bar-group">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 6V4M10 6V4M14 6V4M18 6V4"/>
      </svg>
      <span class="${ramUsageMB >= 1024 ? 'status-warn' : ''}">${ramStr}</span>
    </div>
    <div class="status-bar-sep"></div>
    <div class="status-bar-group">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>Sesi: ${timeStr}</span>
    </div>
  `;
}

// Jalankan setiap detik
statusBarInterval = setInterval(updateStatusBar, 1000);
updateStatusBar();
