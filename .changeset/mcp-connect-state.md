---
"@genmotion/desktop": patch
---

MCP connections: one server per marketplace entry (a second Connect resumes the first rather than adding a duplicate), and the main process pushes reachability changes to the renderer so a row flips to Connected the moment an OAuth redirect lands, instead of waiting on a poll the window being backgrounded had paused.
