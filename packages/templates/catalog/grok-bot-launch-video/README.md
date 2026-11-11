# Grok Bot launch video

"Introducing Grok Bot 1.0" opens on a scatter of coloured bots, the purple one
turns toward camera in extreme close-up, and a chat notification says the
headphone launch is in two weeks. From there the bot is invited into a call,
takes the fourth seat in a 2x2 video grid, reads tester feedback off a chart,
tags the other bots in a channel, retypes a campaign headline in a design tool
while the product turns in 3D beneath it, flies a deck to the revenue slide and
flags the confidential one, and ships the campaign while the reaction counts
climb. It closes on "Say hi to your new teammates" and five bots collapsing
into the mark. It is a launch film for an AI agent that works alongside a team.

Remixed from the [Grok Bot launch video](https://genmotion.dev/templates/grok-bot-launch-video) template in the
[GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 11 scenes, about 79s |
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
| `components/` | shared pieces the scenes reuse: the bot characters, the shaded bot sphere, the reference pixel stage, the chat furniture, the shadowed panel and cursors, the media tile, the procedural headphones and the footage helper |
| `assets/` | four web fonts, the soundtrack, three video call clips with their poster stills, two avatars, the campaign ads and renders, three deck slides and a cursor icon |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-open.ts`, Open: the title card, an extreme close-up of the bot turning
   away, and a Launch Bot notification on lavender.
2. `02-introducing.ts`, Introducing: "Introducing", "Grok", "Bot" land one word
   at a time and a beta tag flips to a 1.0 pill that bursts five bots.
3. `03-call.ts`, Call: a call pill builds, "Hey, can you join the call at 10?"
   slides across in giant type, and a cursor clicks Admit.
4. `04-video-call.ts`, Video call: three portrait tiles and a join request
   reflow into a 2x2 grid with the bot in the fourth seat.
5. `05-learns.ts`, Learns: the interstitial line "Learns and makes
   recommendations".
6. `06-research.ts`, Research: the camera dives into the chat, the bot becomes
   a cursor, reads the tester feedback curve and offers to ping marketing.
7. `07-other-bots.ts`, Works with other bots: a channel thread tags marketing
   and Copy Bot, who answers "I'm on it." and joins the avatar stack.
8. `08-design.ts`, Design: the headline is selected and retyped in a design
   tool, the headphones turn under it, and the ad variants pan past.
9. `09-business.ts`, Knows your business: a deck flies to "Year one: $8M in
   revenue." and the bot flags the sensitive slide before sharing.
10. `10-launch.ts`, Campaign live: the finished ads fly past, the red one
    lands, and the reaction counts climb under a clicking cursor.
11. `11-outro.ts`, Say hi: "Say hi to your new teammates", five bots fidget in
    a row, then collapse into the Grok Bot lockup.

## make it yours

- The cast lives in `components/bots.ts`. A teammate is one entry in
  `BOT_COLOR` plus a name in the scenes, so adding or renaming a bot is a
  two line change.
- The palette and the type stack are in `components/brand.ts`, read by every
  scene.
- The story is the fictional "Pendel Arc" headphone launch. Its copy is in the
  scene files: the notification, the chat lines, the headline "A lighter fit
  for longer days", the revenue slide and the launch post.
- `components/headphones.ts` builds the product in code, from Three.js
  primitives, so swapping the hero object means editing geometry rather than
  sourcing a model.
- The three video call clips, the two avatars, the campaign ads and the deck
  slides are placeholders carried over from the film this project was built
  against. Replace them with your own footage and artwork before you publish a
  remix. `components/footage.ts` is the part to keep: it seeks a video texture
  from the frame instead of playing it, so real footage stays deterministic.

```text
Rename the bots after our own agents, change the palette to our brand colours,
and rewrite the campaign as a running shoe launch instead of headphones.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/grok-bot-launch-video)
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
