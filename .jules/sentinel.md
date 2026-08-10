## 2024-08-10 - Path Traversal via IPC Username Parameter
**Vulnerability:** Path traversal risk in `readStores` and `saveStores` when concatenating the `username` parameter directly into `path.join()` without validation.
**Learning:** The renderer process can send arbitrary `username` strings through `ipcMain.handle('get-stores')` or `ipcMain.handle('save-stores')`. Without proper validation, this can manipulate the filesystem path to write or read arbitrary JSON files on the OS.
**Prevention:** Always explicitly validate and sanitize any parameters received via IPC (especially those mapped to filenames or paths) using strict regex (e.g., `/^[a-zA-Z0-9_-]+$/`) to reject traversal sequences like `../`.
