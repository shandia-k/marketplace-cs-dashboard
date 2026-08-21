# Palette Learnings
## 2024-05-24 - Screen Reader Compatibility on SVG Buttons
**Learning:** Icon-only buttons using `<svg>` in JS template strings across this app lack proper `aria-label` attributes.
**Action:** When creating action buttons without visible text, always include `aria-label` matching `title`, and add `aria-hidden="true"` and `focusable="false"` to inner SVG elements to prevent redundant screen reader announcements.
