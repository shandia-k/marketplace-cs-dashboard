## 2024-08-15 - Path Traversal in IPC Handlers
**Vulnerability:** The application accepts raw `username` strings via IPC from the renderer and uses them directly in file system operations (e.g., `path.join(userDataPath, \`stores_${username}.json\`)`), allowing path traversal attacks.
**Learning:** Even though the renderer is internal, IPC inputs must always be treated as untrusted data.
**Prevention:** Always sanitize or validate IPC parameters that are used to construct file paths. Use helpers like `sanitizeUsername` to strip dangerous characters.
