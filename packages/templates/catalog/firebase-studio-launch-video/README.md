# Firebase Studio launch video

A 45 second product launch film. A warm light sweeps across "You want an app"
and resolves into Faster, Smarter and Safer; the frame clears to white and the
Firebase flame ignites layer by layer inside a typed pill that whips off to the
left. Server racks scroll past "Global infrastructure" and "Zero DevOps", an
orbit of workflow tiles collapses into the Firebase Studio lockup, and a pixel
mosaic carries the Spark and Blaze tiers before a pipeline of pills folds into
one click. It closes on "Build what's next" over a giant hairline flame.

Remixed from the [Firebase Studio launch video](https://genmotion.dev/templates/firebase-studio-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 24 fps |
| Length | 10 scenes, about 45s |
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
| `components/` | the brand kit and flame, measured type and ink placement, the light glow, server racks, the pixel mosaic, pills, the orbit, and the integration marks |
| `assets/` | the Inter Display and JetBrains Mono web fonts, and the soundtrack |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-hook.ts` Hook: "You want an app" under a sweeping warm light, then
   "that's", then Faster, Smarter and Safer each with an icon tile.
2. `02-firebase.ts` Firebase makes it possible: a crosshair lattice blooms on
   white, the Firebase pill types in with the flame lighting one layer at a
   time, whips left trailing a line, and lands on "makes it possible".
3. `03-infra.ts` Global infrastructure: two scrolling server racks on black
   hold "Global infrastructure", then "Zero DevOps", over a
   "Built on Google Cloud" line.
4. `04-platform.ts` One platform: "One platform to build & serve" on the left
   card, with Build, Deploy, Monitor and Scale scrolling through a highlight on
   the right.
5. `05-studio.ts` Firebase Studio: four workflow tiles orbit the flame inside a
   set of rings, the rings collapse into a card, and the Firebase Studio lockup
   types in with a "Prototype, Build, Deploy" badge.
6. `06-paths.ts` Spark to Blaze: a carousel runs "Your app", "backend",
   "users", "data", then "Start free on Spark" and "Scale up on Blaze" cut in
   over a pixel mosaic that darkens and zooms into a single white cell.
7. `07-quality.ts` The app you prototype: Full-stack, More platforms and
   Global scale cut through one at a time, then "The app you prototype is the
   app you ship" types in as a lattice zooms out behind it.
8. `08-checkpoint.ts` Prototype to production: the line turns into pills, a
   Build, Test, Secure, Deploy pipeline slides out from behind Production and
   collapses into a One Click pill the camera pushes into.
9. `09-integrations.ts` Platforms: eight platform marks spiral onto a ring
   around the flame, 45 degrees apart, turning clockwise.
10. `10-outro.ts` Build what's next: the flame as a giant hairline outline
    floods colour, then settles behind "Start today" and firebase.google.com.

## make it yours

- Swap the brand colours in `components/brand.ts` and the flame paths in
  `components/firebase.ts` for your own mark.
- Rewrite the three hook words in `01-hook.ts` (`Faster`, `Smarter`, `Safer`)
  and their icon names.
- Change the two tier headlines in `06-paths.ts` to your own plans, and the
  pipeline pill copy in `08-checkpoint.ts` (`Build`, `Test`, `Secure`,
  `Deploy`).
- Replace the platform marks in `components/integrations.ts` with the SDKs you
  actually ship, and set the closing URL in `10-outro.ts`.
- Drop your own track in as `assets/soundtrack.mp3` and set its length in
  `project.json`.

Motion in this template is measured per frame: most tracks are
`sampled([[frame, value], ...])` tables, and copy is laid out from measured
text widths, so changing a word changes its width and you should re-check its
neighbours.

Example prompt for your coding agent:

```
Re-skin this launch film for a database company called Ledger. Use its navy and
lime palette, change the hook words to Durable, Instant and Audited, make the
two tiers "Start free on Hobby" and "Scale up on Team", and end on
"Start today" over ledger.dev.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/firebase-studio-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
