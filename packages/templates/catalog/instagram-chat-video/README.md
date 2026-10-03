# Instagram chat video

A vertical Instagram DM thread, 9:41 on the clock, between you and Maya Rivera
(mayabuilds). Maya types and sends a run of panicked messages: a Tuesday launch,
no launch video, and "what's the best tool for making one??". You type "say
less", then send a link card for genmotion.dev. She asks whether it writes the
scenes itself, you answer "and exports a real MP4", she gets a "Seen" receipt, a
heart lands on the link, a row of 🤯 emoji pops in, and she signs off with "ok
I'm never opening After Effects again". It is a short social ad written as a
conversation.

Started from the [Instagram chat video](https://genmotion.dev/templates/instagram-chat-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1920, 30 fps |
| Length | 1 scene, about 17s |
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
| `components/` | `instagram.tsx`, the Instagram-style avatar, link preview and palette the thread uses |
| `assets/` | Maya's avatar, the link-preview image, a music bed, and the sent and received message sounds |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and ten audio cues |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. Instagram chat (`01-instagram-chat.tsx`): the whole thread in one scene.
   Incoming bubbles land with a sound, typing dots show before each reply, your
   own lines are typed into the composer before they send, and the thread pushes
   up as it fills.

## make it yours

- Rewrite the message list at the top of `scenes/01-instagram-chat.tsx`: each
  entry has its text and the frame it lands on.
- Change the name and handle in the header, and swap `assets/maya-avatar.png`
  for a different face.
- Replace `assets/genmotion-og.png` with the preview image of your own link, and
  change the link text.
- Match the typed lines in the composer list to any outgoing message you edit.
- Swap the music bed or lower its volume in `project.json`.

Try this prompt with your coding agent:

```
Turn this chat into an ad for my bakery. The friend is Sam (@sambakes) asking
where to get a wedding cake by Friday, I reply with a link to sweetcrumb.co,
and the last message is "ok I'm cancelling the other order". Keep the typing
dots, the Seen receipt and the heart on the link.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/instagram-chat-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
