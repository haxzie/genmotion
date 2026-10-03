# NotchBrowser app launch video

A 28 second teaser shot as one continuous camera move over a Mac desktop, with
no cuts. White words arrive one at a time ("in the ai era, the hard part is")
while a list of everyday AI chores spins past, then the camera pulls back as
windows pile up and pushes through them to "don't make your browser one of
them". A cursor clicks the notch, it opens into a small browser, tabs are
clicked, it collapses, and five claims tick off as a checklist.

Started from the [NotchBrowser app launch video](https://genmotion.dev/templates/notchbrowser-app-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 5 scenes, about 28s |
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
| `scenes/` | one module per scene, drawing into a Three.js canvas; each is a window onto the single timeline in `components/film.ts` |
| `components/` | the shared film timeline and camera (`film.ts`), windows, the notch panel, UI drawing helpers and image loading |
| `assets/` | a wallpaper and dock screenshot, an icons folder, the Inter variable font, a music bed and a set of short sound effects |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-the-hard-part.ts`, The hard part: the headline words wipe in, shrink up,
   and a list of chores with app icons spins past, ending on a question mark.
2. `02-desktop-pileup.ts`, Desktop pile-up: the camera pulls back and
   application windows drop onto the desktop one after another.
3. `03-one-of-them.ts`, One of them: the camera pushes through the pile as
   windows fall away, under "don't make your browser" and "one of them" in
   orange.
4. `04-notchbrowser.ts`, NotchBrowser: the camera pans to the notch, a cursor
   hovers and clicks, the notch grows into a pill and then a browser panel, and
   tabs are clicked before it closes.
5. `05-checklist.ts`, Checklist: the "notchbrowser" wordmark with five ticked
   claims drawing on, one every third of a second.

## make it yours

- Edit the headline words and the chore list (`["spending tokens wisely", ...]`)
  in `components/film.ts`.
- Rewrite the `CLAIMS` array in the same file for the closing checklist.
- Change the `ORANGE` accent and the notch label text for your own product name.
- Replace `assets/wallpaper.jpg` and `assets/dock.jpg` with your own desktop.
- Swap `music-lyria.mp3` and the `sfx-*.mp3` files, and retime them in
  `project.json`.

Example prompt for your agent:

```
Turn this into a launch teaser for my menu bar timer app. Replace the chore
list with five time-tracking annoyances, rename the notch label, change the
orange accent to teal, and rewrite the checklist with my four selling points.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/notchbrowser-app-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
