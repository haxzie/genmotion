---
"@genmotion/desktop": patch
---

HyperFrames is no longer offered for new projects. The engine picker drops the
row, a machine that had already chosen it comes back to the default rather than
going on creating HyperFrames projects with no control left to change it, and
"set this folder up" uses the same engine the composer would have — it had been
pinned to HyperFrames since before that stopped being what a new project is.
Existing HyperFrames projects open, compile, preview and export exactly as
before; this is only the creation side.
