## 2025-01-24 - Debouncing DOM I/O state
**Learning:** Synchronous I/O operations like writing state to `localStorage` via `JSON.stringify` on every keystroke blocks the main thread.
**Action:** Read the DOM immediately and only debounce the expensive I/O operation (e.g. `saveScratchpadState`). Always ensure a `beforeunload` event listener is attached to `window` to synchronously flush pending saves, preventing data loss. Ensure `window.debounce` has a local fallback.
