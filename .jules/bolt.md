## 2024-11-20 - Synchronous I/O in high-frequency event listeners
**Learning:** Writing state to `localStorage` synchronously via `JSON.stringify` on every keystroke (e.g., in `saveScratchpadState`) blocks the main thread. Additionally, debouncing the entire event listener can lead to data loss if context switches before timeout fires.
**Action:** Always read DOM state immediately inside the event listener, and only debounce the expensive I/O operations (like `saveScratchpadState`).
## 2024-11-20 - Unnecessary frequent render on search inputs
**Learning:** Frequent events like `input` on search bars (`searchInput`, `cnotes-search-input`, `qr-search-input`) trigger expensive rendering processes like `renderSidebar` synchronously on every keystroke, leading to high UI thrashing and poor responsiveness.
**Action:** Implement a generic `debounce` utility in `js/utils.js` and use it to wrap the callback function for search inputs.
