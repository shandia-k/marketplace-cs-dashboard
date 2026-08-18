## 2024-05-24 - Added debounce to search inputs
**Learning:** High-frequency event listeners on inputs can cause unnecessary UI thrashing, leading to severe main thread blocking since the app does not use a Virtual DOM and heavily manipulates strings and DOM elements.
**Action:** Created and utilized a simple debounce helper in `js/utils.js` for `searchInput`, `qr-search-input`, `cnotes-search-input`, and `sandboxInput` to limit the execution rate of expensive update functions.
