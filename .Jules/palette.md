## 2024-08-13 - Add ARIA Labels to Dynamic Icon-Only Buttons
**Learning:** Dynamically generated UI elements via string-based HTML (e.g., in `js/tabs.js` or `js/modal.js`) often miss `aria-label` attributes on icon-only interactive elements. These must be explicitly included alongside `title` to ensure full screen reader accessibility.
**Action:** Always include `aria-label` matching the element's purpose or `title` when creating icon-only buttons via string concatenation or template literals.
