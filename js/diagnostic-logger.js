/**
 * js/diagnostic-logger.js
 * Diagnostic Breadcrumbs & User Interaction Flight Recorder (Blackbox Logger)
 * 
 * Merekam riwayat interaksi pengguna (klik link, dead click tombol macet, routing URL,
 * error JavaScript, notifikasi rate-limit) dalam circular ring buffer in-memory (RAM)
 * untuk mempermudah reproduksi bug oleh tim developer.
 * 
 * Privasi Terjamin: Semua field password, token autentikasi, dan nomor kontak disamarkan.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DiagnosticLogger = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_BREADCRUMBS = 50;
  const SENSITIVE_KEY_REGEX = /password|token|auth|secret|credential|cookie|key|pin|cvv|session_id/i;
  const SENSITIVE_URL_PARAM_REGEX = /([?&](?:token|auth|key|password|secret|access_token)=)[^&#]+/gi;

  const logs = [];

  function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(SENSITIVE_URL_PARAM_REGEX, '$1***MASKED***');
  }

  function sanitizeValue(val, depth = 0) {
    if (depth > 4) return '[Truncated]';
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') return sanitizeString(val);
    if (typeof val === 'number' || typeof val === 'boolean') return val;

    if (Array.isArray(val)) {
      return val.slice(0, 10).map(item => sanitizeValue(item, depth + 1));
    }

    if (typeof val === 'object') {
      const sanitized = {};
      for (const [k, v] of Object.entries(val)) {
        if (SENSITIVE_KEY_REGEX.test(k)) {
          sanitized[k] = '***MASKED***';
        } else {
          sanitized[k] = sanitizeValue(v, depth + 1);
        }
      }
      return sanitized;
    }

    return String(val);
  }

  const DiagnosticLogger = {
    maxLogs: MAX_BREADCRUMBS,

    /**
     * Catat rekam jejak aksi pengguna atau event sistem
     * @param {'CLICK_LINK'|'CLICK_BUTTON'|'DEAD_CLICK'|'NAV_ROUTING'|'JS_ERROR'|'RATE_LIMIT_TOAST'|'STORE_SWITCH'|'TAB_SWITCH'|'SYSTEM'} category 
     * @param {string} message Deskripsi singkat aksi
     * @param {object} [metadata={}] Data teknis pendukung (tag, URL, id, dll.)
     */
    addBreadcrumb(category, message, metadata = {}) {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
        
        const entry = {
          id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          time: timeStr,
          timestamp: Date.now(),
          category: String(category || 'SYSTEM').toUpperCase(),
          message: sanitizeString(String(message || '')).substring(0, 120),
          metadata: sanitizeValue(metadata)
        };

        logs.push(entry);
        if (logs.length > this.maxLogs) {
          logs.shift(); // FIFO: buang log terlama
        }

        return entry;
      } catch (e) {
        console.warn('[DiagnosticLogger] Gagal merekam breadcrumb:', e);
        return null;
      }
    },

    /**
     * Mengambil salinan array breadcrumbs yang tersimpan
     * @returns {Array<object>}
     */
    getBreadcrumbs() {
      return [...logs];
    },

    /**
     * Kosongkan seluruh log rekam jejak
     */
    clear() {
      logs.length = 0;
    },

    /**
     * Format timeline teks ringkas untuk dilampirkan ke pesan dev / telegram / tiket
     * @returns {string}
     */
    getFormattedSummary() {
      if (logs.length === 0) return 'Tidak ada rekam jejak aksi tercatat.';

      return logs.map(entry => {
        const metaStr = (entry.metadata && Object.keys(entry.metadata).length > 0)
          ? ` (${JSON.stringify(entry.metadata)})`
          : '';
        return `${entry.time} | [${entry.category}] ${entry.message}${metaStr}`;
      }).join('\n');
    }
  };

  return DiagnosticLogger;
});
