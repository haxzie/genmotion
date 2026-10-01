# Three.js starter

A motion video, written as code. The frames are a pure function of time, so the
preview and the exported MP4 are the same thing rendered twice.

## Open it

Install [GenMotion](https://genmotion.dev), then from this folder:

```sh
genmotion .
```

That opens the project, plays it, and gives your coding agent the context to
edit it. Export to MP4 from the editor.

## Or stay in the terminal

```sh
npm install
npm run dev       # studio at http://localhost:4200, reloads on save
npm run check     # compile, determinism and a headless render of every scene
npm run render    # exports/<name>.mp4
```

Give any coding agent the same tools and GenMotion's video-type skills with
`npx @genmotion/cli skills add`, which writes `CLAUDE.md`, `.mcp.json` and the
skills (a project made with `genmotion init` has them already).

## What's in here

| Path | |
| --- | --- |
| `scenes/` | one module per scene, drawing into a Three.js canvas |
| `assets/` | images, audio, video the scenes reference |
| `project.json` | the scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

Scenes draw into a Three.js canvas and are seeked frame by frame — no clocks, no `requestAnimationFrame`.

---

Built with [GenMotion](https://genmotion.dev) — an AI motion video studio.
