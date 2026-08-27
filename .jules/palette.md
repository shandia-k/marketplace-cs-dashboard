## 2024-05-20 - Missing ARIA Labels on Icon Buttons
**Learning:** In dynamically generated and static HTML, icon-only buttons (`.btn-icon`) often rely solely on `title` attributes for accessibility. Screen readers prefer explicit `aria-label` attributes on the `<button>` and `aria-hidden="true"` / `focusable="false"` on the inner `<svg>`. Also, buttons with text should not have `aria-label` unless it captures the dynamic inner text.
**Action:** Add `aria-label` to all icon-only buttons, particularly those dynamically generated in `js/modal.js` and statically in `index.html`.
