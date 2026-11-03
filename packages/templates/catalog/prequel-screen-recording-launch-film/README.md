# Prequel screen recording launch film

A 73 second problem and solution film for a Mac screen recorder, told without a narrator. A Slack banner lands on a dark desktop asking for a "quick" demo video, and the cursor selects that one word in red. What follows is an evening: a take ruined by another ping and dragged to the Trash, attempts accelerating to 37, a timeline razored three times, and an export stuck at 99 percent while the time remaining climbs. Then the reply arrives, "You should try Prequel!", the film cuts into daylight, and the same demo is recorded and edited in a couple of minutes.

Remixed from the [Prequel screen recording launch film](https://genmotion.dev/templates/prequel-screen-recording-launch-film) template in the
[GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1080, 30 fps |
| Length | 9 scenes, about 73s |
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
| `components/` | the shared rig: the macOS desktop and its props, the Slack window, the browser, the two editors, the film grade, and `timeline.ts`, which holds every timed event in one place |
| `assets/` | the site capture, app and dock icons, avatars, wallpaper tiles, a webcam clip for the face-cam, the music bed, the click and chime effects, and the keystroke audio with its timing sidecars |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and every audio cue |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-slack-ping.ts` A dark desktop surfaces out of black, a Slack banner slides in asking for a quick demo video, and the cursor drag-selects the word "quick" in red.
2. `02-take-one.ts` Record is clicked, a second ping lands mid-take, the recording is stopped and the thumbnail dragged to the Trash. The counter reads 1.
3. `03-again.ts` Stop the clipped audio, erase the Trash, rename the file, and then the cuts accelerate to 37 attempts and a file called demo_final_v9 (use this one).mov.
4. `04-the-edit.ts` A video timeline is scrubbed and razored three times, the evening passes in the letterbox clock, and the export sits at 99 percent while the time remaining grows.
5. `05-sent.ts` 11:52 PM in Slack. The video is sent, Maya is typing, and her reply is a link preview, the first bright thing in the film.
6. `06-prequel-site.ts` A hard cut into daylight. The camera drifts down the product page to Download for Mac, and the dmg finishes.
7. `07-record.ts` The capture toolbar rises above the dock, window mode picks the Finder window, and a real face-cam bubble pops into the corner.
8. `08-editor.ts` In the editor the camera is moved and resized, a background is picked, and Export becomes its own progress bar.
9. `09-end-card.ts` Black. The wordmark fades up in a handwritten face, with "Made for Mac" under it.

## make it yours

- The premise is two strings in `scenes/01-slack-ping.ts`: the message and the one word the cursor selects. Change those and the film is about something else.
- Every timed event lives in `components/timeline.ts`, and every audio clip in `project.json` is cut to a frame named there. Move a beat in one place and move its clip to match.
- The product is swappable in three files: the page capture in `assets/`, the toolbar and panels in `components/prequel.ts` and `components/prequelEditor.ts`, and the wordmark font in `assets/fonts/`.
- The face-cam in scenes 7 and 8 is a stock clip. Replace `assets/webcam-man-smirk.webm` with your own before publishing anything that implies it is you.
- The typed text in scenes 3 and 5 is drawn from the `.timing.json` beside each keystroke WAV, so new copy needs a new typing take rather than an edited string.

```text
Keep the structure but make it about a design tool instead of a screen
recorder. Rewrite the Slack message, swap the product site capture and the
end card wordmark, and cut the attempts montage in scene 3 from 37 to 12.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are no clocks and no requestAnimationFrame. Everything is a pure function of the frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/prequel-screen-recording-launch-film)
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
