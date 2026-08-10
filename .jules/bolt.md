## 2024-11-10 - Vanilla JS Event Debouncing
**Learning:** Full DOM rebuilds in string-based Vanilla JS without a Virtual DOM (like `renderSidebar`) are computationally expensive. Additionally, writing state to `localStorage` via `JSON.stringify` on every keystroke (`saveScratchpadState`) blocks the main thread.
**Action:** Always wrap rapid, high-frequency event listeners (like typing in search inputs or textareas) in `debounce` utilities to prevent severe UI thrashing and main thread blocking.
