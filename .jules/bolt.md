## 2024-08-11 - Vanilla JS and Sync I/O Bottlenecks
**Learning:** In a vanilla JS architecture without a Virtual DOM, high-frequency DOM rebuilds (like `renderSidebar`) and synchronous localStorage writes (like `saveScratchpadState`) severely block the main thread.
**Action:** Always wrap high-frequency event listeners (like search or text inputs) with a `debounce` utility to prevent UI thrashing and preserve main thread responsiveness.
