## 2024-05-15 - Debouncing Synchronous I/O on High-Frequency Events
**Learning:** Writing state to `localStorage` synchronously via `JSON.stringify` on every keystroke (`input` event) in `js/scratchpad.js` causes main thread blocking and UI thrashing, especially in vanilla JS apps without a Virtual DOM.
**Action:** Always wrap expensive synchronous I/O operations inside high-frequency event listeners with a `debounce` function. Ensure state is flushed synchronously before the window unloads using a `beforeunload` event listener.
