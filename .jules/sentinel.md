## 2026-08-29 - [Fix Fail-Open IDOR in IPC Handlers]
**Vulnerability:** The `save-stores` IPC handler in `src/main/ipc/register-ipc.js` implemented IDOR protection but failed open if `currentActiveSession` was null. The `get-stores` IPC handler completely lacked authentication and IDOR checks.
**Learning:** Always use fail-closed logic (e.g., explicitly checking `!currentActiveSession`) to block unauthenticated requests in IPC handlers. If `currentActiveSession` is null, the code bypassed the `!currentActiveSession.isSuperAdmin` check in `save-stores`.
**Prevention:** Consistently apply `!currentActiveSession` checks as the first line of defense in sensitive IPC handlers to enforce fail-closed behavior.
