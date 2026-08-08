## 2024-05-15 - Vanilla JS UI Thrashing
**Learning:** Because the frontend is Vanilla JS without a Virtual DOM, functions that fully rebuild DOM elements and string-based HTML (like `renderSidebar`) are computationally expensive. Rapid, high-frequency event listeners (like input typing) that trigger full re-renders cause severe UI thrashing.
**Action:** Always wrap rapid event listeners (like search inputs) that trigger DOM rebuilds in a `debounce` utility to limit the rate of re-renders.
