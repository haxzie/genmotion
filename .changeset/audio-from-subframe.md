---
"@genmotion/cli": patch
---

`genmotion audio add|set --from` keeps the offset into the file to the millisecond instead of snapping it to a frame, so a sound can be trimmed to its transient and land exactly on the frame it is placed on.
