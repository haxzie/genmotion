# Grok chat announcement video

A square group-chat announcement, shot as one continuous scroll. Benji asks
what time to leave for SFO, Alex guesses, Benji pushes back about security, and
then someone asks the assistant in-thread: "grok, what time should we leave".
It types, then answers with the drive, the terminal security wait and the gate
time. Alex agrees, the thread ends on "thanks grok" with a thumbs-up reaction,
and the frame fades out. Typing dots, timed bubbles and message sounds
throughout.

Remixed from the [Grok chat announcement video](https://genmotion.dev/templates/grok-chat-announcement) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1080, 60 fps |
| Length | 3 scenes, about 12s |
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
| `scenes/` | one module per scene, each showing a stretch of the same chat |
| `components/` | `chat.ts`, which holds the whole script, the bubble layout and the scroll, and `brand.ts` for the palette and metrics |
| `assets/` | three avatar images and the send and receive sounds |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

The chat is one continuous take. `components/chat.ts` owns the entire thread,
and each scene shows a stretch of it from a given source frame, so the cuts are
seamless.

1. `01-group-chat.ts` Group chat: the airport question, the guess, and the
   pushback about security.
2. `02-ask-grok.ts` Ask the assistant: "grok, what time should we leave", the
   typing indicator, and the answer with traffic and security times.
3. `03-thanks.ts` Thanks and outro: "ok 520", "thanks grok", the thumbs-up
   reaction, and the fade.

## make it yours

- Rewrite the conversation in the `SCRIPT` array in `components/chat.ts`. Each
  entry has its `who`, its `lines`, and the frame it lands on, so you can retime
  the beats as well as reword them. Bubble `width` and `height` are given per
  message, so resize them when the copy changes length.
- Swap the three `avatar-*.jpg` images in `assets/` and the display names on the
  messages.
- Retint the bubbles and the background in `components/brand.ts`, where
  `LAYOUT.avatar` also sets the avatar size.
- Replace `sfx-send.mp3` and `sfx-receive.mp3`, and adjust where they sit in
  `project.json`.
- Move `OUTRO` in `components/chat.ts` to fade earlier or later.

Example prompt for your coding agent:

```
Rewrite this thread for a food delivery assistant. Three friends argue about
where to order dinner, someone asks the assistant in-thread, and it answers with
a restaurant, the delivery time and the price. Keep the same pacing and the
thumbs-up at the end.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [This template's page](https://genmotion.dev/templates/grok-chat-announcement)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
