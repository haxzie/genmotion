---
"@genmotion/desktop": patch
---

Preview: let a project's own fonts load.

The renderer's CSP listed `gm-asset:` in img-src and media-src but not in
font-src, so every `new FontFace(family, url(gm-asset://…))` a scene makes was
blocked — in the preview only, since the offscreen capture page has no CSP.
The editor drew every text texture in a fallback face while the render and the
timeline filmstrips showed the real one, and because a scene catches the load
failure (a missing font must not hang an export) nothing said why.

Also: the Three.js stage draws again after a rebuild remounts the render host.
Every project change hands it a fresh compiled scene list, but the only thing
that draws while paused was keyed on the playhead, so the new host was never
asked for a frame and its canvas stayed empty until the playhead moved.
