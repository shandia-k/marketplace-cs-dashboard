/**
 * Updater Manager - Marketplace CS Dashboard
 * Menangani modal cek update saat startup dan manual via settings
 */

(function () {
  let isManualCheck = false;
  let autoCloseTimer = null;
  let countdownInterval = null;
  let currentAppVersion = '1.0.5';

  const SVGS = {
    spinner: `
      <svg class="updater-svg-spin" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>`,
    success: `
      <svg class="updater-svg-success" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`,
    available: `
      <svg class="updater-svg-available" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>`,
    downloaded: `
      <svg class="updater-svg-downloaded" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v8"/>
        <path d="m4.93 10.93 1.41 1.41"/>
        <path d="M2 18h2"/>
        <path d="M20 18h2"/>
        <path d="m19.07 10.93-1.41 1.41"/>
        <path d="M22 22H2"/>
        <path d="m16 6-4-4-4 4"/>
        <path d="M16 18a4 4 0 0 0-8 0"/>
      </svg>`,
    error: `
      <svg class="updater-svg-error" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`
  };

  function getElements() {
    return {
      modal: document.getElementById('updater-modal'),
      iconWrapper: document.getElementById('updater-icon-wrapper'),
      title: document.getElementById('updater-status-title'),
      desc: document.getElementById('updater-status-desc'),
      currentVer: document.getElementById('updater-current-version'),
      targetVer: document.getElementById('updater-target-version'),
      progressContainer: document.getElementById('updater-progress-container'),
      progressFill: document.getElementById('updater-progress-fill'),
      progressPercent: document.getElementById('updater-progress-percent'),
      progressSpeed: document.getElementById('updater-progress-speed'),
      releaseNotes: document.getElementById('updater-release-notes'),
      releaseNotesContent: document.getElementById('updater-release-notes-content'),
      btnSkip: document.getElementById('btn-updater-skip'),
      btnAction: document.getElementById('btn-updater-action'),
      autoCheckToggle: document.getElementById('updater-auto-check-toggle'),
      btnClose: document.getElementById('updater-modal-close')
    };
  }

  function closeUpdaterModal() {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    const { modal } = getElements();
    if (modal) {
      modal.classList.remove('active');
    }
  }

  window.checkAppUpdates = async function (manual = false) {
    isManualCheck = manual;
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    const els = getElements();
    if (!els.modal) return;

    // Ambil versi aplikasi saat ini
    try {
      if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
        currentAppVersion = await window.electronAPI.getAppVersion();
      }
    } catch (e) {
      console.warn('Could not fetch app version:', e);
    }

    // Tampilkan modal UI saat memeriksa pembaruan (baik startup maupun manual)
    els.modal.classList.add('active');
    els.iconWrapper.innerHTML = SVGS.spinner;
    els.iconWrapper.className = 'updater-status-icon-wrapper status-checking';
    els.title.textContent = 'Memeriksa Pembaruan...';
    els.desc.textContent = 'Menghubungkan ke server untuk mencari versi terbaru.';
    els.currentVer.textContent = `Versi saat ini: v${currentAppVersion}`;
    els.targetVer.style.display = 'none';
    els.progressContainer.style.display = 'none';
    els.releaseNotes.style.display = 'none';

    els.btnSkip.style.display = 'inline-flex';
    els.btnSkip.textContent = manual ? 'Tutup' : 'Lewati';
    els.btnAction.style.display = 'none';

    // Panggil main process
    if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
      window.electronAPI.checkForUpdates();
    }
  };

  function setupEventListeners() {
    const els = getElements();
    if (!els.modal) return;

    els.btnClose?.addEventListener('click', closeUpdaterModal);
    els.btnSkip?.addEventListener('click', closeUpdaterModal);

    // Auto-check checkbox preference
    const savedAutoCheck = localStorage.getItem('auto_check_updates');
    if (els.autoCheckToggle) {
      els.autoCheckToggle.checked = savedAutoCheck !== 'false';
      els.autoCheckToggle.addEventListener('change', (e) => {
        localStorage.setItem('auto_check_updates', e.target.checked ? 'true' : 'false');
      });
    }

    // Modal background click
    els.modal.addEventListener('click', (e) => {
      if (e.target === els.modal) {
        closeUpdaterModal();
      }
    });

    // Listen to updater messages from main process
    if (window.electronAPI && typeof window.electronAPI.onUpdaterMessage === 'function') {
      window.electronAPI.onUpdaterMessage((data) => {
        handleUpdaterMessage(data);
      });
    }

    // Listen to download progress
    if (window.electronAPI && typeof window.electronAPI.onUpdaterProgress === 'function') {
      window.electronAPI.onUpdaterProgress((progress) => {
        handleUpdaterProgress(progress);
      });
    }
  }

  function handleUpdaterMessage(data) {
    const els = getElements();
    if (!els.modal) return;

    const status = data.status;

    // Pastikan modal aktif saat pesan status pembaruan diterima
    els.modal.classList.add('active');

    if (status === 'checking') {
      els.iconWrapper.innerHTML = SVGS.spinner;
      els.iconWrapper.className = 'updater-status-icon-wrapper status-checking';
      els.title.textContent = 'Memeriksa Pembaruan...';
      els.desc.textContent = 'Menghubungkan ke server untuk mencari versi terbaru.';
    } else if (status === 'not-available') {
      // Up to date
      els.iconWrapper.innerHTML = SVGS.success;
      els.iconWrapper.className = 'updater-status-icon-wrapper status-success';
      els.title.textContent = 'Aplikasi Sudah Versi Terbaru';
      els.desc.textContent = data.message || `Anda sudah menggunakan versi terbaru (v${data.version || currentAppVersion}).`;

      els.btnSkip.style.display = 'none';
      els.btnAction.style.display = 'inline-flex';
      els.btnAction.className = 'btn-primary';
      els.btnAction.onclick = closeUpdaterModal;

      if (!isManualCheck) {
        // Startup otomatis: Countdown 3 detik dengan indikator waktu di tombol
        let secondsLeft = 3;
        els.btnAction.textContent = `Tutup (${secondsLeft}s)`;

        if (countdownInterval) {
          clearInterval(countdownInterval);
        }

        countdownInterval = setInterval(() => {
          secondsLeft--;
          if (secondsLeft > 0) {
            els.btnAction.textContent = `Tutup (${secondsLeft}s)`;
          } else {
            if (countdownInterval) {
              clearInterval(countdownInterval);
              countdownInterval = null;
            }
            closeUpdaterModal();
          }
        }, 1000);
      } else {
        els.btnAction.textContent = 'Tutup';
      }
    } else if (status === 'available') {
      // New update available
      els.iconWrapper.innerHTML = SVGS.available;
      els.iconWrapper.className = 'updater-status-icon-wrapper status-available';
      els.title.textContent = `Versi Baru v${data.version} Tersedia!`;
      els.desc.textContent = 'Pembaruan sedang diunduh secara otomatis di latar belakang.';

      els.targetVer.textContent = `Versi baru: v${data.version}`;
      els.targetVer.style.display = 'inline-block';

      if (data.releaseNotes) {
        els.releaseNotes.style.display = 'block';
        els.releaseNotesContent.innerHTML = typeof data.releaseNotes === 'string'
          ? data.releaseNotes
          : JSON.stringify(data.releaseNotes);
      }

      els.progressContainer.style.display = 'block';
      els.progressFill.style.width = '0%';
      els.progressPercent.textContent = '0%';
      els.progressSpeed.textContent = 'Menyiapkan unduhan...';

      els.btnSkip.style.display = 'inline-flex';
      els.btnSkip.textContent = 'Unduh di Latar Belakang';
      els.btnAction.style.display = 'none';
    } else if (status === 'downloaded') {
      // Ready to install
      els.iconWrapper.innerHTML = SVGS.downloaded;
      els.iconWrapper.className = 'updater-status-icon-wrapper status-downloaded';
      els.title.textContent = 'Pembaruan Siap Dipasang! 🎉';
      els.desc.textContent = `Versi ${data.version ? 'v' + data.version : 'terbaru'} telah selesai diunduh. Restart aplikasi sekarang untuk menerapkan pembaruan.`;

      els.progressContainer.style.display = 'block';
      els.progressFill.style.width = '100%';
      els.progressPercent.textContent = '100%';
      els.progressSpeed.textContent = 'Selesai diunduh';

      els.btnSkip.style.display = 'inline-flex';
      els.btnSkip.textContent = 'Nanti Saja';
      els.btnSkip.onclick = closeUpdaterModal;

      els.btnAction.style.display = 'inline-flex';
      els.btnAction.textContent = 'Restart & Pasang Sekarang';
      els.btnAction.className = 'btn-primary btn-update-install';
      els.btnAction.onclick = () => {
        if (window.electronAPI && typeof window.electronAPI.restartToUpdate === 'function') {
          window.electronAPI.restartToUpdate();
        }
      };
    } else if (status === 'error') {
      // Error checking update
      els.iconWrapper.innerHTML = SVGS.error;
      els.iconWrapper.className = 'updater-status-icon-wrapper status-error';
      els.title.textContent = 'Tidak Dapat Memeriksa Pembaruan';
      els.desc.textContent = data.message || 'Gagal terhubung ke server pembaruan. Pastikan komputer terhubung ke internet.';

      els.btnSkip.style.display = 'none';
      els.btnAction.style.display = 'inline-flex';
      els.btnAction.textContent = 'Lanjutkan ke Aplikasi';
      els.btnAction.className = 'btn-secondary';
      els.btnAction.onclick = closeUpdaterModal;
    }
  }

  function handleUpdaterProgress(progress) {
    const els = getElements();
    if (!els.modal || !els.modal.classList.contains('active')) return;

    els.progressContainer.style.display = 'block';
    const percent = Math.min(100, Math.max(0, progress.percent || 0));
    els.progressFill.style.width = `${percent}%`;
    els.progressPercent.textContent = `${percent}%`;

    const transferredMB = (progress.transferred / 1048576).toFixed(1);
    const totalMB = (progress.total / 1048576).toFixed(1);
    const speedKB = Math.round((progress.bytesPerSecond || 0) / 1024);

    if (progress.total > 0) {
      els.progressSpeed.textContent = `${transferredMB} MB / ${totalMB} MB (${speedKB} KB/s)`;
    } else {
      els.progressSpeed.textContent = `${speedKB} KB/s`;
    }
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Cek apakah fitur auto-check diaktifkan
    const autoCheck = localStorage.getItem('auto_check_updates') !== 'false';
    if (autoCheck) {
      // Jalankan cek pembaruan saat awal buka aplikasi
      window.checkAppUpdates(false);
    }
  });
})();
