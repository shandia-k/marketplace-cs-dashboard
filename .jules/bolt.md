## 2024-05-18 - [Debounce DOM & I/O in Vanilla JS]
**Learning:** Functions that fully rebuild DOM elements and string-based HTML (like renderSidebar) are computationally expensive in vanilla JS. Synchronous I/O operations like writing state to localStorage on every keystroke blocks the main thread. Debouncing the entire event handler for inputs can lead to data loss if context switches before the timeout.
**Action:** Add a debounce utility to utils.js. When debouncing event listeners that capture UI state, read the DOM immediately and only debounce the expensive I/O operation.
