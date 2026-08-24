/**
 * types/app-contracts.d.ts
 * Type contracts and data schema definitions for marketplace-cs-dashboard
 */

export interface Store {
  id: string;
  name: string;
  marketplace: 'shopee' | 'tokopedia' | 'tiktok' | 'lazada' | 'whatsapp' | 'custom' | string;
  url: string;
  color?: string;
  initials?: string;
  partition?: string;
  customSessionPath?: string;
  createdAt?: number;
  unreadCount?: number;
}

export interface PostBodyPayload {
  data?: Buffer | Uint8Array | string | any[];
  contentType?: string;
}

export interface TabLoadOptions {
  postBody?: PostBodyPayload;
  referrer?: string;
  httpReferrer?: string;
  extraHeaders?: string;
  disposition?: string;
}

export interface StoreTab {
  id: string;
  title: string;
  url: string;
  initialUrl: string;
  zoom?: number;
  isSuspended?: boolean;
  lastActive?: number;
  postBody?: PostBodyPayload;
  referrer?: string;
  loadOptions?: TabLoadOptions;
}

export interface SplitSession {
  id: string;
  leftStoreId: string;
  leftTabId: string;
  rightStoreId: string;
  rightTabId: string;
  isFavorite?: boolean;
  createdAt?: number;
}

export interface WebviewMapEntry {
  webview?: HTMLElement & {
    src?: string;
    loadURL?: (url: string, options?: any) => Promise<void>;
    getURL?: () => string;
    getTitle?: () => string;
    reload?: () => void;
    goBack?: () => void;
    goForward?: () => void;
    canGoBack?: () => boolean;
    canGoForward?: () => boolean;
    isCrashed?: () => boolean;
    getWebContentsId?: () => number;
    send?: (channel: string, ...args: any[]) => void;
    insertCSS?: (css: string) => Promise<string>;
    setZoomFactor?: (factor: number) => void;
    getZoomFactor?: () => number;
  };
  loading?: HTMLElement;
  storeId?: string;
  tabId?: string;
  wcId?: number;
  isSyncing?: boolean;
  syncProgress?: number;
  lastUrl?: string;
  created?: number;
}

export interface DevMimicryInfo {
  isDev: boolean;
  chromeVersion: string;
  cleanChromeUserAgent: string;
  cleanFirefoxUserAgent: string;
  clientHints: {
    'Sec-CH-UA': string;
    'Sec-CH-UA-Mobile': string;
    'Sec-CH-UA-Platform': string;
    'Sec-CH-UA-Platform-Version'?: string;
    'Sec-CH-UA-Arch'?: string;
    'Sec-CH-UA-Bitness'?: string;
  };
  activeStealthSessionsCount?: number;
}

export interface UserSession {
  username: string;
  fullName: string;
  role: 'superadmin' | 'admin' | 'cs';
  loginAt: number;
}

export interface ReleaseItem {
  version: string;
  tagName: string;
  name: string;
  releaseNotes?: string;
  publishedAt?: string;
  isLatest?: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSizeMB?: number;
}

export interface RollbackPayload {
  version: string;
  downloadUrl?: string;
}

export interface RollbackProgress {
  status: 'downloading' | 'verifying' | 'ready' | 'error';
  percent: number;
  transferredBytes?: number;
  totalBytes?: number;
  message?: string;
}

export interface VersionTrail {
  currentVersion: string | null;
  previousStableVersion?: string | null;
  history: string[];
  updatedAt?: string;
}

export interface ElectronAPI {
  // Store management
  getStores: (username?: string) => Promise<Store[]>;
  saveStores: (stores: Store[], username?: string) => Promise<boolean>;
  getAppPath: () => Promise<string>;
  getAppMemoryMB: () => Promise<number>;
  getAppMetricsDetails: () => Promise<any>;
  getDevMimicryInfo: () => Promise<DevMimicryInfo>;
  submitFeedback: (data: any) => Promise<{ success: boolean; id?: string }>;
  captureScreen: () => Promise<string>;
  sendTelemetry: (payload: any) => Promise<{ success: boolean }>;

  // Feedback & Ticketing
  feedback: {
    getTickets: () => Promise<any[]>;
    getTicket: (ticketId: string) => Promise<any>;
    createTicket: (data: any) => Promise<{ success: boolean; id?: string }>;
    addReply: (ticketId: string, messageData: any) => Promise<{ success: boolean }>;
    updateStatus: (ticketId: string, newStatus: string) => Promise<{ success: boolean }>;
    sync: (force?: boolean) => Promise<{ success: boolean }>;
    markRead: (ticketId: string) => Promise<{ success: boolean }>;
    getUnreadCount: () => Promise<number>;
  };

  // Auth & RBAC
  auth: {
    login: (username: string, passwordHash: string) => Promise<{ success: boolean; session?: UserSession; error?: string }>;
    logout: () => Promise<{ success: boolean }>;
    verifyPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
    getUsers: () => Promise<any[]>;
    getUserProfile: (username: string) => Promise<any>;
    createUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
    updateUserProfile: (username: string, updates: any) => Promise<{ success: boolean; error?: string }>;
    deleteUser: (username: string) => Promise<{ success: boolean; error?: string }>;
    getSecurityQuestion: (username: string) => Promise<{ success: boolean; question?: string; error?: string }>;
    resetPassword: (username: string, answerHash: string, newPasswordHash: string) => Promise<{ success: boolean; error?: string }>;
    updateSecurityQuestion: (username: string, question: string, answerHash: string) => Promise<{ success: boolean; error?: string }>;
    changePassword: (username: string, oldPasswordHash: string, newPasswordHash: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Admin Audit
  admin: {
    getFullAudit: () => Promise<any>;
    resetUserPin: (username: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
    clearUserSession: (username: string) => Promise<{ success: boolean }>;
    changeUserRole: (username: string, newRole: string) => Promise<{ success: boolean; error?: string }>;
    createUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
    clearStoreSession: (partition: string) => Promise<{ success: boolean }>;
    deleteUserStore: (username: string, storeId: string) => Promise<{ success: boolean }>;
  };

  // Cache & Optimization
  cache: {
    getSize: () => Promise<string>;
    clearSafe: () => Promise<boolean>;
    clearStore: (partition: string) => Promise<boolean>;
    deepCleanStore: (partition: string) => Promise<boolean>;
    deepCleanAll: () => Promise<boolean>;
    pruneMemory: () => Promise<{ success: boolean }>;
  };

  // Scratchpad File System
  scratchpad: {
    loadFile: (filePath?: string) => Promise<{ content: string; filePath?: string }>;
    saveFile: (content: string, filePath?: string) => Promise<boolean>;
  };

  // Search & Config
  searchUrls: (query: string) => Promise<any[]>;
  exportStores: () => Promise<boolean>;
  importStores: () => Promise<boolean>;
  checkUpdates: () => void;
  getAppVersion: () => Promise<string>;
  getReleaseHistory: () => Promise<ReleaseItem[]>;
  getVersionTrail: () => Promise<VersionTrail>;
  startVersionRollback: (payload: RollbackPayload) => Promise<{ success: boolean; error?: string }>;

  // Window Controls
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;

  // Event Listeners
  onWebviewOpenNewTab: (callback: (data: { wcId: number; url: string; referrer?: string; postBody?: PostBodyPayload; disposition?: string }) => void) => void;
  onClipboardChanged: (callback: (text: string) => void) => void;
  onRollbackProgress: (callback: (progress: RollbackProgress) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    stores: Store[];
    activeStoreId: string | null;
    storeTabs: Record<string, StoreTab[]>;
    activeTabMap: Record<string, string>;
    webviewMap: Record<string, WebviewMapEntry>;
    splitSessions: SplitSession[];
    isSplitViewActive: boolean;
    splitRightStoreId: string | null;
    splitRightTabId: string | null;
  }
}
