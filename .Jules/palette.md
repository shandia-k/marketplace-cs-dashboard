## 2023-10-27 - Missing ARIA labels in dynamic string-based HTML
**Learning:** Screen readers cannot interpret icon-only interactive elements generated via string-based HTML (e.g., in `js/tabs.js` and `js/modal.js`) without explicit `aria-label` attributes, even if a `title` is present.
**Action:** Always explicitly include `aria-label` attributes alongside `title` when generating icon-only interactive elements using string-based HTML to ensure full accessibility.
