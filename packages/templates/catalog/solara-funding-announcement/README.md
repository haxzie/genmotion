# Solara funding announcement video

A 20 second funding announcement. The raise counts up to $400M and rises into
frame, "Solara announcing $400M" sits between two growing stacks of colour
bars, and "Series F" repeats across five ruled bands that shear apart until the
centre band turns to grass. The valuation prints in halftone on a card before
resolving solid, then "The future of work is on Solara" opens over sky while
industry cards fan out beneath it. It closes on the agentic control plane line
and the Solara lockup settling out of a blur.

Remixed from the [Solara funding announcement video](https://genmotion.dev/templates/solara-funding-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 9 scenes, about 20s |
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
| `components/` | the brand palette and font set, and `kit.ts`, the shared layout toolkit the scenes build from (text measuring, boxes, pictures, clipping, keyframes) |
| `assets/` | five web fonts, six industry card images, two landscape plates, the score and two sound effects |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-counter.ts` Counter: the raise counts up to $400M, rising into frame.
2. `02-announce.ts` $400M: "Solara announcing $400M" between two growing stacks
   of colour bars.
3. `03-series-f.ts` Series F: "Series F" repeated in five ruled bands that shear
   apart, the centre band turning to grass.
4. `04-valuation-card.ts` Valuation card: "$8.4B" printed in halftone on a card,
   resolving solid, with a callout.
5. `05-valuation.ts` $8.4B valuation: the line on navy, growing in three hard
   steps.
6. `06-future-sky.ts` The future of: typed over open sky, growing and sliding
   left.
7. `07-future-work.ts` Future of work: "The future of work is on Solara" with
   manufacturing, healthcare, retail, finance, travel and outsourcing cards.
8. `08-agentic.ts` Agentic control plane: "The agentic control plane for
   enterprises" rises word by word, seen close, then whole.
9. `09-logo.ts` End lockup: the Solara lockup settles out of a blur and holds.

## make it yours

- Change the two numbers that carry the whole piece: the counter target in
  `01-counter.ts` and `02-announce.ts`, and the valuation in
  `04-valuation-card.ts` and `05-valuation.ts`.
- Swap "Series F" in `03-series-f.ts` for your own round.
- Replace the six `card-*.jpg` images in `assets/` with the industries you
  actually serve, and rename their labels in `07-future-work.ts`.
- Retune the palette and the font set in `components/brand.ts`, and put your own
  wordmark in `09-logo.ts`.
- Drop your own track in as `assets/score.mp3` and set its length in
  `project.json`.

Example prompt for your coding agent:

```
Re-skin this for a robotics company called Tessel announcing a $120M Series C at
a $1.9B valuation. Change the industry cards to logistics, warehousing and
agriculture, and make the closing line "The autonomy layer for heavy industry".
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/solara-funding-announcement)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
