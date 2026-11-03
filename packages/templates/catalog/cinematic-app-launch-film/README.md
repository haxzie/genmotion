# Cinematic app launch film

A 12.6 second launch film for a desktop app, shot like a commercial rather than captured like a demo. Every frame is a real 3D laptop on a lit set, photographed with a genuinely shallow lens, graded to black and white with grain. Eleven shots cut hard on the music: the pointer finds the app in the dock, a prompt is typed, generated scenes fill a grid, a comment is pinned on the preview, keys go down in macro, a mark is drawn on a frame, the timeline shows this very film, five finished videos play on glass, and the export completes.

Remixed from the [Cinematic app launch film](https://genmotion.dev/templates/cinematic-app-launch-film) template in the
[GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 11 scenes, about 13s |
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
| `components/` | the set and the look: `film.ts` (depth of field, grade, grain, letterbox, camera aim and handheld), `macbook.ts`, `screen.ts`, `ui.ts` for immediate-mode interface drawing, `brand.ts` for palette and grade, `footage.ts` for frame-seeked video |
| `assets/` | poster frames for the grids, two preview stills, five short WebM clips for the montage, the music track, and the prompt's typing timing file |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and the music clip |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-dock.ts` A low rolled angle on the dock. The pointer finds the app icon, its name pops up, click.
2. `02-prompt.ts` A steep close-up on the composer as the prompt is typed and focus rides the caret.
3. `03-scenes-grid.ts` Nine generated scene thumbnails at a steep diagonal while the camera slides across them.
4. `04-canvas.ts` A raking angle along the editor canvas as a layer is selected by name.
5. `05-comment.ts` A crosshair finds an object in the playing preview, pins a comment on it and types a change.
6. `06-keyboard.ts` The keyboard deck almost edge on, with a razor-thin plane of focus, as six keys go down.
7. `07-draw.ts` A freehand mark loops around something in the preview and the draw card opens.
8. `09-timeline.ts` The app's timeline, showing this film, with the playhead at the frame you are watching.
9. `10-frames-montage.ts` Hard cuts through five finished videos playing on glass, each at its own angle.
10. `11-export.ts` The export panel from the left, then a hard cut to Save.
11. `12-exporting.ts` Exporting climbs to complete as focus racks from the title to the bar, then black.

## make it yours

- `GRADE` in `components/brand.ts` is the whole look in one object. Set `saturation` to 1 for colour, raise `bar` above 0 for a wider letterbox, and change `grain` and `contrast` to move between film and clean.
- The product is the `UI` and `APP` token objects in the same file plus `LOGO_PATH`. Swap those and every shot follows, because no scene hard-codes a colour.
- The montage in `10-frames-montage.ts` is five WebM segments in `assets/clips/`. Cut your own with ffmpeg to the length each shot needs; they are seeked frame by frame, not played.
- The grids in scenes 3, 4 and 11 all read `FRAMES` in `components/frames.ts`. Replace the images in `assets/frames/` and the labels beside them.
- Durations here are short on purpose: most shots are under a second, and the cut points are the music's. Retiming means moving the scene lengths in `project.json` together with the track.

```text
Keep the black and white macro look but make it about a terminal tool. Replace
the dock shot with a terminal window opening, swap the montage clips for three
of my own, and bring the total up to about 20 seconds.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are no clocks and no requestAnimationFrame. Everything is a pure function of the frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/cinematic-app-launch-film)
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
