---
"@genmotion/cli": patch
"@genmotion/desktop": patch
---

A project made with `init --template` (or the `create_project` tool) now pins `@genmotion/cli` to the line that created it, as plain `init` already did. Remixes pinned `^0.2.1`, so `npm run dev` started the 0.2 studio, which has no timeline and plays no audio. Projects the app scaffolds now pin `^0.3.0`.
