// ── Bind All Events ───────────────────────────────────────────────────────────
function bindEvents() {
  // Window controls
  document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.windowMinimize());
  document.getElementById('btn-maximize').addEventListener('click', () => window.electronAPI.windowMaximize());
  document.getElementById('btn-close').addEventListener('click', async () => {
    if (window.AppTelemetry) {
      try {
        await window.AppTelemetry.flush(true);
      } catch (e) {}
    }
    window.electronAPI.windowClose();
  });

  // Sidebar collapse
  document.getElementById('btn-collapse-sidebar').addEventListener('click', toggleSidebar);

  // Add store buttons
  document.getElementById('btn-add-store').addEventListener('click', openAddModal);
  document.getElementById('btn-add-store-empty').addEventListener('click', openAddModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  // Search
  searchInput.addEventListener('input', debounce(() => renderSidebar(getFilteredStores()), 300));

  // Marketplace picker
  document.querySelectorAll('.mp-option').forEach(el => {
    const handleSelect = () => {
      const val = el.dataset.value;
      setSelectedMarketplace(val);
      customUrlGroup.style.display = val === 'custom' ? 'flex' : 'none';
    };
    el.addEventListener('click', handleSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });

  // Color picker events
  document.querySelectorAll('.color-preset').forEach(el => {
    const handleSelect = () => {
      document.querySelectorAll('.color-preset').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      el.classList.add('active');
      el.setAttribute('aria-checked', 'true');
    };
    el.addEventListener('click', handleSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });

  fieldStoreColor.addEventListener('input', () => {
    document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
  });

  // Custom URL input
  fieldStoreUrl.addEventListener('input', () => updateUrlPreview('custom', fieldStoreUrl.value));

  // Store name — Enter to save
  fieldStoreName.addEventListener('keydown', e => { if (e.key === 'Enter') saveStore(); });

  // Modal close / save
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-modal-save').addEventListener('click', saveStore);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // WhatsApp Sync Education Modal
  const waSyncModal = document.getElementById('wa-sync-modal');
  document.getElementById('btn-wa-sync-close')?.addEventListener('click', closeWaSyncEduModal);
  document.getElementById('btn-wa-sync-understand')?.addEventListener('click', closeWaSyncEduModal);
  waSyncModal?.addEventListener('click', e => { if (e.target === waSyncModal) closeWaSyncEduModal(); });

  // Settings modal
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsOverlay.classList.remove('active');
  });
  settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('active');
  });
  document.getElementById('btn-settings-add').addEventListener('click', () => {
    settingsOverlay.classList.remove('active');
    openAddModal();
  });

  // Set current user display in settings
  const settingsCurrentUser = document.getElementById('settings-current-user');
  if (settingsCurrentUser && window.currentUser) {
    settingsCurrentUser.textContent = window.currentUser;
  }

  // Settings Tabs switching
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.settings-tab-pane').forEach(p => {
        p.style.display = (p.id === `settings-pane-${tabName}`) ? 'flex' : 'none';
      });
      const storesFooter = document.getElementById('settings-stores-footer');
      if (storesFooter) {
        storesFooter.style.display = (tabName === 'stores') ? 'flex' : 'none';
      }
      if (tabName === 'cache') {
        if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
        if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
          window.OnboardingManager.notifyAction('open_settings_cache');
        }
      }
    });
  });

  // Refresh cache size button
  document.getElementById('btn-refresh-cache-size')?.addEventListener('click', () => {
    if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
  });

  // Opsi 1: Clear Safe Cache Global (Hanya partisi user aktif)
  document.getElementById('btn-clear-safe-cache')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear-safe-cache');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 13px; height: 13px; border-width: 2px;"></span> Membersihkan...';

    try {
      const res = await window.electronAPI.clearSafeCache(window.currentUser);
      if (res && res.success) {
        showToast(res.message || 'Cache aman berhasil dibersihkan ✓ (Sesi Toko Aman)', 'success');
        if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
      } else {
        showToast('Gagal membersihkan cache: ' + (res?.error || ''), 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan saat membersihkan cache: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });

  // Opsi 3 Global: Deep Clean All (Reset Total Sesi Toko Pengguna Ini)
  document.getElementById('btn-deep-clean-all')?.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog({
      title: 'Reset Total Semua Sesi Toko',
      message: '<strong>⚠️ PERINGATAN:</strong> Seluruh cache, cookies, dan data sesi login pada <strong>semua marketplace akun ini</strong> akan dihapus total.<br><br>Anda harus login ulang ke semua toko Anda. Sesi akun pengguna lain tidak akan terpengaruh.<br><br>Apakah Anda benar-benar yakin ingin melanjutkan?',
      type: 'critical',
      icon: '🚨',
      confirmText: 'Reset Total Sesi',
      cancelText: 'Batal',
      requireText: 'RESET'
    });
    if (!confirmed) return;

    const btn = document.getElementById('btn-deep-clean-all');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 13px; height: 13px; border-width: 2px;"></span> Mereset...';

    try {
      const res = await window.electronAPI.deepCleanAll(window.currentUser);
      if (res && res.success) {
        showToast('Seluruh sesi toko akun ini berhasil di-reset total.', 'success');
        // Reload all webviews
        for (const entry of Object.values(webviewMap)) {
          if (entry.webview) {
            try { entry.webview.reloadIgnoringCache(); } catch (e) {}
          }
        }
        if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
      } else {
        showToast('Gagal reset: ' + (res?.error || ''), 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan saat reset: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });



  // Change PIN
  document.getElementById('btn-change-password')?.addEventListener('click', async () => {
    const currentPwd    = document.getElementById('acc-current-password').value;
    const newPwd        = document.getElementById('acc-new-password').value;
    const newPwdConfirm = document.getElementById('acc-new-password-confirm').value;

    if (!currentPwd || !newPwd || !newPwdConfirm) {
      showToast('Harap isi semua kolom PIN', 'error'); return;
    }
    if (newPwd !== newPwdConfirm) {
      showToast('PIN baru dan konfirmasi tidak cocok', 'error'); return;
    }

    const btn = document.getElementById('btn-change-password');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const res = await window.electronAPI.changePassword({
        username: window.currentUser,
        currentPassword: currentPwd,
        newPassword: newPwd
      });
      if (res.success) {
        showToast('PIN berhasil diubah!', 'success');
        document.getElementById('acc-current-password').value = '';
        document.getElementById('acc-new-password').value = '';
        document.getElementById('acc-new-password-confirm').value = '';
      } else {
        showToast(res.error || 'Gagal mengubah PIN', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Simpan PIN Baru';
    }
  });

  // Save security question
  document.getElementById('btn-save-security-question')?.addEventListener('click', async () => {
    const question = document.getElementById('acc-security-question').value;
    const answer = document.getElementById('acc-security-answer').value.trim();
    const pin = document.getElementById('acc-pin-for-security').value;

    if (!question || !answer || !pin) {
      showToast('Harap isi semua kolom pertanyaan keamanan', 'error'); return;
    }

    const btn = document.getElementById('btn-save-security-question');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
    try {
      const res = await window.electronAPI.updateSecurityQuestion({
        username: window.currentUser,
        password: pin,
        securityQuestion: question,
        securityAnswer: answer
      });
      if (res.success) {
        showToast('Pertanyaan keamanan berhasil disimpan!', 'success');
        document.getElementById('acc-security-answer').value = '';
        document.getElementById('acc-pin-for-security').value = '';
      } else {
        showToast(res.error || 'Gagal menyimpan', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Pertanyaan Keamanan';
    }
  });

  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', logoutUser);

  // Theme toggle
  btnThemeToggle?.addEventListener('click', toggleTheme);
}

// ── Logout Logic ────────────────────────────────────────────────────────────
async function logoutUser() {
  const confirmed = await showConfirmDialog({
    title: 'Konfirmasi Keluar Akun',
    message: `Apakah Anda yakin ingin keluar dari akun <strong>${escapeHtml(window.currentUser || 'ini')}</strong>?`,
    type: 'warning',
    icon: '🚪',
    confirmText: 'Keluar',
    cancelText: 'Batal',
    confirmBtnClass: 'btn-warning'
  });
  if (!confirmed) return;

  // Flush telemetri sesi sebelum logout
  if (window.AppTelemetry) {
    try {
      await window.AppTelemetry.flush(true);
    } catch (e) {}
  }

  // 1. Hentikan semua interval background agar memori dan CPU bersih
  if (typeof stopStatusBarTimer === 'function') stopStatusBarTimer();
  if (typeof stopStaggeredBackgroundPing === 'function') stopStaggeredBackgroundPing();
  if (ramCheckInterval) {
    clearInterval(ramCheckInterval);
    ramCheckInterval = null;
  }

  // 2. Tutup semua modal jika terbuka
  settingsOverlay?.classList.remove('active');
  modalOverlay?.classList.remove('active');

  // 3. Bersihkan dan lepaskan semua webview aktif dari DOM & reset memory state
  Object.keys(webviewMap).forEach(tabId => {
    webviewMap[tabId]?.webview?.remove();
    webviewMap[tabId]?.loading?.remove();
    delete webviewMap[tabId];
  });
  Object.keys(storeTabs).forEach(sid => delete storeTabs[sid]);
  Object.keys(activeTabMap).forEach(sid => delete activeTabMap[sid]);
  Object.keys(unreadMap).forEach(sid => delete unreadMap[sid]);
  Object.keys(lastAccessed).forEach(k => delete lastAccessed[k]);
  activeStoreId = null;
  stores = [];
  editingStoreId = null;

  // Bersihkan data state modul lain agar tidak bocor ke user berikutnya
  if (typeof customerNotes !== 'undefined') customerNotes = [];
  if (typeof smartTemplates !== 'undefined') smartTemplates = [];
  if (typeof clipboardHistory !== 'undefined') clipboardHistory = [];
  if (typeof scratchpadTabs !== 'undefined') scratchpadTabs = [];
  if (typeof activeScratchpadTabId !== 'undefined') activeScratchpadTabId = null;
  if (typeof editingNoteId !== 'undefined') editingNoteId = null;
  if (typeof editingTemplateId !== 'undefined') editingTemplateId = null;
  currentClipboardValue = '';
  window.currentClipboardValue = '';

  // 4. Reset UI containers
  if (tabBar) tabBar.style.display = 'none';
  if (webviewCont) webviewCont.classList.remove('active');
  if (emptyState) emptyState.style.display = 'flex';
  if (sidebarContent) sidebarContent.innerHTML = '';
  if (searchInput) searchInput.value = '';

  // 5. Sembunyikan scratchpad & onboarding jika terbuka
  if (scratchpadWindow) scratchpadWindow.style.display = 'none';
  document.getElementById('onboarding-welcome-modal-overlay')?.classList.remove('active');
  document.getElementById('onboarding-tour-overlay')?.classList.remove('active');
  document.getElementById('onboarding-checklist-widget')?.classList.add('hidden');

  // 6. Sembunyikan dashboard dan tampilkan login screen
  const appLayout = document.getElementById('app-layout');
  const loginLayout = document.getElementById('login-layout');
  if (appLayout) appLayout.style.display = 'none';
  if (loginLayout) loginLayout.style.display = 'flex';

  const prevUser = window.currentUser;
  window.currentUser = null;

  // 7. Inisialisasi ulang form login
  if (typeof window.initLoginScreen === 'function') {
    window.initLoginScreen();
  }

  showToast(`Pengguna "${prevUser || ''}" berhasil keluar.`, 'success');
}

// ── Theme Logic ─────────────────────────────────────────────────────────────
function updateThemeUI() {
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (!toggleBtn) return;

  if (currentTheme === 'light') {
    toggleBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
    toggleBtn.title = 'Tema Terang (Klik untuk Ganti ke Tema Gelap)';
    toggleBtn.setAttribute('aria-label', 'Tema Terang (Klik untuk Ganti ke Tema Gelap)');
  } else {
    toggleBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    toggleBtn.title = 'Tema Gelap (Klik untuk Ganti ke Tema Terang)';
    toggleBtn.setAttribute('aria-label', 'Tema Gelap (Klik untuk Ganti ke Tema Terang)');
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  Storage.set('theme', currentTheme, !!window.currentUser);
  updateThemeUI();
  if (typeof broadcastTemplatesToWebviews === 'function') {
    broadcastTemplatesToWebviews();
  }
}

// ── Global helpers (untuk onclick inline di html) ─────────────────────────
window.openEditModal = openEditModal;
window.deleteStore   = deleteStore;
window.retryTab      = retryTab;
window.logoutUser    = logoutUser;
window.updateThemeUI = updateThemeUI;

let isEventsBound = false;
let ramCheckInterval = null;

// ── Init ─────────────────────────────────────────────────────────────────────
window.initApp = async function() {
  // Apply initial theme based on user
  if (window.currentUser) {
    const savedTheme = Storage.get('theme', null, true);
    if (savedTheme) currentTheme = savedTheme;
  }
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeUI();

  appPath = await window.electronAPI.getAppPath();
  stores  = await window.electronAPI.getStores(window.currentUser);
  renderSidebar(getFilteredStores());
  
  if (!isEventsBound) {
    bindEvents();
    isEventsBound = true;
  }
  
  // Reload scratchpad for current user
  if (typeof loadScratchpadState === 'function') {
    loadScratchpadState();
    if (scratchpadWindow && scratchpadWindow.style.display !== 'none') {
      renderScratchpadTabs();
      const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
      if (currentTab) spTextarea.value = currentTab.content;
    }
  }

  // Inisialisasi Smart Quick Reply Events & Templates
  if (typeof bindQuickReplyEvents === 'function') {
    bindQuickReplyEvents();
  }

  // Sinkronisasi templates, tema, clipboard, & riwayat ke semua webview saat start
  if (typeof broadcastTemplatesToWebviews === 'function') {
    broadcastTemplatesToWebviews();
  }

  // Inisialisasi CS Toolkit (Cek Resi, Kalkulator, Catatan Pembeli)
  if (typeof bindToolsEvents === 'function') {
    bindToolsEvents();
  }

  // Mulai statusbar timer jika belum aktif
  if (typeof startStatusBarTimer === 'function') {
    startStatusBarTimer();
  }

  // Mulai monitor RAM dan hibernate otomatis (hanya 1 interval)
  if (!ramCheckInterval) {
    ramCheckInterval = setInterval(checkAndHibernateIfNeeded, RAM_CHECK_INTERVAL_MS);
  }
  checkAndHibernateIfNeeded(); // langsung cek pertama kali

  // Mulai background ping berkala untuk toko yang dihibernasi
  if (typeof startStaggeredBackgroundPing === 'function') {
    startStaggeredBackgroundPing();
  }

  // Inisialisasi Onboarding & Interactive Tour Guide (v1.0.5)
  if (window.OnboardingManager && typeof window.OnboardingManager.init === 'function') {
    window.OnboardingManager.init();
  }
};

// Inisialisasi awal icon tema
updateThemeUI();
