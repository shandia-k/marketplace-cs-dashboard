## 2024-05-20 - Missing Debounce Utility
**Learning:** High-frequency event listeners like search inputs (`input` events) block the main thread and cause unnecessary re-rendering, UI thrashing, and lag. A debounce utility is missing in `js/utils.js` even though it's mentioned in the system instructions.
**Action:** Add a `debounce` utility function to `js/utils.js` and use it for search inputs.
