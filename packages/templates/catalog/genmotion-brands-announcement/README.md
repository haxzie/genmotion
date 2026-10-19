# GenMotion Brands announcement video

A 16 second feature announcement drawn as one long engineering blueprint on
paper white, with the camera panning left to right across it. It opens on a
hatched arc and the title "BRANDS", lands on a kit of parts (two colour
swatches, the mark in a ring, a type specimen, a stack of reference cards),
then pulls into a big circle where three scene frames take the hex, the mark
and the typeface in turn. The last two stops are the product itself: a cursor
arrives at a composer, clicks a brand chip, and the chip fills with the brand,
then the camera settles on the mark and the call to action. An ink line wipes
the sheet clean at the end.

Remixed from the [GenMotion Brands announcement video](https://genmotion.dev/templates/genmotion-brands-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 1 scene, about 16s |
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
| `components/` | `drawing.ts`, the blueprint toolkit (the palette, stroke batching, canvas-texture labels, and helpers for lines, arcs, circles, rectangles, dashes and arrows), and `mark.ts`, the GenMotion pinwheel as geometry |
| `assets/` | the voiceover, `brands-vo-v2.mp3` |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-brands.ts` (Brands): the whole video. Five stations laid out along a
   single sheet about 6,600px wide, visited by three eased camera pans with a
   slow constant drift underneath so the frame never parks. A, the title
   "BRANDS" under a hatched arc. B, the kit: colours, logo, typeface, assets.
   C, the peak, where three scene frames fill with the brand one after
   another under "EVERY SCENE on brand". D, the composer, where a cursor
   clicks the brand chip. E, the mark and "DOWNLOAD GENMOTION".

## make it yours

- The copy is in `Label` calls in `scenes/01-brands.ts`, each with a name you
  can search for: `headline-brands`, `headline-your-brand`, `headline-every-scene`,
  `headline-composer`, `headline-download`, `cta-url`.
- The palette is `PALETTE` at the top of `components/drawing.ts`. `bg` and
  `ink` carry the blueprint look; `lime` and `teal` are the two swatches and
  the filled scene frame, and they are the fastest thing to change.
- `components/mark.ts` draws the GenMotion pinwheel as geometry. Replace it
  with your own mark, or swap the mesh for a texture of your logo file.
- The voiceover is `assets/brands-vo-v2.mp3`, placed at frame 10 in
  `project.json`. Record your own line, drop it in, and move the station
  timings in the update callback to match.
- The five station x positions (`AX` to `EX`) and the camera's pan keyframes
  are plain numbers near the top and bottom of the scene. Adding a sixth stop
  is a new x constant and one more term in `camX`.

```text
Keep the blueprint look and the camera pan, but make it an announcement for
my API rate limits going up: four stations instead of five, our orange as the
accent, and the end card reading "docs.acme.dev".
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/genmotion-brands-announcement)
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
