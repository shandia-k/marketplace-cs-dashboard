/**
 * src/main/services/memory-trimmer.service.js
 * Native OS Working Set Trimmer for Windows & V8 Memory Compactor
 * Menginstruksikan kernel Windows untuk memindahkan halaman memori V8 Heap & DOM
 * yang tidak aktif ke Windows Native RAM Compression Store (Dual-Layer State Retention).
 */

const { execFile } = require('child_process');
const os = require('os');
const electron = require('electron');

let isTrimming = false;
let lastTrimTimestamp = 0;

/**
 * Mendapatkan seluruh PID aktif proses Electron (Main, Renderers, GPU, Utility)
 */
function getActiveAppPids() {
  const pids = new Set();
  pids.add(process.pid);

  try {
    const app = electron.app;
    if (app && typeof app.getAppMetrics === 'function') {
      const metrics = app.getAppMetrics();
      for (const m of metrics) {
        if (m && m.pid) pids.add(m.pid);
      }
    }
  } catch (e) {}

  return Array.from(pids);
}

/**
 * Pangkas Working Set memori proses Electron secara native di Windows
 * Bekerja 100% pada mode development maupun rilis produksi (ASAR packaged .exe).
 * @param {number} throttleMs Jeda minimal antar pemanggilan (default 15000ms / 15 detik)
 * @returns {Promise<{success: boolean, platform: string, trimmedPids?: number[]}>}
 */
function trimWorkingSet(throttleMs = 15000) {
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

  const pids = getActiveAppPids();
  const pidListStr = pids.join(',');

  // Inline C# Win32 EmptyWorkingSet execution dikompilasi langsung di memori oleh PowerShell
  // Tanpa ketergantungan file .ps1 di disk (kompatibel penuh dengan bundle app.asar)
  const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class Win32MemTrimmer {
    [DllImport("psapi.dll", SetLastError=true)]
    public static extern bool EmptyWorkingSet(IntPtr hProcess);
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern bool CloseHandle(IntPtr hObject);
    public static void Trim(int[] pids) {
        foreach (int pid in pids) {
            IntPtr h = OpenProcess(0x0500, false, pid);
            if (h != IntPtr.Zero) {
                try { EmptyWorkingSet(h); } finally { CloseHandle(h); }
            }
        }
    }
}
"@
try {
    Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue
} catch {}
[Win32MemTrimmer]::Trim(@(${pidListStr}))
`;

  const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

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
        '-EncodedCommand',
        encodedCommand
      ],
      { windowsHide: true, timeout: 5000 },
      (error) => {
        isTrimming = false;
        if (error) {
          console.warn('[MemoryTrimmer] Working set trim warning:', error.message);
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, trimmedPids: pids });
        }
      }
    );
  });
}

module.exports = {
  trimWorkingSet,
  getActiveAppPids
};
