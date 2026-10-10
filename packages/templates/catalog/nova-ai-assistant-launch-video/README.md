# Nova AI assistant launch video

A 102 second launch film for Nova, an AI assistant. "Introducing" sweeps in from
the right and whips off the left edge over a travelling colour band, "One
assistant for every project" blurs in word by word over a dot floor, and the
words collapse into a single glowing star that the camera falls into. From there
the film works through what the assistant does: a ring of app tiles orbits
"Plugged in", a prompt types itself into a composer and a cursor clicks send,
a step list builds while Nova maps out a spring launch, glowing orbs drop off
helper pills on a night stage, and a travelling shot runs down a row of tilted
screens where Nova lives. It closes on a wall of privacy safeguards, a vortex of
dots, and the Nova lockup on white.

Remixed from the [Nova AI assistant launch video](https://genmotion.dev/templates/nova-ai-assistant-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 15 scenes, about 102s |
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
| `components/` | the palette and copy (`brand.ts`), the camera locked pixel stage and keyframe tracks (`stage.ts`), measured and blurred shader type (`type.ts`), the backdrop glow and particle effects (`fx.ts`), the ground dot lattice (`dotgrid.ts`), the canvas drawn product UI and the Nova mark (`ui.ts`), and the per frame motion curves (`ref-curves.ts`) |
| `assets/` | the Inter variable web font, an ambient music bed and a sound effects track |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

The 15 scenes fall into five beats.

1. **The hook** (`01-introducing.ts`, `02-every-project.ts`): "Introducing"
   whips across the frame, "One assistant for every project" blurs in over a dot
   floor, the words collapse into one star, and the star blooms open into a
   lattice with four neon streaks drawing on to their nodes.
2. **What it is** (`03-made-to-listen.ts`, `04-your-craft.ts`): "Made to listen"
   lands from far away with an accent sweep, then a three line picker rolls
   through "your craft", "your crew", "how you create".
3. **Using it** (`05-workspace.ts`, `06-plugged-in.ts`, `07-mapping-it-out.ts`,
   `08-team-of-helpers.ts`): the camera pulls back from a window corner to the
   whole workspace, a prompt types itself and a cursor clicks send, a ring of app
   tiles orbits "Plugged in", Nova builds a scrolling plan and asks a follow up
   question, and a ring of glossy shapes bursts out of "Building a team".
4. **What it does for you** (`09-works-in-the-cloud.ts`, `10-while-you-rest.ts`,
   `11-wherever-you-work.ts`, `12-pick-the-brain.ts`): orbs streak in on neon
   trails and drop off helper pills on a night stage, a finished task lifts off
   the home screen, a travelling shot passes phone, browser, laptop, terminal,
   docs and chat, and a cursor opens the model chip to unfold Nova Swift, Nova
   Deep and Nova Lite.
5. **The close** (`13-stays-private.ts`, `14-every-task-lighter.ts`,
   `15-end-card.ts`): three glowing rings stretch into a cascading wall of
   privacy safeguards, a spiralling vortex of dots carries "Every task, lighter"
   with a scrambling last word, and an orb floods the frame into the Nova lockup
   and its address.

## make it yours

- `components/brand.ts` holds the palette and the opening copy in one place, so
  a re skin starts there: `COLOR.accent`, `COLOR.navy`, `COLOR.night` and the
  `COPY` block that drives scenes 1 to 4.
- The product name appears as a wordmark in `15-end-card.ts` and as a drawn mark
  in `components/ui.ts` (`markPlane`). Swap both, and set the closing address.
- `12-pick-the-brain.ts` lists the model tiers (Nova Swift, Nova Deep, Nova
  Lite) and `13-stays-private.ts` lists the safeguards. Both are plain arrays of
  strings, and both read well with your own.
- `05-workspace.ts` and `07-mapping-it-out.ts` carry the demo narrative: the
  typed prompt, the step list, the greeting and the file names. Rewrite them for
  what your product actually does.
- Replace `assets/nova-ambient-bed.mp3` and `assets/nova-sfx.mp3` with your own
  audio, and set the lengths in `project.json`.

Motion here is measured per frame. Several scenes sample tables from
`components/ref-curves.ts` or `track([[frame, value], ...])` keys in
`components/stage.ts`, and type is positioned from measured text widths, so
changing a word changes its width and its neighbours are worth re checking.

Example prompt for your coding agent:

```
Re skin this launch film for a code review assistant called Patch. Use its black
and amber palette, change the opening line to "One reviewer for every pull
request", rename the three model tiers to Patch Quick, Patch Deep and Patch
Audit, and end on patch.dev.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/nova-ai-assistant-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
