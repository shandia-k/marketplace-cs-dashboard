## 2024-05-24 - Accessibility of Dynamically Generated Icon-Only Buttons
**Learning:** In dynamically generated UI elements (e.g. innerHTML templates in js/tabs.js or js/modal.js), developers sometimes only include a `title` attribute for icon-only buttons, neglecting `aria-label`. Relying solely on `title` is insufficient for full accessibility across all screen readers.
**Action:** When auditing or implementing dynamic templates that output icon-only interactive elements, explicitly ensure an `aria-label` is present in the markup string alongside any existing tooltip logic.
