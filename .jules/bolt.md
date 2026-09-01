## 2024-05-18 - Debounce Expensive LocalStorage Writes
**Learning:** Synchronous I/O operations like `JSON.stringify` to `localStorage` (e.g. `saveScratchpadState`) block the main thread when executed on every rapid keystroke (`input` event).
**Action:** Always debounce expensive I/O operations while reading the DOM immediately. Combine with a `window` `beforeunload` listener to flush pending saves to avoid data loss.
