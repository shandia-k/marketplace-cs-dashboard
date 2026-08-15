/**
 * js/storage.js
 * Unified Safe Storage Adapter for Multi-User LocalStorage Management
 */

const Storage = {
  /**
   * Get user prefix if user is logged in
   */
  getUserPrefix() {
    return window.currentUser ? `_${window.currentUser}` : '';
  },

  /**
   * Read item from localStorage with automatic user scoping & JSON parsing
   * @param {string} key - Storage key name
   * @param {*} defaultValue - Fallback value if null/error
   * @param {boolean} isUserScoped - If true, prefixes key with active username (default: true)
   */
  get(key, defaultValue = null, isUserScoped = true) {
    try {
      const fullKey = isUserScoped ? `${key}${this.getUserPrefix()}` : key;
      const item = localStorage.getItem(fullKey);
      if (item === null || item === undefined) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      // If parsing failed (e.g. raw string), return string if defaultValue is string, else defaultValue
      const fullKey = isUserScoped ? `${key}${this.getUserPrefix()}` : key;
      const raw = localStorage.getItem(fullKey);
      return raw !== null ? raw : defaultValue;
    }
  },

  /**
   * Save item to localStorage with automatic user scoping & JSON stringifying
   * @param {string} key - Storage key name
   * @param {*} value - Value to store
   * @param {boolean} isUserScoped - If true, prefixes key with active username (default: true)
   */
  set(key, value, isUserScoped = true) {
    try {
      const fullKey = isUserScoped ? `${key}${this.getUserPrefix()}` : key;
      const serialized = JSON.stringify(value);
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (e) {
      console.error(`Storage.set failed for key "${key}":`, e);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key name
   * @param {boolean} isUserScoped - If true, prefixes key with active username (default: true)
   */
  remove(key, isUserScoped = true) {
    try {
      const fullKey = isUserScoped ? `${key}${this.getUserPrefix()}` : key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (e) {
      return false;
    }
  }
};

window.Storage = Storage;
