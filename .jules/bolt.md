## 2024-05-18 - Debouncing Scratchpad I/O
**Learning:** `saveScratchpadState` performs synchronous `JSON.stringify` on `localStorage` every single keystroke in `spTextarea`, which is a blocking I/O operation that causes severe UI thrashing.
**Action:** Debounce the `saveScratchpadState` call during input, but immediately update local variables/state. Always use `beforeunload` to synchronously flush any pending saves to `localStorage` before the user exits.
