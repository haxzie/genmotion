# Assemble YC launch video

A 68 second narrated launch film about enterprise change management. Sales
closes a customer in 30 minutes, then the clock turns into "6 weeks" of
implementation: new payment terms, custom pricing, new compliance requirements.
The frame tilts into an isometric plane of the IT estate, follows one change
that starts in Salesforce and must not break years of custom logic, and lands
on where enterprise IT gets stuck, across multiple platforms, undocumented
decisions and everything else. Assemble arrives, composes the change in an
agent workspace, shows the transcript and the architecture it reasoned over,
applies it as a reversible timeline, and closes on "Learn more at assemble.ai".

Remixed from the [Assemble YC launch video](https://genmotion.dev/templates/assemble-yc-launch-video) template in the [GenMotion template gallery](https://genmotion.dev/templates).

| | |
| --- | --- |
| Format | 1920x1080, 25 fps |
| Length | 19 scenes, about 68s |
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
| `components/` | the stage and camera fit, the easing set, measured type, SVG plane and texture helpers, rings, and the bottom glow |
| `assets/` | the Inter variable font, seven platform marks as SVG, one raster mark, the voiceover stem and the score |
| `project.json` | the timeline: scene order, durations, resolution, frame rate |
| `CREDITS.md` | the music attribution, which the licence requires you keep |
| `AGENTS.md` | how to edit this project, for a coding agent |

## the scenes

Nineteen scenes in five beats.

1. **The gap** (`01-sales-closed.ts`, `02-thirty-minutes.ts`,
   `03-six-weeks.ts`) Sales closes the customer in 30:00 minutes, the clock
   becomes 6 weeks of implementation, and the terms that caused it stack up.
2. **The estate** (`04-iso-plane.ts`, `05-salesforce.ts`,
   `06-without-breaking.ts`) The frame tilts into an isometric plane, one
   change starts in Salesforce, and it has to land without breaking years of
   custom logic.
3. **Where it sticks** (`07-gets-stuck.ts`, `08-multiple-platforms.ts`,
   `09-undocumented.ts`, `10-everything-else.ts`) Enterprise IT gets stuck
   across multiple platforms, undocumented decisions, and how one change
   affects everything else.
4. **Assemble** (`11-assemble.ts`, `12-composer.ts`, `13-transcript.ts`,
   `14-aws-diagram.ts`, `15-change-cards.ts`, `16-agent-trace.ts`) The brand
   lands, the composer takes a CSV as the source, the transcript shows the
   reasoning and the governed writes, an architecture diagram and a change
   timeline fill in, and the agent trace runs end to end.
5. **The close** (`17-weeks-coordinating.ts`, `18-assemble-end.ts`,
   `19-learn-more.ts`) Instead of spending weeks coordinating solution
   architects, the lockup resolves and the film ends on assemble.ai.

## make it yours

- The two numbers that set up the whole film are in `01-sales-closed.ts` and
  `02-thirty-minutes.ts` (the 30:00 clock) and `03-six-weeks.ts` (the 6 weeks).
- Swap the platform marks in `assets/` and their use in `05-salesforce.ts`,
  `08-multiple-platforms.ts` and `12-composer.ts` for the systems you integrate
  with.
- Rewrite the product beats: the composer in `12-composer.ts`, the transcript
  lines in `13-transcript.ts`, the architecture labels in `14-aws-diagram.ts`,
  and the change cards in `15-change-cards.ts`.
- Set the closing URL in `19-learn-more.ts` and the lockup in
  `18-assemble-end.ts`.
- Replace `assets/vo.m4a` with your own narration. It is one stem across the
  whole film, so re-cut it to the same 1696 frames or retime the scenes to fit.

Example prompt for your coding agent:

```
Re-skin this for an observability company called Parallax. The problem is an
incident that takes four hours to trace across six services, the platforms are
Datadog, PagerDuty and GitHub, and the close is "Learn more at parallax.dev".
Rewrite the transcript scene for a root-cause trace rather than a Salesforce
deployment.
```

Scenes draw into a Three.js canvas and are seeked frame by frame, so there are
no clocks and no requestAnimationFrame. Everything is a pure function of the
frame index, which is why the preview and the exported MP4 match.

## credits

The music is "Hyperfun" by Kevin MacLeod, used under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See `CREDITS.md`.
The licence requires attribution, so keep that file (or its text) with any
version you publish. The platform marks are the trademarks of their owners and
are here to stand in for your own integrations.

## more templates

- [All video templates](https://genmotion.dev/templates)
- [Launch video templates](https://genmotion.dev/templates/category/launch-video)
- [Promotional video templates](https://genmotion.dev/templates/category/promotional)
- [This template's page](https://genmotion.dev/templates/assemble-yc-launch-video)
- [Showcase](https://genmotion.dev/showcase)

## docs

- [Quickstart](https://genmotion.dev/docs/quickstart)
- [Project structure](https://genmotion.dev/docs/project-structure)
- [Connect your agent](https://genmotion.dev/docs/connect-your-agent)
- [Rendering and export](https://genmotion.dev/docs/rendering)
- [CLI reference](https://genmotion.dev/docs/cli)

---

Built with [GenMotion](https://genmotion.dev), an AI motion video studio. Browse more [video templates](https://genmotion.dev/templates) or [download the studio](https://genmotion.dev/download).
