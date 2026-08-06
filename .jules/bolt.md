## 2024-05-24 - [Debounce Sync I/O in Input Listeners]
**Learning:** The application performs synchronous I/O (`localStorage.setItem`) alongside full DOM reconstructions on every single keystroke in the scratchpad and search inputs. This synchronous blocking on the main thread can cause noticeable typing stutter, especially when data size grows.
**Action:** Implemented a debounce function for heavy input listeners to prevent main thread blocking and ensure smooth typing performance.
