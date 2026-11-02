# Link MCP agent payments launch video

A square, dark green launch film about letting an AI agent pay for things with
your card, without handing it your card. It opens in a terminal: someone types
`install link using` and pastes a skill URL, and the agent's output streams back
line by line, ending on a device code and a passphrase. The wallet's consent
screen then lists what you are agreeing to, an agent proposes a $180 itinerary
change in chat, a spend request lights up a phone lock screen, Face ID approves
it, and a receipt lands. It closes on the Link mark. Use it when the story is a
human approving something an agent wanted to do.

Remixed from the [Link MCP agent payments launch video](https://genmotion.dev/templates/stripe-link-mcp-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1080x1080, 30 fps |
| Length | 6 scenes, about 28s |
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
| `scenes/` | one module per scene, drawing into a Three.js canvas |
| `components/` | `brand.ts` (the green palette and the two type stacks), `stage.ts` (the orthographic camera where 1 unit is 100 design px, plus the canvas plane and easing helpers), `type.ts` (one line of text as a textured plane, and multi coloured terminal runs), `backdrop.ts` (the dark field, the framed card and the glowing dot grid), `phone.ts` (the phone hardware, lock screen and app sheet that scenes 4 and 5 share) |
| `assets/` | the Link wordmark and app icon as PNG, and the soundtrack |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-terminal.ts` Terminal: `install link using` types in on an irregular
   keystroke rhythm, a skill URL pastes in green and cools to white, then the
   framed card arrives and the agent's output streams in, down to
   `apple-grape-orange` and a `Waiting for approval...` line whose dots cycle.
2. `02-connect-agent.ts` Connect an agent: a light consent screen with an
   extruded, clearcoated 3D code tile floating above it, three rows explaining
   agentic purchases, virtual card numbers and spend approval, and a Continue
   button that presses and goes disabled.
3. `03-agent-chat.ts` Agent chat: a monospace chat where the user asks to stay
   in New Orleans another night, the agent finds the room and a discount, and a
   green glowing Summary of changes card breaks down `+$210`, `-$30` and a
   `$180` total before the user replies `Yes`.
4. `04-spend-notification.ts` Spend notification: the phone fades up on its lock
   screen and an `Approve spend request` banner for `Triplo, $180` drops into
   place, then lifts towards the viewer.
5. `05-approve-and-receipt.ts` Approve and receipt: the approval sheet reads
   `openclaw-jane wants to spend $180` over merchant, room and card rows,
   Approve is pressed, the screen dims for a Face ID scan that resolves into a
   sweeping ring and a tick, and the receipt fades up with its status, payment
   and agent rows.
6. `06-link-logo.ts` Link logo: the mark lands centre frame with a small
   overshoot and then breathes.

## make it yours

- Change the whole look from `components/brand.ts`: `bg` and `card` set the dark
  field, `green` is the logo green and `termGreen` the highlighted terminal
  tokens.
- Rewrite the terminal in `01-terminal.ts`. The `lines` array holds the copy,
  its colour runs and the frame each one appears on, and `keyFrames` is the
  typing rhythm of the prompt above it.
- Swap the three promises in `02-connect-agent.ts` (the `rows` array) and the
  `GLYPHS` drawn into their circles for whatever your product is asking consent
  for.
- Change the purchase everywhere it appears: the `rows` in the summary card in
  `03-agent-chat.ts`, the banner copy in `04-spend-notification.ts`, and the
  merchant, room, card and receipt rows in `05-approve-and-receipt.ts`.
- Replace `assets/link-logo.png` and `assets/link-app-icon.png` with your own
  mark and icon, and the soundtrack in `assets/` if the mood is wrong.

Example prompt for your coding agent:

```
Rebrand this for Pilot, an agent wallet with a deep blue palette. Change the
terminal install to "install pilot using https://pilot.dev/skill.md", make the
purchase a $64 grocery order from Freshline instead of the hotel night, and
rename the agent to pilot-sam everywhere it shows.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/stripe-link-mcp-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
