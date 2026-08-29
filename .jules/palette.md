## 2026-08-29 - Accessibility for Icon-only Buttons
**Learning:** Icon-only buttons rendered dynamically (e.g. within template literals in `js/modal.js`) are easily missed by standard screen reader configurations because they lack text content.
**Action:** Always add `aria-label` attributes describing the button's action and include `aria-hidden="true"` and `focusable="false"` on inner `<svg>` elements to prevent redundant or noisy screen reader announcements.
