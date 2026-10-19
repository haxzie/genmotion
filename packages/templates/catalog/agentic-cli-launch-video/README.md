# Agentic CLI launch video

A 19 second launch film for a developer tool, shot as one unbroken camera move
over a pink to orange halftone field. A terminal blooms out of a tile in the
dock and types `npx @sequelsh/cli install` keystroke by keystroke, a pixel
banner glitches in, and the camera pulls back to the whole window: the CLI has
detected seven coding agents on the machine and lists them all as ready. Select
all, confirm, and amber checks ripple down the list while the matching dock
tiles bump. Then a cursor clicks each agent in the dock in turn, each click
typing its own install line and ticking, faster and faster, until the window
genies back into the dock and the product tile hands off into the end card.

Remixed from the [Agentic CLI launch video](https://genmotion.dev/templates/agentic-cli-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 60 fps |
| Length | 1 scene, about 19s |
| Engine | Three.js scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent
the context to edit it. Export to MP4 from the editor.

## or stay in the terminal

```sh
npm install
npm run dev       # studio at http://localhost:4200, reloads on save
npm run check     # compile, determinism and a headless render of every scene
npm run render    # exports/<name>.mp4
```

## what's in here

| Path | |
| --- | --- |
| `scenes/` | one module per scene, drawing into a Three.js canvas |
| `components/` | `brand.ts` (palette, fonts, the agent list, the command, the tagline), `halftone.ts` (the screen-print backdrop shader), `kit.ts` (the 2D layer: text, rounded rects, images, eases) |
| `assets/` | Inter and JetBrains Mono as woff2, the eight agent marks as SVG, four audio tracks (music, typing, dock clicks, UI sounds), and `typing.timing.json` |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-sequel-install.ts` (Sequel install): the whole film. Five movements run
   off one camera rig, with no cuts: the terminal blooming out of the dock and
   the first command typed, the pull back to the detected agent list, the
   select-all and the checks rippling down, the run of per-agent installs
   clicked straight from the dock, and the genie back down into the end card.

## make it yours

- Almost everything you need to change is in `components/brand.ts`: the `C`
  palette, `COMMAND`, `TAGLINE`, and the `AGENTS` list with each slug, display
  name, icon and tile colour. Point those at your own tool and most of the
  film follows.
- The agent marks are `assets/icons/*.svg`. Swap them when you swap the list,
  and drop your own logo in beside them for the end card.
- The beats live in one table, `T`, at the top of the scene, written in
  seconds. Move a number there and that moment moves.
- The camera is the `CAM` array of `[time, x, y, zoom]` keys. Add a key to
  linger somewhere, or flatten the zoom for a calmer read.
- The typing is driven by `assets/typing.timing.json`, which is the plan the
  typing audio was built from. Regenerate both together if you change the
  command, or the keys will drift away from the clicks you hear.

```text
Keep the one-shot camera and the dock-to-terminal staging, but make it for my
CLI: the command is `npm i -g acme`, the tool detects package managers rather
than agents, and the end card uses our green instead of the pink gradient.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## trademarks

Sequel, and the coding agents named and marked in this video, are the
trademarks of their respective owners. This template is unaffiliated reference
work. If you remix it, replace the marks and the wordmark with your own.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/agentic-cli-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio.
Browse more [video templates](https://genmotion.dev/templates) or
[download the studio](https://genmotion.dev/download).
