/**
 * CS Marketplace Dashboard - Network Monitoring & Backup Tethering Guide
 * Fitur:
 * 1. Deteksi status koneksi internet real-time (Online/Offline)
 * 2. Indikator visual titik hijau/merah di avatar CS & popover
 * 3. Warning banner otomatis saat koneksi terputus
 * 4. Modal infografik interaktif panduan SOP Tethering HP (Backup Internet)
 * 5. Fitur Live Test Koneksi dengan latency check
 */

(function () {
  'use strict';

  let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let isTesting = false;
  let checkInterval = null;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 2; // Membutuhkan 2x kegagalan berturut-turut sebelum menandai offline (mencegah flapping / glitch)

  // Endpoint probe konektivitas yang super cepat, ringan (HTTP 204 / trace / favicon), dan terdaftar di CSP
  const CONNECTIVITY_ENDPOINTS = [
    { url: 'https://www.gstatic.com/generate_204', method: 'GET', timeout: 3500 },
    { url: 'https://cloudflare.com/cdn-cgi/trace', method: 'GET', timeout: 3500 },
    { url: 'https://www.google.com/favicon.ico', method: 'GET', timeout: 4000 }
  ];

  // ── Inisialisasi Event Listener & Monitoring ─────────────────────────────────
  function initNetworkMonitor() {
    // 1. Browser online/offline event listeners
    window.addEventListener('online', () => handleNetworkChange(true));
    window.addEventListener('offline', () => handleNetworkChange(false));

    // 2. Periodic background connectivity verify (setiap 20 detik)
    checkInterval = setInterval(() => {
      verifyConnectivity(false);
    }, 20000);

    // 3. Initial check
    verifyConnectivity(false);

    // 4. Bind event UI listeners
    bindNetworkUIEvents();
  }

  // ── Probe Helper per Endpoint ───────────────────────────────────────────────
  async function probeEndpoint(endpoint) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout || 3500);
    const startTime = Date.now();
    try {
      await fetch(`${endpoint.url}?_t=${startTime}`, {
        method: endpoint.method || 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return { success: true, latency: Math.max(1, Date.now() - startTime) };
    } catch (e) {
      clearTimeout(timeoutId);
      return { success: false, error: e };
    }
  }

  // ── Pemeriksaan Konektivitas Nyata (Multi-Endpoint Ping Check) ───────────────
  async function verifyConnectivity(manualTrigger = false) {
    let probeResult = null;

    // Coba endpoint primer, jika gagal coba endpoint sekunder/tersier (failover cepat)
    for (const ep of CONNECTIVITY_ENDPOINTS) {
      probeResult = await probeEndpoint(ep);
      if (probeResult.success) break;
    }

    if (probeResult && probeResult.success) {
      consecutiveFailures = 0;
      updateNetworkUI(true, probeResult.latency, manualTrigger);
      return true;
    } else {
      consecutiveFailures++;
      // Jika dipicu manual (klik tombol Cek Koneksi), langsung tampilkan status gagal.
      // Jika di background, hanya ubah UI offline jika gagal berturut-turut >= MAX_CONSECUTIVE_FAILURES
      if (manualTrigger || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        updateNetworkUI(false, 0, manualTrigger);
      }
      return false;
    }
  }

  function handleNetworkChange(online) {
    if (online) {
      consecutiveFailures = 0;
      verifyConnectivity(false);
    } else {
      // Saat event offline Windows terpicu (sering kali transient/glitch adapter virtual),
      // lakukan verifikasi konektivitas riil ke endpoint untuk memastikan status nyata.
      verifyConnectivity(false);
    }
  }

  // ── Update Tampilan Indikator & Banner ───────────────────────────────────────
  function updateNetworkUI(online, latency = 0, manualTrigger = false) {
    if (!online && isOnline !== false && window.AppTelemetry) {
      window.AppTelemetry.track('network_offline_detected');
    }
    isOnline = online;

    // 1. Titik Indikator di Avatar Sidebar (.sidebar-user-online-dot)
    const sidebarDot = document.querySelector('.sidebar-user-online-dot');
    if (sidebarDot) {
      sidebarDot.className = `sidebar-user-online-dot ${online ? 'online' : 'offline'}`;
      sidebarDot.setAttribute(
        'title',
        online
          ? `Internet: Online (Stabil${latency > 0 ? ` ~${latency}ms` : ''}) - Klik untuk Panduan`
          : '⚠️ Internet: Terputus! Klik untuk Panduan Backup Tethering'
      );
    }

    // 2. Status di Popover Header User
    const popoverNetDot = document.getElementById('popover-net-dot');
    const popoverNetStatus = document.getElementById('popover-net-status');
    if (popoverNetDot) {
      popoverNetDot.className = `status-dot ${online ? 'status-green' : 'status-red'}`;
    }
    if (popoverNetStatus) {
      popoverNetStatus.textContent = online
        ? `Internet: Online (${latency > 0 ? `${latency}ms` : 'Stabil'})`
        : 'Internet: Terputus (Offline)';
      popoverNetStatus.style.color = online ? '#10b981' : '#ef4444';
    }

    // 3. Offline Warning Banner
    const offlineBanner = document.getElementById('network-offline-banner');
    if (offlineBanner) {
      offlineBanner.style.display = online ? 'none' : 'flex';
    }

    // 4. Update status badge di dalam Modal Panduan (jika terbuka)
    const modalBadge = document.getElementById('modal-net-guide-status');
    const testerResult = document.getElementById('net-tester-result');
    if (modalBadge) {
      modalBadge.className = `net-status-badge ${online ? 'badge-online' : 'badge-offline'}`;
      modalBadge.innerHTML = online
        ? `<span class="pulse-dot green"></span> Internet Terhubung (${latency > 0 ? `${latency}ms` : 'Normal'})`
        : `<span class="pulse-dot red"></span> Internet Terputus`;
    }

    if (testerResult && manualTrigger) {
      if (online) {
        testerResult.className = 'net-tester-result success';
        testerResult.innerHTML = `✅ <strong>Koneksi Berhasil!</strong> Komputer CS sudah online (${latency} ms). Seluruh toko siap digunakan.`;
      } else {
        testerResult.className = 'net-tester-result error';
        testerResult.innerHTML = `❌ <strong>Koneksi Masih Terputus.</strong> Silakan ikuti 6 langkah penambatan USB di atas.`;
      }
    }

    // Tampilkan toast notifikasi jika terjadi transisi status saat aplikasi berjalan
    if (manualTrigger) {
      if (typeof window.showToast === 'function') {
        window.showToast(
          online ? `Koneksi internet terhubung (${latency}ms).` : 'Koneksi internet masih terputus.',
          online ? 'success' : 'danger'
        );
      }
    }
  }

  // ── Kontrol Modal Panduan Infografik ─────────────────────────────────────────
  function openNetworkGuideModal() {
    const modalOverlay = document.getElementById('modal-network-guide-overlay');
    if (modalOverlay) {
      modalOverlay.classList.add('active');
      verifyConnectivity(false);
    }
    if (window.AppTelemetry) {
      window.AppTelemetry.track('network_guide_opened');
    }
    if (typeof notifyAction === 'function') {
      notifyAction('open_network_sop');
    } else if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
      window.OnboardingManager.notifyAction('open_network_sop');
    }
  }

  function closeNetworkGuideModal() {
    const modalOverlay = document.getElementById('modal-network-guide-overlay');
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  // ── Bind UI Events ──────────────────────────────────────────────────────────
  function bindNetworkUIEvents() {
    // 1. Klik pada avatar dot membuka modal panduan
    const sidebarDot = document.querySelector('.sidebar-user-online-dot');
    if (sidebarDot) {
      sidebarDot.addEventListener('click', (e) => {
        e.stopPropagation();
        openNetworkGuideModal();
      });
    }

    // 2. Tombol di Popover Menu
    const popoverBtn = document.getElementById('popover-btn-net-guide');
    if (popoverBtn) {
      popoverBtn.addEventListener('click', () => {
        const popover = document.getElementById('user-popover-menu');
        if (popover) popover.classList.remove('active');
        openNetworkGuideModal();
      });
    }

    // 3. Tombol di Warning Banner
    const btnOpenFromBanner = document.getElementById('btn-open-network-guide');
    if (btnOpenFromBanner) {
      btnOpenFromBanner.addEventListener('click', openNetworkGuideModal);
    }

    const btnRetryBanner = document.getElementById('btn-network-retry');
    if (btnRetryBanner) {
      btnRetryBanner.addEventListener('click', async () => {
        btnRetryBanner.classList.add('spinning');
        await verifyConnectivity(true);
        btnRetryBanner.classList.remove('spinning');
      });
    }

    // 4. Tombol Close & Overlay Modal
    const btnCloseModal = document.getElementById('btn-net-guide-close');
    const btnCloseFooter = document.getElementById('btn-net-guide-done');
    const modalOverlay = document.getElementById('modal-network-guide-overlay');

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeNetworkGuideModal);
    if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeNetworkGuideModal);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeNetworkGuideModal();
      });
    }

    // 5. Tombol Uji Koneksi di dalam Modal
    const btnTest = document.getElementById('btn-test-connection');
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        if (isTesting) return;
        isTesting = true;
        btnTest.disabled = true;
        const origText = btnTest.innerHTML;
        btnTest.innerHTML = `
          <svg class="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Menguji Koneksi...
        `;

        if (window.AppTelemetry) {
          window.AppTelemetry.track('network_latency_tested');
        }
        await verifyConnectivity(true);

        btnTest.disabled = false;
        btnTest.innerHTML = origText;
        isTesting = false;
      });
    }

    // ESC key to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('modal-network-guide-overlay');
        if (modal && modal.classList.contains('active')) {
          closeNetworkGuideModal();
        }
      }
    });
  }

  // ── Expose Global API ───────────────────────────────────────────────────────
  window.NetworkMonitor = {
    isOnline: () => isOnline,
    verify: verifyConnectivity,
    openGuide: openNetworkGuideModal,
    closeGuide: closeNetworkGuideModal
  };

  // Inisialisasi saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetworkMonitor);
  } else {
    initNetworkMonitor();
  }
})();
