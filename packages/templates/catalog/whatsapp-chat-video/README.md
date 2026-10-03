# WhatsApp chat video

A vertical chat thread plays out in a dark WhatsApp-style screen. Maya, shown in
the header with her avatar, types and then panics that a launch is on Tuesday
and there is no launch video yet. The reply is typed into the input bar, sent,
and followed by a genmotion.dev link preview card. Maya asks if it writes the
scenes itself, gets "and exports a real MP4", and ends the thread with "ok I'm
never opening After Effects again" while a fire reaction pops onto the link
card. It is a short social ad built as a conversation.

Started from the [WhatsApp chat video](https://genmotion.dev/templates/whatsapp-chat-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

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
| `components/` | shared pieces the scenes reuse: the WhatsApp colours, avatar, wallpaper, bubble tails, typing dots, link preview card and composer input |
| `assets/` | Maya's avatar, the link preview image, a background track, and the message sent and received sounds |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-whatsapp-chat.tsx`, WhatsApp chat: the whole thread in one scene. A
   "TODAY" divider appears and Maya's typing dots show, with "typing..." in the
   header. Eight messages arrive on a schedule, three of your replies are typed
   into the composer before they send, a link preview card lands, and a fire
   reaction pops onto the link card near the end.

## make it yours

- Rewrite the conversation in the `SCRIPT` list in
  `scenes/01-whatsapp-chat.tsx`. Each message has a start frame, and the send
  and receive sounds in `project.json` sit on those same frames, so retime them
  together.
- Replace `assets/maya-avatar.png` and the name "Maya" in the header with your
  own contact.
- Replace `assets/genmotion-og.png` and the link text with the preview image and
  URL of your product.
- Change the typed replies in the `COMPOSE` list so they match the outgoing
  messages.
- Swap the music in `assets/` and adjust its volume and fades in `project.json`.

Example prompt for your coding agent:

```
Rewrite this chat as a conversation about a bakery's weekend offer.
Replace Maya with "Sam", change the link preview to bakery.example, keep
the message timings, and update the typed replies to match.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/whatsapp-chat-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
