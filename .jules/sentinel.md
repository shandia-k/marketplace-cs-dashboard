## 2026-08-11 - Path Traversal in readStores/saveStores
**Vulnerability:** Path traversal vulnerability due to unvalidated `username` parameter concatenated in file paths (`stores_${username}.json`) in `readStores` and `saveStores`.
**Learning:** Inputs received via IPC must be properly validated and sanitized, especially when used to construct file system paths, to prevent attackers from traversing directories and reading/writing arbitrary files.
**Prevention:** Validate user inputs to ensure they only contain alphanumeric characters or other safe characters, or use secure path resolution methods to prevent directory traversal (`..`).
