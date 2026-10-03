# Template README.md spec

Every folder in `packages/templates/catalog/<id>/` gets a `README.md`.

## Why it exists

A template's files travel with a **remix**: the desktop app copies the catalog
folder into the user's own project, and this `README.md` overrides the
scaffold's generic one. The user then publishes that project to GitHub. So the
file has two jobs:

1. Tell whoever lands on that repo what the video is and how to open it.
2. Carry honest, dense links back to genmotion.dev and the template listing.

## Hard rules

- **No em dashes (—) and no en dashes (–) anywhere.** Use a comma, a colon, a
  full stop, or "to" for ranges. This is a standing author guideline; existing
  repo copy that uses them is not a precedent.
- No invented facts. Every claim about what the video shows must come from the
  template's own `template.json`, `project.json` and `scenes/*`.
- No marketing superlatives about GenMotion ("best", "fastest", "revolutionary").
  Plain and factual.
- Links must be absolute `https://genmotion.dev/...` (a GitHub reader has no
  site-relative context).
- Keep it readable: roughly 60 to 110 lines. Unique prose per template, not a
  reworded boilerplate.
- Match the repo's voice: short declarative sentences, lowercase section
  headings except the H1.

## Required sections, in this order

```
# <template title>

<2 to 4 sentences: what actually happens on screen, beat by beat, and what the
video is for. Written from the real scenes, unique to this template.>

Remixed from the [<title>](https://genmotion.dev/templates/<id>) template in the
[GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | <width>x<height>, <fps> fps |
| Length | <N> scenes, about <S>s |
| Engine | Three.js scenes / React scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent
the context to edit it. Export to MP4 from the editor.

<ONLY for engine "three", because only the three scaffold depends on the CLI:>
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
| `scenes/` | <one module per scene, drawing into a Three.js canvas | one React component per scene> |
| `components/` | shared pieces the scenes reuse |   <only if the folder exists>
| `assets/` | <say what is actually in there: logo, voiceover, music>  <only if the folder exists>
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

<A numbered list, one line each, in `project.json` order: the scene name and
what it does on screen. Use the real file names. For a template with more than
~12 scenes, group them into 4 to 6 beats instead of listing every file.>

## make it yours

<3 to 5 bullets of concrete swaps for THIS video (the copy, the brand colour,
the logo in assets/, the voiceover line, the number that counts up). Then one
example prompt a user could paste to their coding agent, in a fenced block.>

<engine note: for three, "Scenes draw into a Three.js canvas and are seeked
frame by frame, so there are no clocks and no requestAnimationFrame." For
react, "Scenes are React components that render from the current frame, so
there are no clocks and no CSS transitions."> Everything is a pure function of
the frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- <one line per tag in template.json, linking its category page:
   Launch Video -> https://genmotion.dev/templates/category/launch-video
   Announcement -> https://genmotion.dev/templates/category/announcement
   Promotional  -> https://genmotion.dev/templates/category/promotional
   Social Media -> https://genmotion.dev/templates/category/social-media
   Educational  -> https://genmotion.dev/templates/category/educational
   Tutorial     -> https://genmotion.dev/templates/category/tutorial
   Label each honestly, e.g. "[Launch video templates](...)">
- [This template's page](https://genmotion.dev/templates/<id>)
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
```

## Before you finish

- `grep -n '[—–]' README.md` must print nothing.
- Every `genmotion.dev` link above must be present.
- The scene list must match `project.json` exactly (names and order).
