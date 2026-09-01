## 2024-05-24 - [IDOR in User Profile IPC Handlers]
**Vulnerability:** Insecure Direct Object Reference (IDOR) and missing authorization checks in `get-user-profile` and `update-user-profile` IPC handlers allowed any renderer (e.g. from XSS) to view or modify any user's profile.
**Learning:** In Electron, any exposed IPC handler can be triggered by the renderer. Relying only on frontend UI hiding for protection is insufficient, all privileged main process handlers must rigorously verify the active session's identity/role.
**Prevention:** Implement strict fail-closed session validation in all user management IPC handlers, confirming the requester is either requesting their own data or possesses a Super Admin role before executing the service logic.
