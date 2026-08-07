## 2024-05-24 - Initial Palette Journal\n**Learning:** Creating initial palette journal.\n**Action:** Create journal.
## 2024-05-24 - Loading states on login
**Learning:** The login and register buttons in `js/login.js` disable the button and change the text when processing, but they don't set `aria-busy="true"` or use a loading spinner to provide clear visual feedback to screen readers and sighted users.
**Action:** Add `aria-busy` attributes and an inline loading spinner when async actions (like login/register) are running.
