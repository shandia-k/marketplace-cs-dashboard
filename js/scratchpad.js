// ── Scratchpad Logic ─────────────────────────────────────────────────────────
const btnScratchpad = document.getElementById('btn-scratchpad');
const scratchpadWindow = document.getElementById('scratchpad-window');
const scratchpadHeader = document.getElementById('scratchpad-header');
const scratchpadTabsContainer = document.getElementById('scratchpad-tabs');
const btnAddTab = document.getElementById('btn-add-tab');
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
  const userPrefix = window.currentUser ? ('_' + window.currentUser) : '';
  const saved = localStorage.getItem('scratchpadTabs' + userPrefix);
  if (saved) {
    try {
      scratchpadTabs = JSON.parse(saved);
    } catch(e) {}
  }
  
  if (!scratchpadTabs || scratchpadTabs.length === 0) {
    scratchpadTabs = [
      { id: 'tab-' + Date.now(), name: 'Catatan 1', content: '' }
    ];
  }
  
  const savedActive = localStorage.getItem('activeScratchpadTabId' + userPrefix);
  if (savedActive && scratchpadTabs.find(t => t.id === savedActive)) {
    activeScratchpadTabId = savedActive;
  } else {
    activeScratchpadTabId = scratchpadTabs[0].id;
  }
}

function saveScratchpadState() {
  const userPrefix = window.currentUser ? ('_' + window.currentUser) : '';
  localStorage.setItem('scratchpadTabs' + userPrefix, JSON.stringify(scratchpadTabs));
  localStorage.setItem('activeScratchpadTabId' + userPrefix, activeScratchpadTabId);
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
const debouncedSaveScratchpadState = debounce(saveScratchpadState, 500);

spTextarea.addEventListener('input', () => {
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab) {
    currentTab.content = spTextarea.value; // Read immediately to prevent data loss
    debouncedSaveScratchpadState(); // Debounce only the expensive I/O operation
  }
});

// Add tab button
btnAddTab.addEventListener('click', (e) => {
  e.stopPropagation();
  addScratchpadTab();
});

// Toggle scratchpad
btnScratchpad.addEventListener('click', () => {
  if (scratchpadWindow.style.display === 'none') {
    scratchpadWindow.style.display = 'flex';
    // Posisikan di tengah jika baru pertama kali dibuka, atau tetap di tempat asalnya
    renderScratchpadTabs();
    const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
    if (currentTab) {
      spTextarea.value = currentTab.content;
    }
  } else {
    scratchpadWindow.style.display = 'none';
  }
});

// Close scratchpad (hide)
btnScratchpadClose.addEventListener('click', () => {
  scratchpadWindow.style.display = 'none';
});

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
