## 2024-05-15 - Debouncing High-Frequency DOM Events
**Learning:** Found that `spTextarea.addEventListener('input')` writes state directly to localStorage (`saveScratchpadState` calling `JSON.stringify`) and executes searches *synchronously on every keystroke*, which can severely block the main thread and cause UI thrashing during rapid typing.
**Action:** Always debounce frequent DOM events that trigger expensive I/O operations (like `localStorage` writes) or layout recalculations. When capturing UI state (like `.value`), read the DOM immediately but debounce the expensive side effect.
