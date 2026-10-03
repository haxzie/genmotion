# Claude MCP launch video

A white-background launch film for Sequel, a tool that connects marketing,
product and finance data to AI agents over MCP. A typed "Introducing Sequel"
flips into "Your team's marketing brain", then a Claude chat window gets the
question "How are users finding my product?" and starts calling Sequel while a
checklist of data sources ticks off. The back half cycles through the kinds of
data and the agents that can reach it, and ends in a browser typing sequel.sh.
Use it to announce an integration where the proof is an agent answering a real
question.

Started from the [Claude MCP launch video](https://genmotion.dev/templates/claude-mcp-launch) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 30 fps |
| Length | 5 scenes, about 34s |
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
| `components/` | `brand.ts` (Sequel colours and type), `claude.ts` (the chat window's look), `integrations.ts` (the source and agent icon table) |
| `assets/` | the Sequel logo, Claude and tool logos as SVG (Google Analytics, Stripe, HubSpot, PostHog, Mixpanel, Cursor, VS Code and more), and a lounge jazz music bed |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

1. `01-intro.tsx` Introducing Sequel: "Introducing" and "Sequel" type in, then
   "Sequel" flips away for "Your team's marketing brain".
2. `02-ask.tsx` Ask Claude: a Claude home screen reads "Good evening", the
   camera pushes to the composer, the question types in, and a cursor clicks
   send.
3. `03-thinking.tsx` Calling Sequel: the header goes from "Thinking..." to
   "Calling Sequel..." while three steps (Google Analytics, search data, PostHog
   sessions) spin and then check off.
4. `04-connect.tsx` Connect your agents: "Connect your agents to your
   [marketing, finance, revenue, product, analytics] data" flips a chip of app
   icons per word, collapses to "Sequel", then "Available for all your" agents
   with Claude Code, Codex, Cursor and VS Code icons. A cursor clicks the chip.
5. `05-agents.tsx` sequel.sh: a browser new-tab page with shortcut tiles,
   "sequel.sh" typed into the box, a click on the go button, and the button
   grows to fill the frame.

## make it yours

- Change the product name and tagline in `01-intro.tsx`, and the colours in
  `components/brand.ts`.
- Replace the question in `02-ask.tsx` (the `PROMPT` constant) with one your
  product can answer.
- Edit the three steps in `03-thinking.tsx` to name your own data sources.
- Swap the cycled words and icon sets in `04-connect.tsx`, and the final URL in
  `05-agents.tsx`.
- Drop your logo into `assets/` in place of `sequel-logo.png`, and replace
  `bgm-lounge-jazz.mp3` if the mood is wrong.

Example prompt for your coding agent:

```
Rebrand this video for Acme Metrics, which connects billing data to AI agents.
Change the question in the Ask Claude scene to "Which plan churns fastest?",
swap the three tool steps to Stripe, Postgres and Mixpanel, and end on acme.dev.
```

Scenes are React components that render from the current frame, so there are no
clocks and no CSS transitions. Everything is a pure function of the frame index,
which is why the preview and the exported MP4 match.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/claude-mcp-launch)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
