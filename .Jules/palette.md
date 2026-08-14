## 2024-08-14 - String-based HTML and ARIA labels
**Learning:** In vanilla JS applications generating DOM elements via string-based HTML (like `js/tabs.js` and `js/modal.js`), it is a common pattern to miss `aria-label`s on icon-only buttons because standard JSX/React linters are not present to catch these accessibility violations.
**Action:** Always proactively search for `<button` and `<a` tags within template strings and explicitly ensure they include `aria-label` attributes alongside `title` for full screen reader accessibility.
