// ── Scratchpad Logic ─────────────────────────────────────────────────────────
const btnScratchpad = document.getElementById('btn-scratchpad');
const scratchpadWindow = document.getElementById('scratchpad-window');
const scratchpadHeader = document.getElementById('scratchpad-header');
const scratchpadTabsContainer = document.getElementById('scratchpad-tabs');
const btnAddTab = document.getElementById('btn-sp-add-tab');
const btnScratchpadClose = document.getElementById('btn-scratchpad-close');
const btnSpLoad = document.getElementById('btn-sp-load');
const btnSpSave = document.getElementById('btn-sp-save');
const spTextarea = document.getElementById('scratchpad-textarea');

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
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Tutup Tab';
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
  });
}

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
}

// Update current tab content on input
spTextarea.addEventListener('input', () => {
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab) {
    currentTab.content = spTextarea.value;
    saveScratchpadState();
  }
});

// Add tab button
btnAddTab.addEventListener('click', (e) => {
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

// Dragging logic
scratchpadWindow.addEventListener('mousedown', () => {
  // Disable webview pointer events to prevent them from swallowing mouse events 
  // during dragging or resizing the scratchpad.
  document.querySelectorAll('webview').forEach(w => w.style.pointerEvents = 'none');
});

scratchpadHeader.addEventListener('mousedown', (e) => {
  // Prevent dragging if clicked on interactive elements
  if (e.target.closest('#btn-scratchpad-close') || 
      e.target.closest('#btn-add-tab') || 
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
      showToast('Data berhasil disimpan', 'success');
    }
  } catch (err) {
    showToast('Gagal menyimpan file: ' + err.message, 'error');
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
