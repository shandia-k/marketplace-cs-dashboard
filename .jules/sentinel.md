## 2024-08-26 - [Path Traversal in Session Cache Clearing]
**Vulnerability:** The `clearSafeCache` function in `session.service.js` lacked validation on cache partitions when calling `session.fromPartition(part)`. This allowed potential path traversal or directory manipulation if malicious partitions were crafted.
**Learning:** Functions managing filesystem operations like cache invalidation must consistently enforce `isValidPartition` validations, as done in other areas of the file.
**Prevention:** Always sanitize and validate IPC-derived data or inputs manipulating system/file state.
