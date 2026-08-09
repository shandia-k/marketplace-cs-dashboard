## 2024-08-09 - Vanilla JS DOM building requires explicit debouncing
**Learning:** Because the frontend is Vanilla JS without a Virtual DOM, functions that fully rebuild DOM elements and string-based HTML (like `renderSidebar`) are computationally expensive. Rapid, high-frequency event listeners (like input typing) that trigger full re-renders can cause severe UI thrashing.
**Action:** Always wrap high-frequency event listeners that trigger full DOM string rebuilds in `debounce` utilities.
