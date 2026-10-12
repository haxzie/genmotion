---
"@genmotion/three-engine": minor
"@genmotion/cli": patch
"@genmotion/desktop": patch
---

three-engine: `withFonts` moves into the engine, and a swapped font file is seen

Every Three.js project carried its own copy of the font loader, and each copy
skipped a face whose **family name** was already in `document.fonts`. An export
opens a fresh window per capture, so it always drew the newest file; the editor
keeps one document alive across every rebuild, so it kept drawing the first one.
Changing the file behind a family was a no-op in the preview and correct in the
render — the same project looking like two different videos.

`withFonts(ctx, files, build)` is now exported from `@genmotion/three-engine`,
host-provided at runtime, and tracks each face by the URL it loaded from (per
family + weight + style slot), so changing the import is all a font swap takes.
A file also takes `variation`, which pins variable-font axes: canvas 2D has no
`font-optical-sizing`, so an `opsz` face drew its small-text design at any size.
