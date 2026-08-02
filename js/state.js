// ── State ────────────────────────────────────────────────────────────────────
let stores        = [];
let activeStoreId = null;
let sidebarCollapsed = false;
let appPath       = ''; // Path ke direktori app (untuk webview preload)

// Tab system: per-store tab list & active tab tracking
// storeTabs:    storeId → [{ id, title, url, zoom }]
// activeTabMap: storeId → tabId
// webviewMap:   tabId   → { webview: el, loading: el, hibernated: bool, hasDraft: bool }
const storeTabs   = {};
const activeTabMap = {};
const webviewMap  = {};

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
const urlPreview            = document.getElementById('url-preview');
