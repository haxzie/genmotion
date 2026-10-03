# GenMotion brand grid logo sting

A logo sting on a dark dotted grid. Two anchor tiles slide up first, then a
diagonal staircase of seven tiles rolls through pixel-art icons like slot reels
while the GenMotion logo and wordmark fade up in a merged cell on the right. It
is one scene of about six seconds, with a tile clink sound under it, meant as an
intro or outro for any video.

Started from the [GenMotion brand grid logo sting](https://genmotion.dev/templates/genmotion-brand-grid) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 1 scene, about 6s |
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
| `components/` | the tile roller, the pixel bitmap renderer, and `brand.ts` with the colours and the pixel-art icon set |
| `assets/` | the GenMotion logo image and the `tile-clinks.mp3` sound |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-intro.tsx` (Brand grid loop): the dotted grid draws, two pinwheel-mark
   tiles slide in, seven tiles roll through their icon decks from bottom left to
   top right, and the logo and "GenMotion" wordmark settle into a merged cell.

## make it yours

- Replace `assets/genmotion-logo.png` with your own mark; it is the image beside
  the wordmark.
- Change the word in the `Wordmark` function in `scenes/01-intro.tsx` from
  "GenMotion" to your name.
- Recolour the grid with the `BRAND` tokens in `components/brand.ts`; the two
  anchor tiles use the lime and teal ends of the ramp.
- Edit the pixel-art icons in the `ICONS` set to draw your own, one string per
  row.
- Swap `assets/tile-clinks.mp3` or change its volume in the `audio` list of
  `project.json`.

```
Turn this logo sting into one for Acme: replace the logo with assets/acme.png, change the wordmark to Acme, and recolour the tiles to orange and navy.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [This template's page](https://genmotion.dev/templates/genmotion-brand-grid)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
