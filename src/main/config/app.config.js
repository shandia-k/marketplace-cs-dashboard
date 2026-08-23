/**
 * src/main/config/app.config.js
 * Chromium command-line switches and application configuration
 */

function applyChromiumSwitches(app) {
  // Headroom V8 aman dengan expose-gc untuk pembersihan heap berkala tanpa crash JIT
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512 --expose-gc');
  // Aktifkan fitur kompresi memori & cache navigasi instan Chromium
  app.commandLine.appendSwitch('enable-features', 'MemoryReducer,BackForwardCache');
  // Cegah discarding paksa dari OS agar tab selalu terjaga di memori untuk instant wake (0 detik)
  app.commandLine.appendSwitch('disable-features', 'AutomaticTabDiscarding');
  // ⚡ Process Pooling: Batasi proses renderer maksimal ke 8 proses dan satukan domain yang sama
  app.commandLine.appendSwitch('renderer-process-limit', '8');
  app.commandLine.appendSwitch('process-per-site');
}

module.exports = {
  applyChromiumSwitches
};
