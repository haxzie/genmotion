# Prequel launch video

The line "Introducing Prequel" types in on white while a pointer sweeps along
it, then the camera slides along a macOS-style dock of app icons until the
pointer clicks Prequel. A recording bar opens with capture modes and a face-cam
preview, an editor morphs the recording between layouts, and a preset dock
swings the window through different 3D angles. The video then plays out on a
dark video page, and closes on the Prequel mark with a download URL. It is a
launch video for a screen-recording and editing app.

Started from the [Prequel launch video](https://genmotion.dev/templates/prequel-launch) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 7 scenes, about 47s |
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
| `components/` | shared pieces the scenes reuse: the brand tokens, the pointer, a browser window and the desktop backdrop |
| `assets/` | the Prequel logo and 13 app icons as SVG, a face-cam clip, five screenshots used as video thumbnails, a music bed, a mouse click sound, a "wow" sound and six voiceover takes |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-intro.tsx`, Introducing Prequel: the headline appears letter by letter,
   each glyph shifting from yellow to green to ink, with the pointer riding the
   reveal.
2. `02-dock-click.tsx`, Dock click: the camera travels along a row of 14 app
   icons, stops on Prequel and clicks it.
3. `03-recording-dock.tsx`, Recording dock: the recording bar names each mode
   (entire screen, a window, an area), then the face-cam preview opens.
4. `04-editor.tsx`, Editor: a layout picker morphs the screen and camera between
   Screen, Screen + Camera, Side by side, Stacked and Camera focus.
5. `05-perspective.tsx`, Perspective: the preset dock tilts and dollies the
   window through Flat, Left, Right, Recline and Hero, then Export is chosen.
6. `06-published.tsx`, Published: the export plays on a dark video page titled
   "Introducing Prequel, cinematic screen recordings", with counters ticking up.
7. `07-signoff.tsx`, Sign-off: the mark glides over a soft gradient, "Create
   Cinematic Screen Recordings" and "Made for Apple Silicon" clear, and
   `prequel.sh` takes their place.

## make it yours

- Replace `assets/prequel-logo.svg` and the colours in `components/brand.ts`
  with your own mark and palette.
- Change the headline, the tagline and the URL in `01-intro.tsx` and
  `07-signoff.tsx`.
- Swap the app icons in the dock with the apps your audience uses.
- Record new voiceover takes and drop them into `assets/`, then retime them on
  the timeline in `project.json`.
- Edit the video title and the view and subscriber counts in `06-published.tsx`.

Example prompt for your coding agent:

```
Rebrand this video for "Orbit", a note-taking app. Replace the logo and
brand colours, change the headline to "Introducing Orbit", swap the dock
icons for note and productivity apps, and change the URL to orbit.app.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/prequel-launch)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
