## 2024-05-24 - Path Traversal Vulnerability in IPC
**Vulnerability:** The `session.fromPartition(partition)` API was accepting raw, unsanitized strings from IPC channels.
**Learning:** This could allow a compromised renderer process to trigger arbitrary directory creation or deletion outside the intended cache boundaries by passing string literals like `persist:../../`.
**Prevention:** Introduce and enforce a strictly validated regex pattern (like `/^persist:[a-zA-Z0-9_-]+$/`) before consuming partition input in file system or caching APIs.
