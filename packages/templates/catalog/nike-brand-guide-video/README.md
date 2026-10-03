# Nike brand guide video

A brand guide that talks itself out of the job. The swoosh draws on under a "DO
IT LATER." lockup, then an ink panel wipes in and a palette of overlapping
colour sheets slides across. A type specimen types and backspaces six words,
from "TOMORROW" to "DON'T DO IT.", then nine photos orbit the tagline before
three of them become blocks that resolve into "Don't do it." and glitch into the
mark.

Started from the [Nike brand guide video](https://genmotion.dev/templates/nike-brand-guide-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 5 scenes, about 18s |
| Engine | React scenes |

## open it

Install [GenMotion](https://genmotion.dev/download), then from this folder:

```sh
genmotion .
```

That opens the project, plays it frame by frame, and gives your coding agent the
context to edit it. Export to MP4 from the editor.

## what's in here

| Path | |
| --- | --- |
| `scenes/` | one React component per scene |
| `components/` | the swoosh drawing, the glitch text, and `brand.ts` with the palette, type specimens and outro words |
| `assets/` | two swoosh SVGs (ink and white), nine photos for the collage, a GenMotion mark, and a reference audio bed |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-mark.tsx`, Mark & lockup: the swoosh draws on, the lockup resolves
   beneath it, an ink panel wipes across from the right.
2. `02-palette.tsx`, Palette: colour sheets slide in over each other with their
   hex labels, and the last one floods the frame.
3. `03-specimen.tsx`, Type specimen: words type onto baseline rules with a block
   cursor, trail an accent colour, and backspace away one by one.
4. `04-collage.tsx`, Application collage: the held tagline recedes into depth
   while nine photos orbit it on an ellipse, then three break orbit.
5. `05-outro.tsx`, Tagline & lockup: the three blocks line up into "Don't do
   it.", the line glitches out and the mark glitches in.

## make it yours

- Change the word list, face names and accent colours in `SPECIMEN` in
  `components/brand.ts`.
- Swap the palette hexes in `C` and `BANDS` in the same file.
- Replace the `food-01.jpg` to `food-09.jpg` photos in `assets/` with your own
  product shots.
- Replace the swoosh SVGs in `assets/` with your own mark, and edit `outroWords`
  for the closing line.
- Swap `reference-bed.mp3` for your own track and retime it in `project.json`.

Example prompt for your agent:

```
Rebrand this guide for my coffee shop. Use my logo from assets/logo.svg,
swap the palette to #2B1B12, #C69C6D and #F5EFE6, change the six specimen
words to coffee puns, and replace the photo collage with my menu photos.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [This template's page](https://genmotion.dev/templates/nike-brand-guide-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
