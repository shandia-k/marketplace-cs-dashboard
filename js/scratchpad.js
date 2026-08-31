const btnScratchpad = document.getElementById('btn-scratchpad');
const scratchpadWindow = document.getElementById('scratchpad-window');
const scratchpadHeader = document.getElementById('scratchpad-header');
const scratchpadTabsContainer = document.getElementById('scratchpad-tabs');
const btnAddTab = document.getElementById('btn-sp-add-tab');
const btnScratchpadClose = document.getElementById('btn-scratchpad-close');
const btnSpLoad = document.getElementById('btn-sp-load');
const btnSpSave = document.getElementById('btn-sp-save');
const spTextarea = document.getElementById('scratchpad-textarea');

// Scratchpad Dedicated Search Elements
const btnSpSearchToggle = document.getElementById('btn-sp-search-toggle');
const spSearchBar = document.getElementById('scratchpad-search-bar');
const spSearchInput = document.getElementById('scratchpad-search-input');
const spSearchCount = document.getElementById('scratchpad-search-count');
const btnSpSearchPrev = document.getElementById('btn-sp-search-prev');
const btnSpSearchNext = document.getElementById('btn-sp-search-next');
const btnSpSearchClose = document.getElementById('btn-sp-search-close');

// Search state
let spSearchMatches = [];
let spActiveMatchIndex = -1;
let spSearchQuery = '';

let isScratchpadDragging = false;
let spDragOffsetX = 0;
let spDragOffsetY = 0;

// Scratchpad tabs state
let scratchpadTabs = [];
let activeScratchpadTabId = null;

function loadScratchpadState() {
  const saved = Storage.get('scratchpadTabs', null);
  scratchpadTabs = Array.isArray(saved) && saved.length > 0 ? saved : [
    { id: 'tab-' + Date.now(), name: 'Catatan 1', content: '' }
  ];
  
  const savedActive = Storage.get('activeScratchpadTabId', null);
  if (savedActive && scratchpadTabs.find(t => t.id === savedActive)) {
    activeScratchpadTabId = savedActive;
  } else {
    activeScratchpadTabId = scratchpadTabs[0].id;
  }
}

function saveScratchpadState() {
  Storage.set('scratchpadTabs', scratchpadTabs);
  Storage.set('activeScratchpadTabId', activeScratchpadTabId);
}

const localDebounce = window.debounce || function (func, wait = 180) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

const debouncedSaveScratchpadState = localDebounce(saveScratchpadState, 300);

// Ensure pending saves are flushed before user exits
window.addEventListener('beforeunload', () => {
  saveScratchpadState();
});

loadScratchpadState();

function renderScratchpadTabs() {
  scratchpadTabsContainer.innerHTML = '';
  scratchpadTabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = 'scratchpad-tab' + (tab.id === activeScratchpadTabId ? ' active' : '');
    
    const titleEl = document.createElement('span');
    titleEl.textContent = tab.name;
    titleEl.title = tab.name;
    
    // Make tab name editable inline on double click
    titleEl.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      titleEl.contentEditable = true;
      titleEl.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    titleEl.addEventListener('blur', () => {
      if (titleEl.contentEditable === 'true') {
        titleEl.contentEditable = false;
        const newName = titleEl.textContent.trim() || 'Catatan';
        titleEl.textContent = newName;
        tab.name = newName;
        saveScratchpadState();
        // Just update visually without re-rendering to avoid focus issues
      }
    });

    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });
    
    // Prevent single clicks on title from switching tab IF we are editing
    titleEl.addEventListener('click', (e) => {
      if (titleEl.contentEditable === 'true') {
        e.stopPropagation();
      }
    });

    tabEl.appendChild(titleEl);
    
    // Close button (only if more than 1 tab)
    if (scratchpadTabs.length > 1) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'scratchpad-tab-close';
      closeBtn.innerHTML = `
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      closeBtn.title = 'Tutup Tab';
      closeBtn.setAttribute('aria-label', 'Tutup Tab');
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeScratchpadTab(tab.id);
      };
      tabEl.appendChild(closeBtn);
    }
    
    tabEl.onclick = () => {
      switchScratchpadTab(tab.id);
    };
    
    scratchpadTabsContainer.appendChild(tabEl);

    if (tab.id === activeScratchpadTabId) {
      setTimeout(() => {
        if (typeof tabEl.scrollIntoView === 'function') {
          tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }, 0);
    }
  });
}

// Enable smooth horizontal scrolling on mouse wheel for scratchpad tabs
scratchpadTabsContainer?.addEventListener('wheel', (e) => {
  if (e.deltaY !== 0) {
    scratchpadTabsContainer.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}, { passive: false });

function switchScratchpadTab(tabId) {
  if (tabId === activeScratchpadTabId) return; // Prevent re-render on same tab to allow dblclick

  // Save current textarea content to active tab
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab) {
    currentTab.content = spTextarea.value;
  }
  
  activeScratchpadTabId = tabId;
  const newTab = scratchpadTabs.find(t => t.id === tabId);
  if (newTab) {
    spTextarea.value = newTab.content;
  }
  saveScratchpadState();
  renderScratchpadTabs();

  // Jika search bar sedang aktif saat berganti tab, cari ulang secara otomatis
  if (spSearchBar && spSearchBar.style.display !== 'none' && spSearchInput && spSearchInput.value.trim()) {
    setTimeout(() => {
      executeScratchpadSearch('current');
    }, 20);
  }
}

function addScratchpadTab(name, content) {
  const newId = 'tab-' + Date.now();
  scratchpadTabs.push({
    id: newId,
    name: name || ('Catatan ' + (scratchpadTabs.length + 1)),
    content: content || ''
  });
  switchScratchpadTab(newId);
  saveScratchpadState();
  if (window.AppTelemetry) {
    window.AppTelemetry.track('scratchpad_tab_created');
  }
  // Scroll to rightmost
  setTimeout(() => {
    scratchpadTabsContainer.scrollLeft = scratchpadTabsContainer.scrollWidth;
  }, 10);
}

function closeScratchpadTab(tabId) {
  if (scratchpadTabs.length <= 1) return;
  
  const index = scratchpadTabs.findIndex(t => t.id === tabId);
  scratchpadTabs.splice(index, 1);
  
  if (activeScratchpadTabId === tabId) {
    // Switch to adjacent tab
    const nextTab = scratchpadTabs[Math.min(index, scratchpadTabs.length - 1)];
    switchScratchpadTab(nextTab.id);
  } else {
    saveScratchpadState();
    renderScratchpadTabs();
  }
  if (window.AppTelemetry) {
    window.AppTelemetry.track('scratchpad_tab_closed');
  }
}

// ── DEDICATED SCRATCHPAD SEARCH ENGINE (CTRL+F) ──────────────────────────────
function openScratchpadSearch(initialQuery = '') {
  if (!spSearchBar || !spSearchInput) return;
  spSearchBar.style.display = 'flex';
  btnSpSearchToggle?.classList.add('active');

  // Ambil teks yang sedang diseleksi di textarea jika ada
  let q = initialQuery;
  if (!q && spTextarea) {
    const selStart = spTextarea.selectionStart;
    const selEnd = spTextarea.selectionEnd;
    if (typeof selStart === 'number' && typeof selEnd === 'number' && selEnd > selStart) {
      const selected = spTextarea.value.substring(selStart, selEnd).trim();
      if (selected.length > 0 && selected.length < 60 && !selected.includes('\n')) {
        q = selected;
      }
    }
  }

  if (q) {
    spSearchInput.value = q;
  }

  spSearchInput.focus();
  spSearchInput.select();
  executeScratchpadSearch('current');
}

function escapeSpHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function syncBackdropScroll() {
  const backdrop = document.getElementById('scratchpad-backdrop');
  if (backdrop && spTextarea) {
    backdrop.scrollTop = spTextarea.scrollTop;
    backdrop.scrollLeft = spTextarea.scrollLeft;
  }
}

function renderScratchpadHighlights() {
  const highlightsEl = document.getElementById('scratchpad-highlights');
  if (!highlightsEl || !spTextarea) return;

  const text = spTextarea.value;
  const query = spSearchQuery ? spSearchQuery.trim() : '';

  if (!query || spSearchMatches.length === 0) {
    highlightsEl.innerHTML = '';
    return;
  }

  // Bangun string HTML beranotasi dengan <mark class="sp-search-mark">
  let html = '';
  let lastIndex = 0;

  spSearchMatches.forEach((match, idx) => {
    const isActive = idx === spActiveMatchIndex;
    const beforeText = text.substring(lastIndex, match.start);
    const matchText = text.substring(match.start, match.end);

    html += escapeSpHtml(beforeText);
    html += `<mark class="sp-search-mark${isActive ? ' active' : ''}">${escapeSpHtml(matchText)}</mark>`;
    lastIndex = match.end;
  });

  html += escapeSpHtml(text.substring(lastIndex));
  if (text.endsWith('\n')) {
    html += '<br>&nbsp;';
  }

  highlightsEl.innerHTML = html;
  syncBackdropScroll();
}

function closeScratchpadSearch() {
  if (!spSearchBar) return;
  spSearchBar.style.display = 'none';
  btnSpSearchToggle?.classList.remove('active');
  spSearchMatches = [];
  spActiveMatchIndex = -1;
  spSearchQuery = '';
  updateScratchpadSearchCounter(0, 0, '');
  renderScratchpadHighlights();
  spTextarea?.focus();
}

function toggleScratchpadSearch() {
  if (!spSearchBar) return;
  if (spSearchBar.style.display === 'none' || !spSearchBar.style.display) {
    openScratchpadSearch();
  } else {
    closeScratchpadSearch();
  }
}

function updateScratchpadSearchCounter(current, total, query) {
  if (!spSearchCount) return;
  const wrap = spSearchInput?.closest('.sp-search-input-wrap');

  if (!query || query.trim().length === 0) {
    spSearchCount.textContent = '0/0';
    spSearchCount.className = 'sp-search-count';
    wrap?.classList.remove('has-no-matches', 'has-matches');
    return;
  }

  if (total === 0) {
    spSearchCount.textContent = '0/0';
    spSearchCount.className = 'sp-search-count no-matches';
    wrap?.classList.add('has-no-matches');
    wrap?.classList.remove('has-matches');
  } else {
    spSearchCount.textContent = `${current}/${total}`;
    spSearchCount.className = 'sp-search-count has-matches';
    wrap?.classList.remove('has-no-matches');
    wrap?.classList.add('has-matches');
  }
}

function executeScratchpadSearch(direction = 'next') {
  if (!spTextarea || !spSearchInput) return;
  const query = spSearchInput.value;
  spSearchQuery = query;

  if (!query || query.trim().length === 0) {
    spSearchMatches = [];
    spActiveMatchIndex = -1;
    updateScratchpadSearchCounter(0, 0, '');
    renderScratchpadHighlights();
    return;
  }

  const text = spTextarea.value;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  spSearchMatches = [];

  let pos = 0;
  while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
    spSearchMatches.push({ start: pos, end: pos + query.length });
    pos += lowerQuery.length || 1;
  }

  const total = spSearchMatches.length;
  if (total === 0) {
    spActiveMatchIndex = -1;
    updateScratchpadSearchCounter(0, 0, query);
    renderScratchpadHighlights();
    return;
  }

  if (direction === 'next') {
    spActiveMatchIndex = (spActiveMatchIndex + 1) % total;
  } else if (direction === 'prev') {
    spActiveMatchIndex = (spActiveMatchIndex - 1 + total) % total;
  } else {
    // 'current': pilih match terdekat dari kursor saat ini
    const cursor = spTextarea.selectionStart || 0;
    let closest = spSearchMatches.findIndex(m => m.start >= cursor);
    if (closest === -1) closest = 0;
    spActiveMatchIndex = closest;
  }

  highlightAndScrollMatch(spActiveMatchIndex);
  updateScratchpadSearchCounter(spActiveMatchIndex + 1, total, query);
  renderScratchpadHighlights();
}

function highlightAndScrollMatch(index) {
  if (!spTextarea || index < 0 || index >= spSearchMatches.length) return;
  const match = spSearchMatches[index];

  // Set selection range inside textarea
  spTextarea.setSelectionRange(match.start, match.end);

  // Auto-scroll ke posisi baris teks dalam textarea
  const textBefore = spTextarea.value.substring(0, match.start);
  const lineIndex = textBefore.split('\n').length - 1;
  const lineHeight = 21; // pixel per baris
  const targetScrollTop = Math.max(0, (lineIndex - 4) * lineHeight);

  if (typeof spTextarea.scrollTo === 'function') {
    spTextarea.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
  } else {
    spTextarea.scrollTop = targetScrollTop;
  }
  syncBackdropScroll();
}

// Sinkronisasi scroll textarea dengan backdrop highlight
spTextarea?.addEventListener('scroll', syncBackdropScroll);

// Event Listeners Toolbar Pencarian
btnSpSearchToggle?.addEventListener('click', toggleScratchpadSearch);
btnSpSearchClose?.addEventListener('click', closeScratchpadSearch);
btnSpSearchNext?.addEventListener('click', () => executeScratchpadSearch('next'));
btnSpSearchPrev?.addEventListener('click', () => executeScratchpadSearch('prev'));

spSearchInput?.addEventListener('input', () => executeScratchpadSearch('current'));

spSearchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      executeScratchpadSearch('prev');
    } else {
      executeScratchpadSearch('next');
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    executeScratchpadSearch('next');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    executeScratchpadSearch('prev');
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeScratchpadSearch();
  }
});

// Update current tab content on input & refresh search if open
spTextarea?.addEventListener('input', () => {
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab) {
    currentTab.content = spTextarea.value;
    debouncedSaveScratchpadState();
  }
  if (spSearchBar && spSearchBar.style.display !== 'none' && spSearchInput?.value.trim()) {
    executeScratchpadSearch('current');
  }
});

// Shortcut Ctrl+F / Cmd+F langsung di textarea Scratchpad
spTextarea?.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    e.stopPropagation();
    openScratchpadSearch();
  } else if (e.key === 'Escape' && spSearchBar && spSearchBar.style.display !== 'none') {
    e.preventDefault();
    closeScratchpadSearch();
  }
});

// Add tab button
btnAddTab?.addEventListener('click', (e) => {
  e.stopPropagation();
  addScratchpadTab();
});

// Toggle scratchpad
function openScratchpad() {
  if (!scratchpadWindow) return;
  scratchpadWindow.style.display = 'flex';
  renderScratchpadTabs();
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab && spTextarea) {
    spTextarea.value = currentTab.content;
  }
  if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('open_scratchpad');
  }
  if (window.AppTelemetry) {
    window.AppTelemetry.track('scratchpad_opened');
  }
}

function closeScratchpad() {
  if (!scratchpadWindow) return;
  scratchpadWindow.style.display = 'none';
  closeScratchpadSearch();
}

function toggleScratchpad() {
  if (!scratchpadWindow) return;
  if (scratchpadWindow.style.display === 'none' || !scratchpadWindow.style.display) {
    openScratchpad();
  } else {
    closeScratchpad();
  }
}

btnScratchpad?.addEventListener('click', toggleScratchpad);
btnScratchpadClose?.addEventListener('click', closeScratchpad);

window.openScratchpad = openScratchpad;
window.closeScratchpad = closeScratchpad;
window.toggleScratchpad = toggleScratchpad;
window.openScratchpadSearch = openScratchpadSearch;
window.closeScratchpadSearch = closeScratchpadSearch;
window.toggleScratchpadSearch = toggleScratchpadSearch;

// Dragging logic
scratchpadWindow?.addEventListener('mousedown', () => {
  // Disable webview pointer events to prevent them from swallowing mouse events 
  // during dragging or resizing the scratchpad.
  document.querySelectorAll('webview').forEach(w => w.style.pointerEvents = 'none');
});

scratchpadHeader?.addEventListener('mousedown', (e) => {
  // Prevent dragging if clicked on interactive elements
  if (e.target.closest('#btn-scratchpad-close') || 
      e.target.closest('#btn-sp-add-tab') || 
      e.target.closest('#btn-sp-search-toggle') || 
      e.target.closest('.btn-sp-search-toggle') || 
      e.target.closest('.btn-add-tab') || 
      e.target.closest('.scratchpad-tab')) return;
  
  isScratchpadDragging = true;
  const rect = scratchpadWindow.getBoundingClientRect();
  spDragOffsetX = e.clientX - rect.left;
  spDragOffsetY = e.clientY - rect.top;
  
  if (window.getComputedStyle(scratchpadWindow).position !== 'absolute') {
    scratchpadWindow.style.position = 'absolute';
    scratchpadWindow.style.bottom = 'auto';
    scratchpadWindow.style.right = 'auto';
  }
  
  scratchpadWindow.style.left = `${e.clientX - spDragOffsetX}px`;
  scratchpadWindow.style.top = `${e.clientY - spDragOffsetY}px`;
});

window.addEventListener('mousemove', (e) => {
  if (!isScratchpadDragging) return;
  e.preventDefault(); 
  
  let newLeft = e.clientX - spDragOffsetX;
  let newTop = e.clientY - spDragOffsetY;
  
  const maxX = window.innerWidth - scratchpadWindow.offsetWidth;
  const maxY = window.innerHeight - scratchpadWindow.offsetHeight;
  
  if (newLeft < 0) newLeft = 0;
  if (newTop < 0) newTop = 0;
  if (newLeft > maxX) newLeft = maxX;
  if (newTop > maxY) newTop = maxY;
  
  scratchpadWindow.style.left = `${newLeft}px`;
  scratchpadWindow.style.top = `${newTop}px`;
});

window.addEventListener('mouseup', () => {
  isScratchpadDragging = false;
  // Re-enable webview pointer events
  document.querySelectorAll('webview').forEach(w => w.style.pointerEvents = '');
});

// Load IPC (Loads into a new tab)
btnSpLoad.addEventListener('click', async () => {
  try {
    const res = await window.electronAPI.loadScratchpadFile();
    if (res && res.content !== null && res.content !== undefined) {
      const fileName = res.fileName || ('File ' + (scratchpadTabs.length + 1));
      addScratchpadTab(fileName, res.content);
      if (window.AppTelemetry) {
        window.AppTelemetry.track('scratchpad_file_imported');
      }
      showToast('Data berhasil dimuat di tab baru', 'success');
    }
  } catch (err) {
    showToast('Gagal memuat file: ' + err.message, 'error');
  }
});

// Save IPC (Saves active tab content)
btnSpSave.addEventListener('click', async () => {
  const content = spTextarea.value;
  if (!content.trim()) {
    showToast('Catatan masih kosong', 'error');
    return;
  }
  try {
    const res = await window.electronAPI.saveScratchpadFile(content);
    if (res && res.success) {
      const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
      if (currentTab && res.fileName) {
        currentTab.name = res.fileName;
        saveScratchpadState();
        renderScratchpadTabs();
      }
      if (window.AppTelemetry) {
        window.AppTelemetry.track('scratchpad_file_exported');
      }
      showToast('Data berhasil disimpan', 'success');
    }
  } catch (err) {
    showToast('Gagal menyimpan file: ' + err.message, 'error');
  }
});

// Copy all content of active tab to clipboard
document.getElementById('btn-sp-copy')?.addEventListener('click', () => {
  const content = spTextarea.value;
  if (!content) {
    showToast('Catatan masih kosong', 'error');
    return;
  }
  try {
    if (typeof copyResolvedText === 'function') {
      copyResolvedText(content);
    } else {
      navigator.clipboard.writeText(content);
    }
    if (window.AppTelemetry) {
      window.AppTelemetry.track('scratchpad_copied');
    }
    showToast('Seluruh catatan berhasil disalin ke clipboard ✓', 'success');
  } catch (e) {
    showToast('Gagal menyalin catatan: ' + e.message, 'error');
  }
});

// Insert active tab content directly into marketplace chat
document.getElementById('btn-sp-insert-chat')?.addEventListener('click', () => {
  const content = spTextarea.value;
  if (!content.trim()) {
    showToast('Catatan masih kosong', 'error');
    return;
  }
  if (typeof insertTextToActiveChat === 'function') {
    if (window.AppTelemetry) {
      window.AppTelemetry.track('scratchpad_inserted_chat');
    }
    insertTextToActiveChat(content);
  } else {
    showToast('Ketik ke chat tidak tersedia', 'error');
  }
});

// Export active tab content directly to Quick Reply Bulk Importer
document.getElementById('btn-sp-export-qr')?.addEventListener('click', () => {
  const content = spTextarea ? spTextarea.value : '';
  if (!content.trim()) {
    showToast('Catatan masih kosong untuk diekspor', 'error');
    return;
  }
  if (typeof openBulkImportModal === 'function') {
    openBulkImportModal(content);
    if (window.AppTelemetry) {
      window.AppTelemetry.track('scratchpad_exported_to_quickreply');
    }
  } else {
    showToast('Fitur impor template tidak tersedia', 'error');
  }
});

// ── Scratchpad Multi-Directional Resizing (Top-Left & All Edges) ─────────────
function initScratchpadResizer() {
  if (!scratchpadWindow) return;

  const handles = [
    { type: 'tl', class: 'handle-tl', title: 'Tarik sudut kiri-atas untuk ubah ukuran' },
    { type: 't',  class: 'handle-t' },
    { type: 'l',  class: 'handle-l' },
    { type: 'tr', class: 'handle-tr' },
    { type: 'bl', class: 'handle-bl' },
    { type: 'br', class: 'handle-br' },
    { type: 'r',  class: 'handle-r' },
    { type: 'b',  class: 'handle-b' }
  ];

  handles.forEach(h => {
    const el = document.createElement('div');
    el.className = `scratchpad-resize-handle ${h.class}`;
    if (h.title) el.title = h.title;
    el.dataset.handle = h.type;

    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll('webview').forEach(w => w.style.pointerEvents = 'none');
      document.body.style.userSelect = 'none';

      const rect = scratchpadWindow.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;
      const startLeft = rect.left;
      const startTop = rect.top;
      const startRight = rect.right;
      const startBottom = rect.bottom;
      const handleType = h.type;

      const onMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        const minW = 260;
        const minH = 180;
        const maxW = window.innerWidth - 30;
        const maxH = window.innerHeight - 30;

        if (handleType.includes('w') || handleType === 'l' || handleType === 'tl' || handleType === 'bl') {
          newWidth = Math.max(minW, Math.min(maxW, startWidth - dx));
          newLeft = startRight - newWidth;
        } else if (handleType.includes('e') || handleType === 'r' || handleType === 'tr' || handleType === 'br') {
          newWidth = Math.max(minW, Math.min(maxW, startWidth + dx));
        }

        if (handleType.includes('n') || handleType === 't' || handleType === 'tl' || handleType === 'tr') {
          newHeight = Math.max(minH, Math.min(maxH, startHeight - dy));
          newTop = startBottom - newHeight;
        } else if (handleType.includes('s') || handleType === 'b' || handleType === 'bl' || handleType === 'br') {
          newHeight = Math.max(minH, Math.min(maxH, startHeight + dy));
        }

        scratchpadWindow.style.position = 'fixed';
        scratchpadWindow.style.left = `${newLeft}px`;
        scratchpadWindow.style.top = `${newTop}px`;
        scratchpadWindow.style.right = 'auto';
        scratchpadWindow.style.bottom = 'auto';
        scratchpadWindow.style.width = `${newWidth}px`;
        scratchpadWindow.style.height = `${newHeight}px`;
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.querySelectorAll('webview').forEach(w => w.style.pointerEvents = '');
        document.body.style.userSelect = '';
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    scratchpadWindow.appendChild(el);
  });
}

initScratchpadResizer();

// ── App.Scratchpad Module Interface ─────────────────────────────────────────
window.App = window.App || {};
window.App.Scratchpad = {
  render: renderScratchpadTabs,
  addTab: addScratchpadTab,
  closeTab: closeScratchpadTab,
  switchTab: switchScratchpadTab,
  executeSearch: executeScratchpadSearch,
  closeSearch: closeScratchpadSearch
};
