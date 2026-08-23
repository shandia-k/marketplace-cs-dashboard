/**
 * src/main/services/memory-trimmer.service.js
 * Native OS Working Set Trimmer for Windows & V8 Memory Compactor
 * Menginstruksikan kernel Windows untuk memindahkan halaman memori V8 Heap & DOM
 * yang tidak aktif ke Windows Native RAM Compression Store (Dual-Layer State Retention).
 */

const { execFile } = require('child_process');
const path = require('path');
const os = require('os');

let isTrimming = false;
let lastTrimTimestamp = 0;

/**
 * Pangkas Working Set memori proses Electron secara native di Windows
 * @param {number} throttleMs Jeda minimal antar pemanggilan (default 30000ms / 30 detik)
 * @returns {Promise<{success: boolean, platform: string}>}
 */
function trimWorkingSet(throttleMs = 30000) {
  if (os.platform() !== 'win32') {
    return Promise.resolve({ success: true, platform: os.platform() });
  }

  const now = Date.now();
  if (now - lastTrimTimestamp < throttleMs) {
    return Promise.resolve({ success: true, throttled: true });
  }

  if (isTrimming) {
    return Promise.resolve({ success: true, inProgress: true });
  }

  isTrimming = true;
  lastTrimTimestamp = now;

  const scriptPath = path.join(__dirname, 'trim-memory.ps1');

  return new Promise((resolve) => {
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath
      ],
      { windowsHide: true, timeout: 4000 },
      (error) => {
        isTrimming = false;
        if (error) {
          console.warn('[MemoryTrimmer] Working set trim warning:', error.message);
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
}

module.exports = {
  trimWorkingSet
};
