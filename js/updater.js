/**
 * Updater Manager - Marketplace CS Dashboard
 * Menangani modal cek update saat startup dan manual via settings
 */

(function () {
  let isManualCheck = false;
  let autoCloseTimer = null;
  let countdownInterval = null;
  let currentAppVersion = '1.0.11';

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
    if (manual && window.AppTelemetry) {
      window.AppTelemetry.track('updater_manual_checked');
    }
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
        if (window.AppTelemetry) {
          window.AppTelemetry.track('updater_autocheck_toggled');
        }
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
        if (window.AppTelemetry) {
          window.AppTelemetry.track('updater_restart_install_clicked');
        }
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

  // ── Version History & Rollback UI ──────────────────────────────────────────
  async function renderVersionsRollbackTab() {
    const listEl = document.getElementById('versions-release-list');
    const badgeEl = document.getElementById('current-installed-version-badge');
    const btnCheck = document.getElementById('btn-check-updates-versions-tab');
    const btnRefresh = document.getElementById('btn-refresh-releases-list');

    if (badgeEl) {
      badgeEl.textContent = `v${currentAppVersion}`;
    }

    if (btnCheck) {
      btnCheck.onclick = () => window.checkAppUpdates(true);
    }
    if (btnRefresh) {
      btnRefresh.onclick = () => renderVersionsRollbackTab();
    }

    if (!listEl) return;

    listEl.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-muted);">
        <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:8px;"></span>
        Mengambil daftar versi rilis resmi...
      </div>
    `;

    try {
      let releases = [];
      let versionTrail = null;

      if (window.electronAPI) {
        if (typeof window.electronAPI.getReleaseHistory === 'function') {
          releases = await window.electronAPI.getReleaseHistory();
        }
        if (typeof window.electronAPI.getVersionTrail === 'function') {
          versionTrail = await window.electronAPI.getVersionTrail();
        }
      }

      const prevVer = versionTrail?.previousStableVersion || localStorage.getItem('previous_stable_version');

      if (!Array.isArray(releases) || releases.length === 0) {
        listEl.innerHTML = `
          <div class="settings-card" style="text-align: center; color: var(--text-muted); padding: 20px;">
            Tidak ada riwayat rilis yang ditemukan atau gagal terhubung ke server rilis.
          </div>
        `;
        return;
      }

      listEl.innerHTML = buildReleaseCardsHtml(releases, currentAppVersion, prevVer);
    } catch (err) {
      console.error('Error rendering releases tab:', err);
      listEl.innerHTML = `
        <div class="settings-card" style="color: #f87171; text-align: center; padding: 20px;">
          Gagal memuat riwayat rilis: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  function semverCompare(v1, v2) {
    if (!v1 || !v2) return 0;
    const p1 = String(v1).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const p2 = String(v2).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  function formatReleaseNotes(notes) {
    if (!notes) return '<span style="color:var(--text-muted);">Pembaruan stabilitas sistem dan performa chat multi-marketplace.</span>';
    const lines = notes.split('\n');
    return lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s*/, '').trim();
        return `<div style="font-weight:700; color:var(--text-primary); margin:8px 0 3px 0; font-size:12px;">📌 ${escapeHtml(title)}</div>`;
      }
      if (trimmed.startsWith('- ')) {
        return `<div style="padding-left:8px; margin-bottom:2px; color:var(--text-secondary); line-height:1.4;">• ${escapeHtml(trimmed.substring(2))}</div>`;
      }
      if (!trimmed) return '<div style="height:4px;"></div>';
      return `<div>${escapeHtml(trimmed)}</div>`;
    }).join('');
  }

  function buildReleaseCardsHtml(releases, currentVer, prevVer) {
    let html = '';

    // Only recommend if previous version is strictly older than current version
    const isPrevOlder = prevVer && semverCompare(prevVer, currentVer) < 0;

    if (isPrevOlder) {
      const safePrevVer = escapeHtml(prevVer);
      html += `
        <div class="settings-card" style="border-color: rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.08); margin-bottom: 12px; padding: 12px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12.5px; font-weight: 700; color: #f59e0b;">⭐ Versi Terakhir yang Anda Gunakan: v${safePrevVer}</span>
                <span style="font-size: 10.5px; background: rgba(245, 158, 11, 0.25); color: #f59e0b; padding: 2px 7px; border-radius: 4px; font-weight: 600;">Rekomendasi Anda</span>
              </div>
              <p class="settings-hint" style="margin: 4px 0 0; font-size: 11px;">
                Versi <strong>v${safePrevVer}</strong> adalah versi stabil terakhir yang berjalan di komputer Anda sebelum pembaruan ke v${currentVer}. Cocok jika Anda melompati beberapa versi pembaruan.
              </p>
            </div>
            <button type="button" class="btn-rollback" style="padding: 7px 14px; font-size: 12px; font-weight: 700; border-color: #f59e0b; background: #f59e0b; color: #0f172a;" onclick="window.confirmAndRollback('${safePrevVer}')">
              ⚡ Rollback Cepat ke v${safePrevVer}
            </button>
          </div>
        </div>
      `;
    }

    releases.forEach((rel) => {
      const isCurrent = rel.version === currentVer;
      const isPrevUserVer = isPrevOlder && rel.version === prevVer && !isCurrent;
      const safeVer = escapeHtml(rel.version);
      const safeName = escapeHtml(rel.name || `Versi ${rel.version}`);
      const safeDate = escapeHtml(rel.publishedAt ? new Date(rel.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (rel.publishedAt || '-'));
      const safeSize = rel.fileSizeMB ? `${rel.fileSizeMB} MB` : '85 MB';
      const rawNotes = rel.releaseNotes || '';

      let cardClass = 'version-card';
      if (isCurrent) cardClass += ' is-current';
      else if (isPrevUserVer) cardClass += ' is-previous-user-version';

      html += `
        <div class="${cardClass}">
          <div class="version-card-header">
            <div class="version-card-meta">
              <span class="version-card-title">${safeName}</span>
              <span class="badge-version-pill" style="${isCurrent ? 'background:rgba(34,197,94,0.15); border-color:rgba(34,197,94,0.4); color:#22c55e;' : ''}">v${safeVer}</span>
              ${isCurrent ? '<span style="font-size:11px; font-weight:700; color:#22c55e; background:rgba(34,197,94,0.1); padding:2px 8px; border-radius:4px;">● Versi Terpasang</span>' : ''}
              ${isPrevUserVer ? '<span style="font-size:11px; font-weight:700; color:#f59e0b; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.4); padding:2px 8px; border-radius:4px;">⭐ Versi Terakhir Anda</span>' : ''}
              ${!isCurrent ? '<span style="font-size:11px; color:#94a3b8; background:var(--bg-tertiary); padding:2px 6px; border-radius:4px;">📦 ' + safeSize + '</span>' : ''}
              <span class="version-card-date">📅 ${safeDate}</span>
            </div>
            <div>
              ${!isCurrent ? `
                <button type="button" class="btn-rollback" style="${isPrevUserVer ? 'border-color:#f59e0b; background:rgba(245,158,11,0.15); font-weight:700;' : ''}" onclick="window.confirmAndRollback('${safeVer}', '${escapeHtml(rel.downloadUrl || '')}')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  ${isPrevUserVer ? `Rollback ke Versi Anda (v${safeVer}) ⚡` : `Rollback ke v${safeVer}`}
                </button>
              ` : `
                <span style="font-size: 11.5px; color: #22c55e; font-weight: 600;">✓ Versi Aktif</span>
              `}
            </div>
          </div>
          <div class="version-card-notes">${formatReleaseNotes(rawNotes)}</div>
        </div>
      `;
    });

    return html;
  }

  async function confirmAndRollback(version, downloadUrl) {
    if (!version) return;

    const confirmed = await showConfirmDialog({
      title: `Rollback ke Versi v${version}?`,
      message: `Apakah Anda yakin ingin menurunkan (rollback) aplikasi ke <strong>Versi v${escapeHtml(version)}</strong>?<br><br>` +
        `<span style="color:#22c55e; font-size:12px; font-weight:600;">🛡️ Keamanan Data:</span> Sistem akan otomatis membuat cadangan data toko dan preferensi Anda sebelum proses instalasi dimulai.<br>` +
        `<span style="color:var(--text-muted); font-size:11.5px;">Aplikasi akan mengunduh paket instalasi dan restart otomatis.</span>`,
      type: 'warning',
      icon: '⬇️',
      confirmText: `Ya, Rollback ke v${version}`,
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    // 1. Freeze auto-update sementara untuk versi baru agar tidak langsung loop update
    try {
      localStorage.setItem('skip_update_target', currentAppVersion);
    } catch (e) {}

    // 2. Tampilkan progress card
    const card = document.getElementById('rollback-progress-card');
    const titleEl = document.getElementById('rollback-progress-title');
    const descEl = document.getElementById('rollback-progress-desc');
    const fillEl = document.getElementById('rollback-progress-bar-fill');
    const statusTextEl = document.getElementById('rollback-progress-status-text');

    if (card) card.style.display = 'block';
    if (titleEl) titleEl.textContent = `Mengunduh Installer Rollback v${version}...`;
    if (descEl) descEl.textContent = 'Menyiapkan snapshot database lokal dan mengunduh paket instalasi...';
    if (fillEl) fillEl.style.width = '10%';
    if (statusTextEl) statusTextEl.textContent = 'Memulai unduhan...';

    if (window.AppTelemetry) {
      window.AppTelemetry.track('version_rollback_initiated');
    }

    try {
      if (window.electronAPI && typeof window.electronAPI.startVersionRollback === 'function') {
        const res = await window.electronAPI.startVersionRollback({ version, downloadUrl });
        if (res && !res.success) {
          showToast('Gagal memulai rollback: ' + (res.error || 'Unknown error'), 'error');
          if (card) card.style.display = 'none';
        }
      }
    } catch (err) {
      showToast('Gagal melakukan rollback: ' + err.message, 'error');
      if (card) card.style.display = 'none';
    }
  }

  window.renderVersionsRollbackTab = renderVersionsRollbackTab;
  window.confirmAndRollback = confirmAndRollback;

  // ── Standalone Emergency Rollback Modal & Global Hotkey ───────────────────
  async function openEmergencyRollbackModal() {
    const overlay = document.getElementById('rollback-modal-overlay');
    const badge = document.getElementById('emergency-current-version-badge');
    if (badge) badge.textContent = `v${currentAppVersion}`;

    if (overlay) {
      overlay.classList.add('active');
    }
    await renderEmergencyReleasesList();
  }

  function closeEmergencyRollbackModal() {
    const overlay = document.getElementById('rollback-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  async function renderEmergencyReleasesList() {
    const listEl = document.getElementById('emergency-versions-list');
    if (!listEl) return;

    listEl.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-muted);">
        <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:8px;"></span>
        Memuat riwayat rilis resmi...
      </div>
    `;

    try {
      let releases = [];
      let versionTrail = null;

      if (window.electronAPI) {
        if (typeof window.electronAPI.getReleaseHistory === 'function') {
          releases = await window.electronAPI.getReleaseHistory();
        }
        if (typeof window.electronAPI.getVersionTrail === 'function') {
          versionTrail = await window.electronAPI.getVersionTrail();
        }
      }

      const prevVer = versionTrail?.previousStableVersion || localStorage.getItem('previous_stable_version');

      if (!Array.isArray(releases) || releases.length === 0) {
        listEl.innerHTML = `
          <div class="settings-card" style="text-align: center; color: var(--text-muted); padding: 20px;">
            Tidak ada riwayat versi yang ditemukan.
          </div>
        `;
        return;
      }

      listEl.innerHTML = buildReleaseCardsHtml(releases, currentAppVersion, prevVer);
    } catch (err) {
      listEl.innerHTML = `
        <div class="settings-card" style="color: #f87171; text-align: center; padding: 20px;">
          Gagal memuat riwayat rilis: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  window.openEmergencyRollbackModal = openEmergencyRollbackModal;
  window.closeEmergencyRollbackModal = closeEmergencyRollbackModal;
  window.renderEmergencyReleasesList = renderEmergencyReleasesList;

  // Listen to rollback progress from main process
  if (window.electronAPI && typeof window.electronAPI.onRollbackProgress === 'function') {
    window.electronAPI.onRollbackProgress((progress) => {
      // Update both settings tab card and emergency modal card
      const cards = [
        {
          card: document.getElementById('rollback-progress-card'),
          title: document.getElementById('rollback-progress-title'),
          desc: document.getElementById('rollback-progress-desc'),
          fill: document.getElementById('rollback-progress-bar-fill'),
          status: document.getElementById('rollback-progress-status-text'),
          bytes: document.getElementById('rollback-progress-bytes')
        },
        {
          card: document.getElementById('emergency-rollback-progress-card'),
          title: document.getElementById('emergency-progress-title'),
          desc: document.getElementById('emergency-progress-desc'),
          fill: document.getElementById('emergency-progress-bar-fill'),
          status: document.getElementById('emergency-progress-status-text'),
          bytes: document.getElementById('emergency-progress-bytes')
        }
      ];

      cards.forEach(c => {
        if (!c.card) return;
        c.card.style.display = 'block';
        const pct = Math.min(100, Math.max(0, progress.percent || 0));
        if (c.fill) c.fill.style.width = `${pct}%`;
        if (c.status) c.status.textContent = progress.message || `Mengunduh... ${pct}%`;

        if (progress.totalBytes > 0 && c.bytes) {
          const transferredMB = ((progress.transferredBytes || 0) / 1048576).toFixed(1);
          const totalMB = (progress.totalBytes / 1048576).toFixed(1);
          c.bytes.textContent = `${transferredMB} MB / ${totalMB} MB`;
        }

        if (progress.status === 'ready') {
          if (c.title) c.title.textContent = 'Installer Siap Dipasang! 🎉';
          if (c.desc) c.desc.textContent = progress.message || 'Membuka installer dan me-restart aplikasi...';
        } else if (progress.status === 'error') {
          if (c.title) c.title.textContent = 'Gagal Mengunduh';
          if (c.desc) c.desc.textContent = progress.message || 'Terjadi kesalahan saat mengunduh.';
        }
      });

      if (progress.status === 'ready') {
        showToast('Installer siap. Memulai instalasi versi rollback...', 'success');
      }
    });
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Emergency Rollback triggers
    document.getElementById('btn-titlebar-rollback')?.addEventListener('click', openEmergencyRollbackModal);
    document.getElementById('link-emergency-rollback')?.addEventListener('click', (e) => {
      e.preventDefault();
      openEmergencyRollbackModal();
    });
    document.getElementById('btn-rollback-modal-close')?.addEventListener('click', closeEmergencyRollbackModal);
    document.getElementById('btn-emergency-modal-close-footer')?.addEventListener('click', closeEmergencyRollbackModal);
    document.getElementById('btn-emergency-refresh-releases')?.addEventListener('click', renderEmergencyReleasesList);

    // Modal background click
    const rollbackOverlay = document.getElementById('rollback-modal-overlay');
    rollbackOverlay?.addEventListener('click', (e) => {
      if (e.target === rollbackOverlay) closeEmergencyRollbackModal();
    });

    // Global Emergency Shortcut (Ctrl+Alt+R or Ctrl+Shift+R)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        openEmergencyRollbackModal();
      }
    });

    const autoCheck = localStorage.getItem('auto_check_updates') !== 'false';
    const skipTarget = localStorage.getItem('skip_update_target');
    if (autoCheck && !skipTarget) {
      window.checkAppUpdates(false);
    }
  });
})();
