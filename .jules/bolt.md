## 2024-10-27 - Debouncing Synchronous I/O while preserving UI state immediately
**Learning:** In a vanilla JS app, wrapping an entire input event listener in a `debounce` function can lead to data loss if the user switches context (like changing a tab) before the timeout fires, because the UI state was not captured yet.
**Action:** Always read from the DOM and update memory/state variables immediately in the event listener, and only apply `debounce` to the expensive synchronous I/O operations (like `JSON.stringify` to `localStorage` or full DOM rebuilds like `renderSidebar`).
