/**
 * src/main/config/app.config.js
 * Chromium command-line switches and application configuration
 */

function applyChromiumSwitches(app) {
  // Headroom V8 heap hingga 1024 MB agar sinkronisasi chat besar tidak memicu GC thrashing
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1024');
  app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,AutomaticTabDiscarding,IntensiveWakeUpThrottling');
}

module.exports = {
  applyChromiumSwitches
};
