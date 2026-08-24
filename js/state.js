// ── State ────────────────────────────────────────────────────────────────────
let stores        = [];
let activeStoreId = null;
let sidebarCollapsed = true;
let sidebarPinned    = false;
let appPath       = ''; // Path ke direktori app (untuk webview preload)

// Tab system: per-store tab list & active tab tracking
// storeTabs:    storeId → [{ id, title, url, zoom }]
// activeTabMap: storeId → tabId
// webviewMap:   tabId   → { webview: el, loading: el, hibernated: bool, hasDraft: bool }
const storeTabs    = {};
const activeTabMap = {};
const webviewMap   = {};

// Unread messages tracking: storeId → total unread count
const unreadMap = {};

// Side-by-Side (Split View / Dual Workspace) state
let splitSessions = []; // Array of { id, name, leftStoreId, leftTabId, rightStoreId, rightTabId, ratio, mode, isFavorite }
let activeSplitSessionId = null;
let isSplitViewActive = false;
let splitRatio = 50; // % lebar pane kiri
let splitRightStoreId = null;
let splitRightTabId = null;
let activeFocusedPane = 'left'; // 'left' | 'right'
let splitPickerFilter = '';
let splitPickerMarketplace = 'all';
let splitViewDisplayMode = 'responsive'; // 'responsive' (Auto-Resize) | 'scroll' (Horizontal Scroll Desktop)

// Restore saved split view mode & favorite sessions
try {
  const savedMode = localStorage.getItem('split_view_display_mode');
  if (savedMode === 'scroll' || savedMode === 'responsive') {
    splitViewDisplayMode = savedMode;
  }
  const savedFavs = localStorage.getItem('antigravity_favorite_split_sessions');
  if (savedFavs) {
    const parsed = JSON.parse(savedFavs);
    if (Array.isArray(parsed)) {
      splitSessions = parsed.map(s => ({ ...s, isFavorite: true }));
    }
  }
} catch (e) {}

// Zoom indicator timer
let zoomIndicatorTimer = null;

// Edit modal state
let editingStoreId = null;

// RAM tracking
const lastAccessed = {};    // tabId → timestamp ms (kapan terakhir dilihat)
let   ramUsageMB   = 0;

// Theme tracking
let currentTheme = localStorage.getItem('theme') || 'dark';

// Toast tracking
let toastTimer;

// ── DOM Elements ─────────────────────────────────────────────────────────────
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const sidebarEl      = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebar-content');
const webviewCont    = document.getElementById('webview-container');
const emptyState     = document.getElementById('empty-state');
const tabBar         = document.getElementById('tab-bar');
const searchInput    = document.getElementById('search-input');

// Modals
const modalOverlay       = document.getElementById('modal-overlay');
const modalTitle         = document.getElementById('modal-title');
const settingsOverlay    = document.getElementById('settings-overlay');
const storesListSettings = document.getElementById('settings-stores-list');

// Form fields
const fieldStoreId          = document.getElementById('store-id');
const fieldStoreName        = document.getElementById('store-name');
const fieldStoreInitials    = document.getElementById('store-initials');
const fieldStoreMarketplace = document.getElementById('store-marketplace');
const fieldStoreUrl         = document.getElementById('store-url');
const fieldStoreColor       = document.getElementById('store-color');
const colorPickerWrapper    = document.getElementById('color-picker-wrapper');
const customUrlGroup        = document.getElementById('custom-url-group');
const customUrlSpinner      = document.getElementById('custom-url-spinner');
const btnClearUrl           = document.getElementById('btn-clear-url');
const customUrlResults      = document.getElementById('custom-url-results');
const customResultsList     = document.getElementById('custom-results-list');
const customPresetChips     = document.getElementById('custom-preset-chips');
const urlPreview            = document.getElementById('url-preview');

// ── App Namespace & State Module Interface ──────────────────────────────────
window.App = window.App || {};

const _stateListeners = new Map();

window.App.State = {
  getStores: () => stores,
  setStores: (newStores) => {
    stores = Array.isArray(newStores) ? newStores : [];
    window.App.State.dispatch('STORES_UPDATED', { stores });
  },
  getActiveStoreId: () => activeStoreId,
  setActiveStoreId: (id) => {
    activeStoreId = id;
    window.App.State.dispatch('STORE_ACTIVATED', { storeId: id });
  },
  getStoreTabs: (storeId) => storeId ? (storeTabs[storeId] || []) : storeTabs,
  getActiveTabMap: () => activeTabMap,
  getWebviewMap: () => webviewMap,
  getUnreadMap: () => unreadMap,
  getSplitSessions: () => splitSessions,
  isSplitViewActive: () => isSplitViewActive,

  /**
   * Mendaftar listener event perubahan state
   * @param {string} eventType 
   * @param {(payload: any) => void} callback 
   * @returns {() => void} Unsubscribe function
   */
  subscribe: (eventType, callback) => {
    if (typeof callback !== 'function') return () => {};
    if (!_stateListeners.has(eventType)) {
      _stateListeners.set(eventType, new Set());
    }
    _stateListeners.get(eventType).add(callback);
    return () => {
      _stateListeners.get(eventType)?.delete(callback);
    };
  },

  /**
   * Memancarkan event perubahan state dan memperbarui data secara terprediksi
   * @param {string} actionType 
   * @param {any} [payload] 
   */
  dispatch: (actionType, payload = {}) => {
    try {
      switch (actionType) {
        case 'STORE_ACTIVATED':
          if (payload.storeId !== undefined) activeStoreId = payload.storeId;
          break;
        case 'STORES_UPDATED':
          if (Array.isArray(payload.stores)) stores = payload.stores;
          break;
        case 'TAB_SWITCHED':
          if (payload.storeId && payload.tabId) activeTabMap[payload.storeId] = payload.tabId;
          break;
        case 'THEME_CHANGED':
          if (payload.theme) {
            currentTheme = payload.theme;
            try { localStorage.setItem('theme', payload.theme); } catch (e) {}
          }
          break;
      }

      // Beritahu seluruh subscriber untuk event spesifik
      const specificCallbacks = _stateListeners.get(actionType);
      if (specificCallbacks) {
        specificCallbacks.forEach(cb => {
          try { cb(payload); } catch (err) { console.error(`[State Listener Error: ${actionType}]`, err); }
        });
      }

      // Beritahu subscriber wildcard '*'
      const wildcardCallbacks = _stateListeners.get('*');
      if (wildcardCallbacks) {
        wildcardCallbacks.forEach(cb => {
          try { cb({ type: actionType, payload }); } catch (err) { console.error(`[State Wildcard Error]`, err); }
        });
      }
    } catch (e) {
      console.error(`[State Dispatch Error]`, e);
    }
  }
};
