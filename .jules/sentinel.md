## 2024-05-24 - Path Traversal Vulnerability in Stores Data
**Vulnerability:** The `readStores` and `saveStores` functions accepted unsanitized `username` input from IPC calls, passing it directly to `path.join`. This allowed path traversal (e.g., `../../../`) where an attacker could read or overwrite arbitrary system files using IPC bridging.
**Learning:** All inputs from the renderer process (`ipcRenderer.invoke`) must be treated as untrusted, especially when constructing file paths on the main process.
**Prevention:** Always validate and sanitize user inputs that are used in file paths (e.g., stripping non-alphanumeric characters) or use `path.basename` to prevent directory traversal.
