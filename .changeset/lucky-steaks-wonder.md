---
"@genmotion/desktop": patch
---

Desktop: never open a blank window.

A quit tears the loopback server down before the process has actually gone. If
the quit then stalls — a prevented window close, an updater handing off to
Squirrel and not coming back — the app lived on holding the single-instance
lock with its server closed, so the dock icon (and every later launch, which
the lock folds into that process) opened a window against a dead port. The
window painted its background colour and nothing else, with no error anywhere,
until the app was force-quit.

The quit is now bounded and backed by `app.exit`, so it always ends the
process; `createWindow` brings the server back if it is down; a main-frame load
failure retries instead of leaving an empty window, and says so plainly if the
retries run out. A second instance no longer starts a server, a menu or a
window on its way out.
