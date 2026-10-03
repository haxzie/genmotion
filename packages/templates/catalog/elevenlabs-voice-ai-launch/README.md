# ElevenLabs voice AI launch video

Phones ring and nobody picks up. A desk phone, a smartphone and a video phone
each ring over a warm paper background, with the lines "To book a job" and "To
schedule a meeting", until the frame floods orange for "Until now." An orb
swells in, becomes a receptionist avatar, and takes a call in a live chat where
a caller asks to book an appointment. Three agent cards then squash into a
gradient bar that gives way to the Reception.ai wordmark. The film is voiced,
with ring and wipe sound effects under a quiet music bed.

Started from the [ElevenLabs voice AI launch video](https://genmotion.dev/templates/elevenlabs-voice-ai-launch) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 13 scenes, about 40s |
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
| `components/` | the phone models and stage, the block and dither wipes, the orb, the paper and orange backdrops, and the agent cards |
| `assets/` | eleven voiceover lines, ring and wipe sound effects, a music bed, two phone mesh files, and the ElevenLabs logo |
| `project.json` | the timeline: scene order, durations, resolution, frame rate, and every audio clip's placement |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

The thirteen scenes fall into five beats.

1. The ringing phones, scenes 1 to 6 (`01-someones-calling.tsx` to
   `06-video-phone.tsx`): "Someone's calling" types and blows up into a
   headline, then a desk phone, a smartphone and a video phone each ring and
   dither in and out block by block, with "To book a job" and "To schedule a
   meeting" between them.
2. Nobody answers, scene 7 (`07-nobody-around.tsx`): "But nobody's around to
   pickup" holds while the paper breaks into blocks and orange floods in.
3. The turn, scenes 8 and 9 (`08-until-now.tsx`, `09-orb.tsx`): "Until now." on
   orange, the frame irises to a disc, and the disc ignites into a breathing
   voice orb that shrinks into an avatar.
4. The demo, scene 10 (`10-chat.tsx`): glass chat bubbles type out a
   receptionist greeting, a caller asking to book an appointment next week, and
   the reply, then the frame dims to black.
5. The close, scenes 11 to 13 (`11-stop-missing.tsx`, `12-agents.tsx`,
   `13-logo.tsx`): "Stop missing calls and opportunities" collapses into a
   Receptionist agent card, the Informational, Receptionist and Reservation
   cards line up and squash into one gradient bar, and "Reception.ai" blurs in.

## make it yours

- Rename the product in `13-logo.tsx` (the "Reception" and ".ai" text) and in
  the agent cards in `12-agents.tsx`.
- Rewrite the chat in `10-chat.tsx`, then replace `vo-06-chat-hi.mp3`,
  `vo-07-chat-caller.mp3` and `vo-08-chat-sure.mp3` so the voice matches the
  bubbles.
- Change the colours and gradients in `components/brand.ts`: paper, orange, the
  dither blues and greens, and the dark close.
- Re-record the other voiceover files in `assets/` and keep each clip's start
  frame in `project.json` lined up with its scene.
- Swap `music-bed.m4a`; it sits at 0.28 volume with a fade in and out.

Example prompt for your coding agent:

```
Retarget this for a dental clinic's AI front desk called Smile Line. Change
the jobs the phones ring for to "To book a cleaning" and "To confirm a visit",
rewrite the chat as a patient rescheduling, and end on Smile Line.ai.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [Announcement video templates](https://genmotion.dev/templates/category/announcement)
- [This template's page](https://genmotion.dev/templates/elevenlabs-voice-ai-launch)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
