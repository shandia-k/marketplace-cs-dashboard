## 2024-08-07 - Debouncing Vanilla JS DOM Manipulation
**Learning:** In a vanilla JS application like this dashboard, functions that completely rebuild DOM trees (like `renderSidebar`) are very expensive compared to Virtual DOM approaches (React/Vue). Attaching such functions directly to `input` events causes severe performance thrashing on every keystroke.
**Action:** Always wrap search inputs or other rapid event streams in a `debounce` utility when the event handler performs heavy DOM teardown and re-creation.
