/**
 * Telemetry & Product Analytics Module
 * CS Marketplace Dashboard
 * 
 * Mengumpulkan metadata frekuensi penggunaan fitur aplikasi secara aman dan anonim
 * untuk keperluan pengembangan dan peningkatan performa aplikasi.
 * TIDAK merekam data chat, kata sandi, ataupun informasi personal pengguna/pembeli.
 */

const AppTelemetry = {
  events: {},
  sessionStartTime: Date.now(),
  lastFlushTime: Date.now(),
  flushInterval: null,
  isInitialized: false,

  init() {
    if (this.isInitialized) return;
    this.events = {};
    this.sessionStartTime = Date.now();
    this.lastFlushTime = Date.now();
    this.isInitialized = true;

    // Periodik kirim ringkasan setiap 30 menit
    this.flushInterval = setInterval(() => {
      this.flush(false);
    }, 30 * 60 * 1000);

    // Kirim saat aplikasi akan ditutup
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    console.log('[Telemetry] Initialized successfully.');
  },

  /**
   * Catat event penggunaan fitur
   * @param {string} eventName Nama aksi/fitur (misal: 'quick_reply_used')
   * @param {number} count Jumlah penambahan (default: 1)
   */
  track(eventName, count = 1) {
    if (!eventName) return;
    this.events[eventName] = (this.events[eventName] || 0) + count;
  },

  isFlushing: false,
  isExited: false,

  /**
   * Mengirim ringkasan telemetri ke backend (Google Apps Script)
   * @param {boolean} isExiting Apakah dipanggil saat aplikasi akan ditutup
   */
  async flush(isExiting = false) {
    if (this.isFlushing) return;
    if (isExiting && this.isExited) return;

    // Jangan kirim jika baru saja dikirim dalam 5 detik terakhir
    if (Date.now() - this.lastFlushTime < 5000) return;

    const eventKeys = Object.keys(this.events);
    const eventCount = eventKeys.length;
    const durationMin = Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 60000));

    // Jangan kirim jika tidak ada interaksi fitur yang tercatat
    if (eventCount === 0) return;

    this.isFlushing = true;
    if (isExiting) this.isExited = true;

    // Ambil salinan events lalu kosongkan memori seketika agar tidak terkirim dobel
    const eventsToSend = { ...this.events };
    this.events = {};
    this.lastFlushTime = Date.now();

    // Rangkum statistik toko (hanya platform dan jumlahnya, TANPA nama akun/password)
    let storeCount = 0;
    let marketplaces = '-';
    try {
      if (typeof stores !== 'undefined' && Array.isArray(stores)) {
        storeCount = stores.length;
        const counts = {};
        stores.forEach(s => {
          const mp = (s && s.marketplace) ? s.marketplace.toLowerCase() : 'other';
          counts[mp] = (counts[mp] || 0) + 1;
        });
        marketplaces = Object.entries(counts)
          .map(([mp, cnt]) => `${mp} (${cnt})`)
          .join(', ');
      }
    } catch (e) {
      // Abaikan jika stores belum terdefinisi
    }

    const payload = {
      type: 'TELEMETRY',
      username: (typeof window !== 'undefined' && window.currentUser) ? window.currentUser : 'cs',
      durationMinutes: durationMin,
      storeCount: storeCount,
      marketplaces: marketplaces || '-',
      events: eventsToSend
    };

    try {
      if (window.electronAPI && typeof window.electronAPI.sendTelemetry === 'function') {
        const res = await window.electronAPI.sendTelemetry(payload);
        
        // ── PUSH NOTIFICATION: Beritahu CS jika ada balasan developer baru ──
        if (res && Array.isArray(res.newDevReplies) && res.newDevReplies.length > 0) {
          if (typeof window.handleIncomingDevReplies === 'function') {
            window.handleIncomingDevReplies(res.newDevReplies);
          }
        }
        
        return res;
      }
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      this.isFlushing = false;
    }
  }
};

// Inisialisasi otomatis saat script dimuat
if (typeof window !== 'undefined') {
  AppTelemetry.init();
  window.AppTelemetry = AppTelemetry;
}
