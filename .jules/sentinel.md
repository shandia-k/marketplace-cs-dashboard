## 2024-05-01 - [IDOR in User Profile IPC Handlers]
**Vulnerability:** IDOR in `get-user-profile` and `update-user-profile` IPC handlers allowing any user to view or modify any other user profile by simply sending an IPC request to main.
**Learning:** Renderer processes are not trusted and can send IPC commands requesting resources they should not have access to. The application did not have a fail-closed authorization verification logic using `getActiveSession()`.
**Prevention:** Always verify that the requested username matches the active session (using `authService.getActiveSession()`) or that the active session is a Super Admin before returning data.
