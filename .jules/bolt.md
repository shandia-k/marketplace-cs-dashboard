## 2026-08-05 - Missing debounce on search input
**Learning:** In vanilla JS applications, binding DOM rendering directly to `input` events on search fields causes synchronous DOM thrashing on every keystroke, especially when the list of items grows.
**Action:** Always wrap search input handlers that trigger DOM updates or expensive filtering logic with a `debounce` function.
