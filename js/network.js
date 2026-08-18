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

  let isOnline = navigator.onLine;
  let isTesting = false;
  let checkInterval = null;

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

  // ── Pemeriksaan Konektivitas Nyata (Ping Check) ──────────────────────────────
  async function verifyConnectivity(manualTrigger = false) {
    if (!navigator.onLine) {
      updateNetworkUI(false, 0, manualTrigger);
      return false;
    }

    const startTime = Date.now();
    try {
      // Gunakan endpoint yang sangat cepat & ringan dengan cache-busting
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(`https://1.1.1.1/cdn-cgi/trace?_t=${Date.now()}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      updateNetworkUI(true, latency, manualTrigger);
      return true;
    } catch (e) {
      // Fallback secondary check jika Cloudflare diblokir firewall lokal
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 4500);
        await fetch(`https://www.google.com/favicon.ico?_t=${Date.now()}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        const latency = Date.now() - startTime;
        updateNetworkUI(true, latency, manualTrigger);
        return true;
      } catch (err) {
        updateNetworkUI(false, 0, manualTrigger);
        return false;
      }
    }
  }

  function handleNetworkChange(online) {
    if (online) {
      verifyConnectivity(false);
    } else {
      updateNetworkUI(false, 0, false);
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
