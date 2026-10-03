# Types of databases explainer video

A whiteboard explainer that draws itself while a voiceover talks. It opens on
the question "which database should you use?" with a sketched cylinder, then
spends a scene on each of six database types: relational, document, key-value,
graph, time-series and vector. Each type gets a small hand drawn example, a red
pen callout, a "good for" line and three product names. A closing scene pairs
six needs with the type that fits. It is an educational video for anyone
choosing a data store.

Started from the [Types of databases explainer video](https://genmotion.dev/templates/types-of-databases) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 8 scenes, about 56s |
| Engine | Three.js scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent the
context to edit it. Export to MP4 from the editor.

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
| `components/` | shared pieces the scenes reuse: the sketch board that draws strokes, boxes and arrows, the glyphs, the brand colours and the pre-rendered text table |
| `assets/` | eight voiceover clips, one per scene, and a looping background track |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-intro.ts`, Intro: "which database should you use?" is written out, "the
   shape of your data" gets a red underline, and a database cylinder is sketched
   on the right.
2. `02-relational.ts`, Relational: a users table and an orders table are drawn
   row by row, joined by a red "foreign key" arrow.
3. `03-document.ts`, Document: a JSON record is drawn in a code box, with the
   notes "no fixed schema" and "nested, no joins".
4. `04-key-value.ts`, Key-value: three key and value pairs such as `session:42`
   and `cart:ada`, with "~1 ms per lookup" circled in red.
5. `05-graph.ts`, Graph: five people are linked by "follows" edges, with the
   note "3 hops, one query".
6. `06-time-series.ts`, Time-series: a line of timestamped points is plotted,
   with a red box around "last hour".
7. `07-vector.ts`, Vector: words like cat, kitten, truck and bus are scattered
   by meaning, and the query "puppy" lands in the animal cluster.
8. `08-summary.ts`, Summary: "then pick one:" lists six needs, each with an
   arrow to the database type that fits.

## make it yours

- Rewrite the explainer's copy. The on-screen strings are in
  `components/texts.ts`, which is generated, so ask your agent to regenerate it
  rather than editing sizes by hand.
- Change the product names in each scene, for example swap postgres, mysql and
  sqlite for the stack your audience uses.
- Re-record the voiceover clips in `assets/` and retime them in `project.json`
  so each clip lands on its scene.
- Change the pen and paper colours in `components/brand.ts`, such as the red
  used for callouts.
- Add a seventh type by writing a new scene file and adding it to
  `project.json`.

Example prompt for your coding agent:

```
Add a "columnar" scene between time-series and vector, in the same
whiteboard style. Sketch a table split into columns, add a red callout
about fast aggregates, list three example products, and update the
summary scene so it has a seventh row.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Educational video templates](https://genmotion.dev/templates/category/educational)
- [Tutorial video templates](https://genmotion.dev/templates/category/tutorial)
- [This template's page](https://genmotion.dev/templates/types-of-databases)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
