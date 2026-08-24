## 2024-08-24 - Accessibility for Icon-Only Buttons in String Templates
**Learning:** When generating dynamic UI elements via string-based HTML, icon-only buttons need explicit `aria-label`s and their inner `<svg>` elements require `aria-hidden="true"` and `focusable="false"` to be properly accessible to screen readers, as the DOM doesn't inherently parse meaning from raw SVG paths.
**Action:** Always verify that string template UI generators include accessibility attributes on their interactive elements.
