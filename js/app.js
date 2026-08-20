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
  document.getElementById('btn-settings')?.addEventListener('click', openSettings);

  // Search with debounce
  searchInput.addEventListener('input', debounce(() => renderSidebar(getFilteredStores()), 180));

  // Marketplace picker
  document.querySelectorAll('.mp-option').forEach(el => {
    const handleSelect = () => {
      const val = el.dataset.value;
      setSelectedMarketplace(val);
      if (val === 'custom') {
        customUrlGroup.style.display = 'flex';
        setTimeout(() => fieldStoreUrl.focus(), 100);
      } else {
        customUrlGroup.style.display = 'none';
        clearCustomUrlSearch();
      }
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

  // Custom URL Smart Search input
  fieldStoreUrl.addEventListener('input', handleCustomUrlInput);
  fieldStoreUrl.addEventListener('focus', () => {
    if (fieldStoreUrl.value.trim() && (!customResultsList.innerHTML || customUrlResults.style.display === 'none')) {
      handleCustomUrlInput();
    }
  });
  fieldStoreUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = fieldStoreUrl.value.trim();
      if (val) {
        performCustomUrlSearch(val, false);
      } else {
        saveStore();
      }
    }
  });

  // Clear URL button
  btnClearUrl?.addEventListener('click', () => {
    fieldStoreUrl.value = '';
    clearCustomUrlSearch();
    updateUrlPreview('custom', '');
    fieldStoreUrl.focus();
  });

  // Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.name;
      const initials = chip.dataset.initials;
      const url = chip.dataset.url;
      const query = chip.dataset.query || name;

      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      if (url) {
        let domain = '';
        try {
          domain = new URL(url).hostname;
        } catch (e) {
          domain = url;
        }
        selectCustomUrl({
          title: name,
          url: url,
          domain: domain,
          snippet: `Rekomendasi resmi ${name}`,
          isPreset: true
        });
        if (name && (!fieldStoreName.value.trim() || fieldStoreName.value.trim() === 'Custom')) {
          fieldStoreName.value = name;
        }
        if (initials && (!fieldStoreInitials.value.trim() || fieldStoreInitials.value.trim() === 'CU')) {
          fieldStoreInitials.value = initials;
        }
      } else if (query) {
        fieldStoreUrl.value = query;
        performCustomUrlSearch(query, true);
      }
    });
  });

  // Store name — Enter to save
  fieldStoreName.addEventListener('keydown', e => { if (e.key === 'Enter') saveStore(); });
  fieldStoreInitials.addEventListener('keydown', e => { if (e.key === 'Enter') saveStore(); });

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
      if (tabName === 'account') {
        if (typeof renderSettingsAccountTab === 'function') renderSettingsAccountTab();
      }
      if (tabName === 'superadmin') {
        if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
      }
      if (tabName === 'cache') {
        if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
        if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
          window.OnboardingManager.notifyAction('open_settings_cache');
        }
      }
    });
  });

  // Smooth mousewheel horizontal scroll on settings tabs
  const settingsNavTabs = document.querySelector('.settings-nav-tabs');
  settingsNavTabs?.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      settingsNavTabs.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Refresh cache size button
  document.getElementById('btn-refresh-cache-size')?.addEventListener('click', () => {
    if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
  });

  // Sidebar User Popover Menu toggling
  const userPopover = document.getElementById('user-popover-menu');
  const userCard = document.getElementById('sidebar-user-card');

  userCard?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!userPopover) return;
    const isActive = userPopover.classList.contains('active');
    if (!isActive) {
      const rect = userCard.getBoundingClientRect();
      userPopover.style.position = 'fixed';
      userPopover.style.bottom = `${Math.max(12, window.innerHeight - rect.top + 8)}px`;
      userPopover.style.left = `${Math.max(8, rect.left)}px`;
      userPopover.classList.add('active');
    } else {
      userPopover.classList.remove('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (userPopover && userPopover.classList.contains('active')) {
      if (!userPopover.contains(e.target) && !userCard?.contains(e.target)) {
        userPopover.classList.remove('active');
      }
    }
  });

  // Popover Menu Items
  document.getElementById('popover-btn-lock')?.addEventListener('click', () => {
    userPopover?.classList.remove('active');
    lockScreen();
  });

  document.getElementById('popover-btn-account')?.addEventListener('click', () => {
    userPopover?.classList.remove('active');
    openSettings('account');
  });

  document.getElementById('popover-btn-logout')?.addEventListener('click', () => {
    userPopover?.classList.remove('active');
    logoutUser();
  });

  // Quick Lock Button in Titlebar
  document.getElementById('btn-quick-lock')?.addEventListener('click', () => {
    lockScreen();
  });

  // Lock Screen Unlock form
  document.getElementById('lockscreen-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwdField = document.getElementById('lockscreen-password');
    const pin = pwdField ? pwdField.value : '';
    const unlockBtn = document.getElementById('btn-lockscreen-unlock');
    const card = document.getElementById('lockscreen-card');

    if (!pin) return;

    unlockBtn.disabled = true;
    unlockBtn.textContent = 'Membuka...';

    try {
      const res = await window.electronAPI.verifyUserPin({
        username: window.currentUser,
        password: pin
      });

      if (res && res.success) {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('screen_unlocked');
        }
        unlockScreen();
        showToast(`Selamat datang kembali, ${escapeHtml(window.currentUserProfile?.displayName || window.currentUser)}!`, 'success');
      } else {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('screen_unlock_failed');
        }
        card?.classList.remove('shake');
        void card?.offsetWidth; // trigger reflow
        card?.classList.add('shake');
        showToast('PIN salah!', 'error');
        if (pwdField) {
          pwdField.value = '';
          pwdField.focus();
        }
      }
    } catch (err) {
      showToast('Gagal memverifikasi PIN: ' + err.message, 'error');
    } finally {
      unlockBtn.disabled = false;
      unlockBtn.textContent = 'Buka Kunci';
    }
  });

  // Lock screen switch user
  document.getElementById('btn-lockscreen-switch')?.addEventListener('click', () => {
    unlockScreen();
    logoutUser();
  });

  // Save Profile CS
  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const displayName = document.getElementById('acc-display-name')?.value.trim();
    const btn = document.getElementById('btn-save-profile');

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const res = await window.electronAPI.updateUserProfile({
        username: window.currentUser,
        displayName: displayName || window.currentUser,
        avatarColor: typeof selectedAccColor !== 'undefined' ? selectedAccColor : '#df1683',
        avatarIcon: typeof selectedAccIcon !== 'undefined' ? selectedAccIcon : '👩‍💼'
      });

      if (res && res.success) {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('user_profile_updated');
        }
        window.currentUserProfile = res.user;
        updateSidebarUserProfile(res.user);
        showToast('Profil CS berhasil diperbarui!', 'success');
        if (typeof renderUsersManagementList === 'function') renderUsersManagementList();
      } else {
        showToast(res?.error || 'Gagal memperbarui profil', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Profil CS';
    }
  });

  // Save Auto-Lock settings
  document.getElementById('btn-save-autolock')?.addEventListener('click', async () => {
    const minutes = parseInt(document.getElementById('acc-autolock-select')?.value, 10) || 0;
    const btn = document.getElementById('btn-save-autolock');

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const res = await window.electronAPI.updateUserProfile({
        username: window.currentUser,
        autoLockMinutes: minutes
      });

      if (res && res.success) {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('autolock_duration_changed');
        }
        if (window.currentUserProfile) window.currentUserProfile.autoLockMinutes = minutes;
        setupAutoLockTimer();
        const msg = minutes > 0 ? `Kunci otomatis diset ${minutes} menit tidak aktif.` : 'Kunci otomatis dinonaktifkan.';
        showToast(msg, 'success');
      } else {
        showToast(res?.error || 'Gagal menyimpan pengaturan', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Pengaturan Kunci Otomatis';
    }
  });

  // Add User / Super Admin from Super Admin Panel
  const handleAddUserFromAdmin = () => {
    if (typeof openAdminCreateUserModal === 'function') {
      openAdminCreateUserModal();
    }
  };

  document.getElementById('btn-superadmin-add-user')?.addEventListener('click', handleAddUserFromAdmin);

  // Refresh Super Admin Audit
  document.getElementById('btn-superadmin-refresh')?.addEventListener('click', () => {
    if (typeof renderSuperAdminPanel === 'function') renderSuperAdminPanel();
  });

  // Password Visibility Toggles
  if (typeof initPasswordToggles === 'function') {
    initPasswordToggles();
  }

  // Opsi 1: Clear Safe Cache Global (Hanya partisi user aktif)
  document.getElementById('btn-clear-safe-cache')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear-safe-cache');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 13px; height: 13px; border-width: 2px;"></span> Membersihkan...';

    try {
      const res = await window.electronAPI.clearSafeCache(window.currentUser);
      if (res && res.success) {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('cache_safe_cleared');
        }
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
        if (window.AppTelemetry) {
          window.AppTelemetry.track('all_deep_cleaned');
        }
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
        if (window.AppTelemetry) {
          window.AppTelemetry.track('user_pin_changed');
        }
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
        if (window.AppTelemetry) {
          window.AppTelemetry.track('user_sec_question_updated');
        }
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
  document.getElementById('btn-logout')?.addEventListener('click', () => logoutUser(true));

  // Theme toggle
  btnThemeToggle?.addEventListener('click', toggleTheme);
}

// ── Sidebar User Profile Rendering ──────────────────────────────────────────
function updateSidebarUserProfile(profile) {
  const p = profile || window.currentUserProfile || {
    username: window.currentUser,
    displayName: window.currentUser,
    role: 'Customer Service',
    avatarColor: '#df1683',
    avatarIcon: '👩‍💼'
  };

  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  const popoverName = document.getElementById('popover-user-name');
  const popoverRole = document.getElementById('popover-user-role');

  const isSuperAdmin = !!(p.isSuperAdmin || p.role === 'Super Admin' || p.username === 'superadmin');
  const color = p.avatarColor || (isSuperAdmin ? '#e11d48' : '#df1683');
  const icon  = p.avatarIcon || (isSuperAdmin ? '👑' : '👩‍💼');
  const name  = p.displayName || p.username || 'Pengguna';
  const role  = isSuperAdmin ? '👑 Super Admin' : (p.role || 'Customer Service');

  if (avatarEl) {
    avatarEl.style.backgroundColor = color;
    avatarEl.textContent = icon;
  }
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
  if (popoverName) popoverName.textContent = name;
  if (popoverRole) popoverRole.textContent = role;
}
window.updateSidebarUserProfile = updateSidebarUserProfile;

// ── Lock Screen Logic ───────────────────────────────────────────────────────
let isScreenLocked = false;

function lockScreen(isAuto = false) {
  if (!window.currentUser || isScreenLocked) return;
  isScreenLocked = true;

  if (window.AppTelemetry) {
    window.AppTelemetry.track(isAuto ? 'auto_lock_triggered' : 'quick_lock_triggered');
  }

  const overlay = document.getElementById('lockscreen-overlay');
  const avatarEl = document.getElementById('lockscreen-avatar');
  const nameEl   = document.getElementById('lockscreen-user-name');
  const roleEl   = document.getElementById('lockscreen-user-role');
  const pwdField = document.getElementById('lockscreen-password');

  const p = window.currentUserProfile || {
    username: window.currentUser,
    displayName: window.currentUser,
    role: 'Customer Service',
    avatarColor: '#df1683',
    avatarIcon: '👩‍💼'
  };

  const isSuperAdmin = !!(p.isSuperAdmin || p.role === 'Super Admin' || p.username === 'superadmin');

  if (avatarEl) {
    avatarEl.style.backgroundColor = p.avatarColor || (isSuperAdmin ? '#e11d48' : '#df1683');
    avatarEl.textContent = p.avatarIcon || (isSuperAdmin ? '👑' : '👩‍💼');
  }
  if (nameEl) nameEl.textContent = p.displayName || p.username || 'Pengguna';
  if (roleEl) roleEl.textContent = `${isSuperAdmin ? '👑 Super Admin' : (p.role || 'CS')} · Layar Terkunci`;

  if (pwdField) {
    pwdField.value = '';
    pwdField.type = 'password';
  }

  // Close popover and settings if open
  document.getElementById('user-popover-menu')?.classList.remove('active');
  settingsOverlay?.classList.remove('active');

  overlay?.classList.add('active');
  setTimeout(() => pwdField?.focus(), 150);
}

function unlockScreen() {
  isScreenLocked = false;
  const overlay = document.getElementById('lockscreen-overlay');
  overlay?.classList.remove('active');
  const pwdField = document.getElementById('lockscreen-password');
  if (pwdField) pwdField.value = '';
  resetInactivityTimer();
}

window.lockScreen   = lockScreen;
window.unlockScreen = unlockScreen;

// ── Auto-Lock Inactivity Timer ──────────────────────────────────────────────
let autoLockTimeoutId = null;
let lastActivityTimestamp = Date.now();

function resetInactivityTimer() {
  lastActivityTimestamp = Date.now();
}

function setupAutoLockTimer() {
  if (autoLockTimeoutId) {
    clearInterval(autoLockTimeoutId);
    autoLockTimeoutId = null;
  }

  const minutes = window.currentUserProfile?.autoLockMinutes || 0;
  if (minutes <= 0) return;

  const intervalMs = 15000; // Cek setiap 15 detik
  const timeoutMs = minutes * 60 * 1000;

  autoLockTimeoutId = setInterval(() => {
    if (isScreenLocked || !window.currentUser) return;
    const elapsed = Date.now() - lastActivityTimestamp;
    if (elapsed >= timeoutMs) {
      lockScreen(true);
    }
  }, intervalMs);
}
window.setupAutoLockTimer = setupAutoLockTimer;

['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(evt => {
  window.addEventListener(evt, resetInactivityTimer, { passive: true });
});

// ── Logout Logic ────────────────────────────────────────────────────────────
async function logoutUser(askConfirmation = true) {
  if (askConfirmation) {
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
  }

  // Flush telemetri sesi sebelum logout
  if (window.AppTelemetry) {
    try {
      window.AppTelemetry.track('user_logged_out');
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
  if (sidebarContent) {
    sidebarContent.innerHTML = '';
    delete sidebarContent.dataset.lastHtml;
    delete sidebarContent.dataset.lastUser;
  }
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

  if (window.electronAPI && typeof window.electronAPI.logoutUser === 'function') {
    try {
      await window.electronAPI.logoutUser();
    } catch (e) {}
  }

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
  if (window.AppTelemetry) {
    window.AppTelemetry.track('theme_toggled');
  }
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

  // Load and render user profile
  if (window.currentUser) {
    try {
      const pRes = await window.electronAPI.getUserProfile(window.currentUser);
      if (pRes && pRes.success && pRes.user) {
        window.currentUserProfile = pRes.user;
      }
    } catch (e) {
      console.error('Error loading user profile:', e);
    }
    updateSidebarUserProfile(window.currentUserProfile);
    setupAutoLockTimer();
  }

  appPath = await window.electronAPI.getAppPath();
  stores  = await window.electronAPI.getStores(window.currentUser);
  if (sidebarContent) {
    delete sidebarContent.dataset.lastHtml;
    delete sidebarContent.dataset.lastUser;
  }
  renderSidebar(getFilteredStores());
  
  if (!isEventsBound) {
    bindEvents();
    isEventsBound = true;
  }

  if (typeof initPasswordToggles === 'function') {
    initPasswordToggles();
  }
  
  // Auto-restore last active store & multi-tab state
  const savedLastStoreId = Storage.get('lastActiveStoreId', null, true);
  const targetStore = (savedLastStoreId && stores.find(s => s.id === savedLastStoreId)) || (stores.length > 0 ? stores[0] : null);
  if (targetStore && typeof activateStore === 'function') {
    activateStore(targetStore.id);
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

  // Inisialisasi CS Toolkit (Catatan Pembeli & Speed Dial FAB)
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

  // Inisialisasi Onboarding & Interactive Tour Guide (v1.0.6)
  if (window.OnboardingManager && typeof window.OnboardingManager.init === 'function') {
    window.OnboardingManager.init();
  }

  // Setup Lifecycle Pemulihan Fokus, Visibilitas, & Anti-Blank Crash Guard (v1.0.10)
  setupFocusAndCrashRecoveryLifecycle();
};

// ── Focus, Visibility & Crash Recovery Lifecycle (Anti-Blank Guard) ─────────
let isRecoveryLifecycleBound = false;
function setupFocusAndCrashRecoveryLifecycle() {
  if (isRecoveryLifecycleBound) return;
  isRecoveryLifecycleBound = true;

  const checkActiveTabHealth = () => {
    if (!activeStoreId) return;
    const store = stores.find(s => s.id === activeStoreId);
    const tabId = activeTabMap[activeStoreId];
    if (!store || !tabId) return;

    const entry = webviewMap[tabId];
    if (entry && entry.webview) {
      if (typeof entry.webview.isCrashed === 'function' && entry.webview.isCrashed()) {
        console.warn(`[Crash Recovery] Active tab ${tabId} was dead. Reconstructing...`);
        showTab(activeStoreId, tabId);
      }
    }
  };

  window.addEventListener('focus', () => {
    setTimeout(checkActiveTabHealth, 50);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(checkActiveTabHealth, 50);
    }
  });

  // Listener IPC dari host main.js jika ada perintah buka tab baru
  const registerOpenTabListener = window.electronAPI && (window.electronAPI.onWebviewOpenNewTab || window.electronAPI.onOpenNewTab);
  if (typeof registerOpenTabListener === 'function') {
    registerOpenTabListener((data) => {
      if (!data || !data.url) return;
      let targetStore = null;
      if (data.wcId) {
        const entry = Object.values(webviewMap).find(e => e.wcId === data.wcId);
        if (entry && entry.storeId) {
          targetStore = stores.find(s => s.id === entry.storeId);
        }
      }
      if (!targetStore && activeStoreId) {
        targetStore = stores.find(s => s.id === activeStoreId);
      }
      if (targetStore && typeof openUrlInNewTab === 'function') {
        openUrlInNewTab(targetStore, data.url);
      }
    });
  }

  // Keyboard shortcut Ctrl+Shift+R atau Ctrl+F5 untuk memulihkan (hard recreate) tab aktif
  // Keyboard shortcut Ctrl+R atau F5 untuk memuat ulang (soft reload) tab aktif
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) || (e.ctrlKey && e.key === 'F5')) {
      e.preventDefault();
      if (typeof forceRecreateActiveTab === 'function') {
        forceRecreateActiveTab();
      }
    } else if ((e.ctrlKey && (e.key === 'R' || e.key === 'r')) || e.key === 'F5') {
      const activeWv = typeof getActiveWebview === 'function' ? getActiveWebview() : null;
      if (activeWv && activeStoreId) {
        e.preventDefault();
        try {
          activeWv.reload();
          if (typeof showToast === 'function') showToast('Memuat ulang tab...', '');
        } catch (err) {
          activeWv.src = activeWv.src;
        }
      }
    }
  });
}

// Inisialisasi awal icon tema
updateThemeUI();
