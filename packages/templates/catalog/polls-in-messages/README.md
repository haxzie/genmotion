# Polls in Messages social ad video

A vertical ad for a group-chat poll. Friends planning a trip trade messages
under "The group chat can't decide." Someone writes "everyone STOP. poll
incoming", a poll titled "Where are we going?" lands with Tokyo, Lisbon and
Mexico City, a finger taps Tokyo and the votes roll in. The camera pulls back
out of the phone to "New in Messages" and "Drop a poll. Get an answer."

Started from the [Polls in Messages social ad video](https://genmotion.dev/templates/polls-in-messages) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1920, 30 fps |
| Length | 3 scenes, about 20s |
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
| `components/` | the chat UI, the phone frame, emoji, design tokens, and `script.ts` with every message and the poll |
| `assets/` | five avatars, emoji SVGs, a looping guitar track, and ping, send and tap sound effects |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, sound cues |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-groupchat.tsx`, Group chat: five messages about an April trip arrive
   under the headline "The group chat can't decide.", then the camera pushes
   into the screen.
2. `02-poll.tsx`, The poll: the chat chrome settles, more people argue, a typing
   bubble appears, the poll drops in, a finger taps the first option and four
   more votes land.
3. `03-payoff.tsx`, Payoff: the camera pulls back through the screen to reveal
   the phone, with a soft blue glow and the closing lines.

## make it yours

- Rewrite the conversation, poll question and options in `components/script.ts`.
- Edit the three headlines in the scene files, and the "New in Messages" eyebrow
  in `03-payoff.tsx`.
- Swap the avatars in `assets/` for your own people.
- Change the blue accent and other tokens in `components/brand.ts`.
- Replace `bgm-blues-guitar-loop.mp3` and retime the pings in `project.json`.

Example prompt for your agent:

```
Change the poll to a team lunch vote. Question "Where's lunch?", options
Pizza, Sushi and Burritos, rewrite the chat so five coworkers argue about it,
and change the final line to "Skip the debate. Ask the group."
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Social media video templates](https://genmotion.dev/templates/category/social-media)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [This template's page](https://genmotion.dev/templates/polls-in-messages)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
