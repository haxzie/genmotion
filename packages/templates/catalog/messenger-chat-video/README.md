# Messenger chat video

A vertical Messenger-style chat with Maya, opening on a "Today 9:41" divider.
Her messages arrive with typing dots in between: a Tuesday launch, no launch
video yet, and a plea for the best tool. You type "say less" and send a
genmotion.dev link card, she asks if it really writes the scenes itself, and you
reply "and exports a real MP4". A fire reaction pops onto the link card and Maya
closes with "ok I'm never opening After Effects again". It is a short ad told as
a text thread.

Started from the [Messenger chat video](https://genmotion.dev/templates/messenger-chat-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1920, 30 fps |
| Length | 1 scene, about 15s |
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
| `components/` | `messenger.tsx`, the Messenger-style avatar, link preview and colours |
| `assets/` | Maya's avatar, the link-preview image, a music bed, and the sent and received message sounds |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and nine audio cues |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. Messenger chat (`01-messenger-chat.tsx`): one continuous thread. Bubbles land
   on timed frames with matching sounds, the composer fills as you type, the
   thumbs-up button turns into a send arrow, and the thread scrolls up as new
   messages push in.

## make it yours

- Edit the message list near the top of `scenes/01-messenger-chat.tsx`: text,
  direction (incoming or outgoing) and the frame each one lands on.
- Rename Maya in the header and replace `assets/maya-avatar.png`.
- Put your own link preview image in `assets/genmotion-og.png` and change the
  link line.
- Move the fire reaction by changing `REACTION_AT`, or swap the emoji.
- Change the music bed volume and fades in `project.json`.

Try this prompt with your coding agent:

```
Rewrite this chat as a customer story for my gym app. The friend is Jo asking
how I finally got back into lifting, I send a link to repfit.app, and Jo's last
line is "ok I'm cancelling my other membership". Keep the typing dots and the
fire reaction on the link.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/messenger-chat-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
