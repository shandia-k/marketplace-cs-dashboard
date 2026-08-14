## 2024-05-27 - Path Traversal in IPC Handlers
**Vulnerability:** Usernames and partition strings passed via IPC were directly concatenated into file paths (e.g., `stores_${username}.json`) and partition identifiers without validation, allowing potential path traversal attacks.
**Learning:** The IPC bridge is a major attack surface in Electron apps. Treating renderer input as trusted for main process filesystem operations is dangerous.
**Prevention:** Always validate and sanitize inputs passed via IPC (e.g., using strict regex for allowed characters) before using them in file paths or sensitive APIs.
