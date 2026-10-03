# Codex launch video

A voice prompt turns into a running app. The word "speak" glitches into a
microphone button, the camera dives inside it to a waveform pill, and a prompt
box types "Build me a website" and swaps the ending to "an app" and then "a
tool". A cursor clicks send, finished dashboards spiral out of the centre, and a
blue bloom condenses into the Codex mark. It closes on "this is Codex." over a
dusk sky.

Started from the [Codex launch video](https://genmotion.dev/templates/codex-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 9 scenes, about 21s |
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
| `components/` | the blurred-word effect, the Codex blob, cursors and their motion path helpers, and a fisheye lens used on the prompt shot |
| `assets/` | five dashboard screenshots, a looping meadow video and still, a looping dusk video, a cursor glyph, and the soundtrack |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-you-just-speak.tsx` You just speak: "You just speak" blurs in, "speak"
   glitches into a mic button, a cursor lands on it and the camera pushes in.
2. `02-voice-pill.tsx` Voice → Your idea: inside the mic, a waveform pill and a
   caption chip, then "Your idea" takes over.
3. `03-builds-for-you.tsx` And it builds for you: three blurred words, with "for
   you" kept light blue.
4. `04-prompt-box.tsx` What should we work on?: a prompt over a meadow loop, a
   fast punch-in, and "Build me a website" changing to "an app" and "a tool"
   while a cursor traces beneath it.
5. `05-send.tsx` Send: an extreme close-up of the cursor clicking send, with the
   button flooding the frame.
6. `06-dashboards.tsx` The builds: blue placeholder cards orbit the centre and
   resolve into five finished app screenshots.
7. `07-rings.tsx` Rings → mark: ripples expand while a blue bloom condenses into
   the Codex mark.
8. `08-no-complex.tsx` No complex syntax: the blob writes "No complex syntax",
   "No learning" and "No complex curve" like a pen, then swells into the logo.
9. `09-this-is-codex.tsx` This is Codex: a dusk cosmos loop, the app icon, "this
   is Codex.", then "Where ideas turn into code".

## make it yours

- Change the typed prompt in `04-prompt-box.tsx` (`TYPED` and the three
  suffixes) to a request your users actually make.
- Replace the five `dash-*` images in `assets/` with screenshots of what your
  product builds, and update the imports in `06-dashboards.tsx`.
- Edit the three lines in `08-no-complex.tsx` for your own pitch.
- Retint the blues in `components/brand.ts`, and swap the tagline in
  `09-this-is-codex.tsx`.
- Replace `soundtrack.m4a` with your own track and set its length in
  `project.json`.

Example prompt for your coding agent:

```
Make this launch video for a spreadsheet agent called Tally. Change the prompt
to "Build me a budget", use these five screenshots in the builds scene, and end
on "Tally. Where numbers add themselves up."
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/codex-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
