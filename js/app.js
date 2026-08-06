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
  // Debounce search input to avoid re-rendering sidebar on every keystroke
  searchInput.addEventListener('input', debounce(() => renderSidebar(getFilteredStores()), 150));

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
