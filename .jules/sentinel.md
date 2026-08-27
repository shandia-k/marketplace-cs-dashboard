## 2024-08-27 - [IDOR in get-stores IPC Endpoint]
**Vulnerability:** The `get-stores` IPC handler lacked authorization checks, allowing any authenticated user to supply arbitrary usernames and retrieve store configurations for other users (IDOR), potentially exposing sensitive platform setup details.
**Learning:** While `save-stores` had IDOR protection, the read equivalent `get-stores` did not. Both read and write endpoints must enforce uniform access controls matching the session owner to the target resource.
**Prevention:** Always implement symmetric authorization validation on paired IPC handlers (e.g., getters and setters) to ensure the active session has legitimate access to the requested user resource.
