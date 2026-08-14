// ── Bind All Events ───────────────────────────────────────────────────────────
function bindEvents() {
  // Window controls
  document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.windowMinimize());
  document.getElementById('btn-maximize').addEventListener('click', () => window.electronAPI.windowMaximize());
  document.getElementById('btn-close').addEventListener('click', () => window.electronAPI.windowClose());

  // Sidebar collapse
  document.getElementById('btn-collapse-sidebar').addEventListener('click', toggleSidebar);

  // Add store buttons
  document.getElementById('btn-add-store').addEventListener('click', openAddModal);
  document.getElementById('btn-add-store-empty').addEventListener('click', openAddModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  // Search
  const debouncedSearch = debounce(() => renderSidebar(getFilteredStores()), 300);
  searchInput.addEventListener('input', debouncedSearch);

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

  // Cache Section toggle
  const toggleCacheSection = document.getElementById('btn-toggle-cache-section');
  const cacheSectionBody   = document.getElementById('cache-section-body');
  toggleCacheSection?.addEventListener('click', () => {
    const isOpen = cacheSectionBody.style.display !== 'none';
    cacheSectionBody.style.display = isOpen ? 'none' : 'block';
    toggleCacheSection.classList.toggle('open', !isOpen);
    if (!isOpen && typeof updateCacheSizeDisplay === 'function') {
      updateCacheSizeDisplay();
    }
  });

  // Refresh cache size button
  document.getElementById('btn-refresh-cache-size')?.addEventListener('click', () => {
    if (typeof updateCacheSizeDisplay === 'function') updateCacheSizeDisplay();
  });

  // Opsi 1: Clear Safe Cache Global
  document.getElementById('btn-clear-safe-cache')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear-safe-cache');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 13px; height: 13px; border-width: 2px;"></span> Membersihkan...';

    try {
      const res = await window.electronAPI.clearSafeCache();
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

  // Opsi 3 Global: Deep Clean All (Reset Total Sesi Semua Toko)
  document.getElementById('btn-deep-clean-all')?.addEventListener('click', async () => {
    const confirmed = confirm(
      '⚠️ PERINGATAN: RESET TOTAL SEMUA SESI TOKO?\n\n' +
      'Seluruh cache, cookies, dan data login pada SEMUA marketplace akan dihapus total.\n' +
      'Anda harus login ulang ke semua toko Anda.\n\n' +
      'Apakah Anda benar-benar yakin ingin melanjutkan?'
    );
    if (!confirmed) return;

    const btn = document.getElementById('btn-deep-clean-all');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width: 13px; height: 13px; border-width: 2px;"></span> Mereset...';

    try {
      const res = await window.electronAPI.deepCleanAll();
      if (res && res.success) {
        showToast('Seluruh sesi toko berhasil di-reset total.', 'success');
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

  // Account Section toggle
  const toggleAccountSection = document.getElementById('btn-toggle-account-section');
  const accountSectionBody = document.getElementById('account-section-body');
  toggleAccountSection?.addEventListener('click', () => {
    const isOpen = accountSectionBody.style.display !== 'none';
    accountSectionBody.style.display = isOpen ? 'none' : 'block';
    toggleAccountSection.classList.toggle('open', !isOpen);
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

  // Theme toggle
  btnThemeToggle?.addEventListener('click', toggleTheme);
}

// ── Theme Logic ─────────────────────────────────────────────────────────────
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (window.currentUser) {
    localStorage.setItem('theme_' + window.currentUser, currentTheme);
  } else {
    localStorage.setItem('theme', currentTheme);
  }
}

// ── Global helpers (untuk onclick inline di html) ─────────────────────────
window.openEditModal = openEditModal;
window.deleteStore   = deleteStore;
window.retryTab      = retryTab;

// ── Init ─────────────────────────────────────────────────────────────────────
window.initApp = async function() {
  // Apply initial theme based on user
  if (window.currentUser) {
    const savedTheme = localStorage.getItem('theme_' + window.currentUser);
    if (savedTheme) currentTheme = savedTheme;
  }
  document.documentElement.setAttribute('data-theme', currentTheme);

  appPath = await window.electronAPI.getAppPath();
  stores  = await window.electronAPI.getStores(window.currentUser);
  renderSidebar(getFilteredStores());
  bindEvents();
  
  // Reload scratchpad for current user
  if (typeof loadScratchpadState === 'function') {
    loadScratchpadState();
    if (scratchpadWindow && scratchpadWindow.style.display !== 'none') {
      renderScratchpadTabs();
      const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
      if (currentTab) spTextarea.value = currentTab.content;
    }
  }

  // Mulai monitor RAM dan hibernate otomatis
  setInterval(checkAndHibernateIfNeeded, RAM_CHECK_INTERVAL_MS);
  checkAndHibernateIfNeeded(); // langsung cek pertama kali
};
