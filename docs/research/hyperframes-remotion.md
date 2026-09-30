# HyperFrames vs Remotion: how agents make video today, and where GenMotion wins

*Research note for the GenMotion team, 2026-09-30.*

**Sources.** The vendored HyperFrames skill pack in `packages/hyperframes/plugin` (synced from upstream tag `v0.8.34` on 2026-09-11; upstream `main` is at `0.8.97`), and both upstream repos read from raw.githubusercontent.com. The docs sites (hyperframes.heygen.com, remotion.dev) are blocked from the research sandbox, so their pages are cited through the MDX sources on GitHub. Version numbers and prices below are as of this date and change often.

---

## 1. TL;DR

- **HyperFrames (HeyGen) is built for agents first.** A video is plain HTML with `data-*` timing attributes and one paused GSAP timeline per composition. There is no build step. The CLI never prompts, supports `--json` everywhere, and gives a lint → check → snapshot loop with machine-readable findings. The project is Apache-2.0 with no per-render fees.
- **Remotion is built for React developers first.** A video is a React component that reads `useCurrentFrame()`. A webpack bundle step is required. The ecosystem is mature (Lambda, Player, `@remotion/three`, a client-side renderer), but the license is **source-available**: any company with more than 3 people pays, and "automated" products such as prompt-to-video tools pay **$0.01/render with a $100/month minimum**.
- **Remotion deprecated its own MCP server**, partly because "agents do not invoke them reliably". It now leans on skills plus Markdown docs. HyperFrames also avoided MCP and ships a large skill pack (21 skills upstream, about 4,700 lines of SKILL.md in our 17-skill vendored copy) with a router and an intent interview.
- **Both depend on the agent following prose correctly.** HyperFrames' first builds still hit documented "guaranteed" lint failures, and many of its failures are silent (for example, `<audio>` without an `id` renders with no sound). Remotion requires correct React and frame math from the agent.
- **Determinism depends on the platform.** HyperFrames' atomic `BeginFrame` capture only runs on Linux headless-shell; macOS and Windows fall back to screenshots, and it recommends `--docker` for exact output. Remotion always uses `Page.captureScreenshot` per tab.
- **3D is an add-on in both.** Remotion needs React Three Fiber inside `<ThreeCanvas>`. HyperFrames' three adapter dispatches a seek event and the author has to write `renderAt(t)` and declare the duration by hand.
- **GenMotion's opening:** a Three.js-first, frame-deterministic engine that is TypeScript scene builders rather than React or HTML, plus a small typed MCP surface that returns images and structured errors. The CLI would be installable from npm, non-interactive and `--json`, with the same SwiftShader capture path on every OS and a starter repo that comes pre-wired for agents. Apache-2.0, no per-render fees.

---

## 2. HyperFrames

### 2.1 Composition model

- **The root** is `<div data-composition-id data-width data-height [data-duration] [data-fps]>` ([compositions.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/concepts/compositions.mdx); `plugin/skills/hyperframes-core/SKILL.md`).
- **Clips.** Any element with `data-start` and a duration is a clip. `class="clip"` is only a convention, and `data-track-index` is a Studio display lane that does not affect timing.
- **Sub-compositions** load through `data-composition-src="compositions/x.html"` and are wrapped in `<template>`. The top-level `index.html` must not be wrapped.
- **Other attributes:** `data-media-start`, `data-volume`, `data-playback-rate`, `data-hidden`, `data-composition-variables` (these drive `--variables` batch renders).
- **A new project** (`init`) contains `index.html`, `hyperframes.json` (registry URL and paths), a `package.json` whose scripts pin `hyperframes@<version>`, `meta.json` and `assets/`. Registry blocks install into `compositions/`.

### 2.2 Timing and seeking

- Time is measured in seconds. A frame's time is `floor(frame)/fps`, computed with integer math and never read from a clock ([determinism.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/concepts/determinism.mdx)).
- Each composition registers **exactly one paused GSAP timeline** at `window.__timelines["<id>"]`. The runtime nests child timelines into the parent.
- The root `data-duration` is read once at compile time. When it is missing, the duration is inferred from the timeline, the media or an adapter.
- Renders never play the page. The engine calls the runtime's `window.__hf` seek protocol, and every adapter moves to time *t*. The framework seeks or decodes `<video>`/`<audio>` itself.
- **What the linter bans:** `Date.now`/`performance.now`, unseeded `Math.random`, network fetches during render, `repeat:-1`, and tweening `display`/`visibility` on a clip (`plugin/skills/hyperframes-core/references/determinism-rules.md`).

### 2.3 Adapters

The `FrameAdapter` interface is `{id, init, getDurationFrames, seekFrame, destroy}` and is marked **"experimental v0"** ([frame-adapters.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/concepts/frame-adapters.mdx)).

| Adapter | Mechanism | Notes |
|---|---|---|
| GSAP | Seeks the registered paused timeline | The default; one timeline per composition |
| CSS / WAAPI / Anime.js | Pauses the animations and sets `currentTime` | |
| **Three.js** | Sets `window.__hfThreeTime` and dispatches `CustomEvent("hf-seek",{detail:{time}})`. **The author** writes `renderAt(time)` | No `setAnimationLoop` or rAF as the source of truth; `mixer.setTime(t)` for glTF; fixed size and `pixelRatio(1)`; three loaded from a CDN through an importmap. **The duration cannot be inferred**, so a root `data-duration` is required (lint rule `root_composition_missing_duration_source`) (`plugin/skills/hyperframes-animation/adapters/three.md`) |
| Lottie | `goToAndStop(ms)` | The animation must be registered on `window.__hfLottie` with `autoplay:false` |
| TypeGPU | Seeked per frame | |
| Shader transitions | `@hyperframes/shader-transitions` | WebGL transitions, with a page-side compositing path about 6× faster |

### 2.4 CLI reference

The `hyperframes` bin is published from `packages/cli` ([package.json](https://raw.githubusercontent.com/heygen-com/hyperframes/main/packages/cli/package.json)). It needs Node ≥ 22 and is built on citty, puppeteer-core, Hono and sharp. Almost every command takes `--json`, with a `_meta` block of `{version, latestVersion, updateAvailable}`. A missing flag fails fast with a usage example; the CLI never prompts. The full reference is [cli.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/packages/cli.mdx).

| Group | Commands | Notable flags |
|---|---|---|
| Create | `init`, `add <block\|component\|tag>`, `catalog` | `init --example --resolution --video --audio` (automatic Whisper captions) `--tailwind --non-interactive`; `catalog --on-device` (a 33 MB model for search by meaning) |
| Source material | `capture` (website), `transcribe`, `tts`, `remove-background`, `media-treatment`, `beats`, `normalize-audio`, `models` | |
| View and share | `preview` (Studio on :3002), `present`, `play`, `publish` | `preview --background --status --json --kill-all`; `publish` → hyperframes.dev, no sign-in |
| Verify | `lint`, `check`, `snapshot`, `keyframes`, `compare`, `grade-compare` | `check --snapshots --at-transitions --strict`; `snapshot --at --frames --zoom --against ref.mp4` |
| Render | `render`, `benchmark` | mp4/webm/mov/gif/png-sequence/hls; `--quality draft…delivery`, `--workers 1-24`, `--docker`, `--gpu`, `--browser-gpu`, `--variables-file`, `--batch`, `--resume`, `--strict-all` |
| Environment | `doctor`, `info`, `compositions`, `upgrade`, `browser`, `docs`, `skills [check\|update]`, `telemetry`, `figma` | |
| Remote | `auth`, `cloud render\|list\|get`, `lambda deploy\|render\|render-batch`, `cloudrun` | `cloud` is HeyGen's hosted renderer |

`validate`, `inspect` and `layout` are deprecated in favour of `check`.

### 2.5 Render pipeline

- **Capture.** `@hyperframes/engine` drives a pooled `chrome-headless-shell` through Puppeteer and captures each frame with **`HeadlessExperimental.beginFrame`** as one atomic operation ([engine README](https://raw.githubusercontent.com/heygen-com/hyperframes/main/packages/engine/README.md)). This is the default **only on Linux headless-shell**. macOS, Windows, and Linux with alpha output use `Page.captureScreenshot`. An experimental "draw-element" fast capture (about 2× faster) falls back to screenshots on its own.
- **Workers.** `parallelCoordinator` splits frame ranges across worker processes, each running one Chrome of about 256 MB. On Linux, frames stream straight into ffmpeg with no PNGs on disk. On macOS and Windows, multi-worker renders write frames to disk unless `HF_CAPTURE_PARALLEL_STREAM` is set. Capture is split into 3000-frame segments that recycle the browser and support `--resume`.
- **Encoding.** Chunks are concatenated and GPU encoders are available. Outputs include H.264/H.265 with HDR10, VP9 with alpha, ProRes 4444, PNG sequences and HLS. `@hyperframes/producer` exposes `createRenderJob`/`executeRenderJob` and an HTTP render server ([producer README](https://raw.githubusercontent.com/heygen-com/hyperframes/main/packages/producer/README.md)).
- **Audio.** `audioMixer` parses `<audio>`/`<video>` and mixes them in ffmpeg. An `<audio>` element without an `id` is **dropped silently** (it is a lint error).
- **Distributed rendering.** `@hyperframes/producer/distributed` provides pure `planV2 → renderChunkV2 → assembleV2` functions. On AWS this runs as Step Functions over a single Lambda with `@sparticuz/chromium`. Deploying needs a repo checkout, bun and AWS SAM ([aws-lambda.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/deploy/aws-lambda.mdx)). Cloud Run and HeyGen's hosted renderer are the alternatives.

### 2.6 Agent integration

- **Distribution.** A Claude Code plugin (`claude plugin marketplace add heygen-com/hyperframes && claude plugin install hyperframes@hyperframes`), standalone skills (`npx skills add heygen-com/hyperframes`), and documented setups for Codex, Copilot, Cursor, Gemini CLI and OpenCode ([README](https://raw.githubusercontent.com/heygen-com/hyperframes/main/README.md)). `init` also installs the core skills.
- **The router.** `/hyperframes` resumes project state, runs an **intent interview**, writes `BRIEF.md`, and sends the agent to one of 10 workflows: product-launch, faceless-explainer, pr-to-video, embedded-captions, talking-head-recut, motion-graphics, music-to-video, slideshow, general-video and remotion-to-hyperframes. Workflows install lazily.
- **Domain skills:** core, animation (one reference per adapter), keyframes, creative, media-use, audio, cli, registry and figma. Planning artifacts include `STORYBOARD.md`, `SCRIPT.md` and `DESIGN.md`, and sub-agent "frame-workers" can work in parallel.
- **The verification loop.** `lint` is static and returns counts plus findings. `check` opens one browser session, seeks a grid of frames, and runs runtime, layout, motion and WCAG contrast audits; its findings carry selectors, bounding boxes and a compliant colour to use instead. `snapshot` shows the agent individual frames. The quickstart is a single paragraph to paste into an agent ([quickstart.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/quickstart.mdx)).
- **No MCP.** Everything goes through the CLI and skills. GenMotion desktop fills this gap for its own agent by exposing `validate_composition`, `capture_frames` and similar tools over MCP (see `AGENTS.md`).

### 2.7 Packages and licensing

`hyperframes` (the CLI), `@hyperframes/core` (parser, linter, runtime, adapters; subpaths `/compiler`, `/lint`, `/runtime-script`, `/variables`), `/engine`, `/producer`, `/studio`, `/player` (`<hyperframes-player>`), `/shader-transitions`, `/aws-lambda`, `/gcp-cloud-run` and `/sdk`. **The license is Apache-2.0** and HyperFrames advertises "no per-render fees". Local rendering is free; HeyGen's cloud rendering is an optional paid service.

---

## 3. Remotion

### 3.1 Composition model

- `registerRoot(RemotionRoot)` in `src/index.ts`. `src/Root.tsx` declares `<Composition id component durationInFrames fps width height defaultProps>`, and `<Folder>` groups compositions in Studio ([template Root.tsx](https://raw.githubusercontent.com/remotion-dev/template-helloworld/main/src/Root.tsx)).
- Components read `useCurrentFrame()` and `useVideoConfig()`, animate with `interpolate()`/`spring()`, and are sequenced with `<Sequence>`, `<Series>` and `@remotion/transitions`.

### 3.2 Timing and seeking

- Time is measured in integer frames, and each frame is a pure function of `frame`. Async readiness is handled with `delayRender()`/`continueRender()`, and `random(seed)` gives deterministic randomness.
- **A bundle is required.** A webpack bundle (Rspack with `--rspack`) is served to Chromium, and a `remotion.config.ts` configures it. HeyGen's own comparison emphasises this build step against HyperFrames' "just HTML" ([hyperframes-vs-remotion.mdx](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/guides/hyperframes-vs-remotion.mdx)).

### 3.3 Three.js and other libraries

- `@remotion/three` provides `<ThreeCanvas>`, which makes `useCurrentFrame()` available inside React Three Fiber. Animation comes from the frame, not from `useFrame()`. There is also `<ThreeWebGPUCanvas>` and `useOffthreadVideoTexture`.
- **Caveats:** `<Sequence layout="none">` is required inside the canvas, and server-side rendering needs `chromiumOptions.gl: "angle"` ([three.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/three.mdx)).
- Third-party wall-clock animation libraries and CSS animations need care: they must be driven from `frame`.

### 3.4 CLI reference

The bins are `remotion`, `remotionb` (Bun) and `remotiond` (Deno), from `@remotion/cli` 4.0.531 ([package.json](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/cli/package.json)).

| Command | Purpose |
|---|---|
| `studio` (`preview`) | Dev server with timeline and props editor |
| `render` | About 60 flags: `--props --codec --crf --concurrency --image-format --scale --frames --every-nth-frame --gl --chrome-mode --hardware-acceleration --repro --rspack` ([render.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/cli/render.mdx)) |
| `still` | Renders a single frame |
| `compositions` | Lists compositions |
| `bundle`, `browser`, `benchmark`, `gpu`, `ffmpeg`, `ffprobe` | Tooling |
| `lambda`, `cloudrun` | Remote rendering |
| `skills add\|update`, `add`, `upgrade`, `versions` | Project maintenance |

Scaffolding uses `npx create-video@latest`. The agent-oriented form is `npx create-video --yes --blank --no-tailwind my-video && npm install && npx remotion skills add && npm run dev` ([coding-agents.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/ai/coding-agents.mdx)).

### 3.5 Render pipeline: bundle → selectComposition → renderMedia

- **Node API** (`@remotion/renderer` + `@remotion/bundler`): `bundle()` → `selectComposition()` → `renderMedia()`, plus `renderStill`, `renderFrames`, `stitchFramesToVideo` and `getCompositions`. `renderMedia` takes `serveUrl`, `composition`, `codec`, `inputProps`, `concurrency`, `crf`, `chromiumOptions`, `ffmpegOverride`, `hardwareAcceleration`, and **`licenseKey`/`isProduction`** (added in v4.0.409; these tie licensing to usage) ([render-media.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/renderer/render-media.mdx)).
- **Capture** is `Page.captureScreenshot` over CDP ([puppeteer-screenshot.ts](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/renderer/src/puppeteer-screenshot.ts)). `<OffthreadVideo>` extracts exact video frames with a Rust/ffmpeg helper.
- **Concurrency** is the number of parallel browser tabs, each rendering and screenshotting its own frames. Encoding runs in parallel unless it is disabled ([concurrency.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/terminology/concurrency.mdx)).
- **Lambda.** One function, with Chromium in a layer that Remotion hosts. The site is deployed to S3, many invocations each render a chunk, and the first one stitches the result. Limits: about 80 minutes of Full HD per render (because of the 15-minute timeout), 10 GB `/tmp` (output of about 5 GB at most), no AV1, and 1000 concurrent functions per region by default ([lambda.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/lambda.mdx)). Cloud Run and Vercel Sandbox are the alternatives.
- **Client-side rendering.** `@remotion/web-renderer` (stable since 4.0.491) provides `renderMediaOnWeb()` using WebCodecs through Mediabunny. It supports only a subset of HTML elements ([client-side-rendering](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/client-side-rendering/index.mdx)).

### 3.6 Agent integration

- **Skills.** `npx remotion skills add` (or `npx skills add remotion-dev/skills`) installs into `.agents/skills`, with `.claude/skills` symlinked to it. The router is `/remotion-best-practices`; the other skills are `-create`, `-markup`, `-studio`, `-render`, `-maps`, `-captions`, `-saas`, `-interactivity`, `-docs`, `-upgrade` and `-multimedia` ([skills.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/ai/skills.mdx)). The router tells agents to preserve user edits and to open a preview rather than render unless asked ([SKILL.md](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/skills/skills/remotion-best-practices/SKILL.md)).
- **The MCP server is deprecated.** It shuts down no earlier than 2026-08-31. The stated reasons: stale data, Remotion paying the token costs, installs being hard, and **"agents do not invoke them reliably"**. `/remotion-docs` replaces it ([mcp.mdx](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/docs/ai/mcp.mdx)). The lesson for us is about the kind of tool, not about MCP itself. Remotion's server was a *docs lookup*, which agents skip. Tools that *act* (validate, capture, render) are called because the task cannot finish without them.
- **LLM-friendly docs.** There is an [`llms.txt`](https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/docs/static/llms.txt), and every docs URL returns Markdown with `.md` appended or with `Accept: text/markdown`. There is also a Prompts gallery and a paid "Editor Starter".

### 3.7 Licensing and pricing

The **Remotion License** is source-available, not OSI ([LICENSE.md](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md)). It is free for individuals, for-profit companies with up to 3 employees, non-profits and evaluation. Everyone else needs a Company License, and selling or relicensing derivatives is not allowed. A v5.0 license change is pending (PR #3750).

| Tier | Price | Covers |
|---|---|---|
| Creators | $25/seat/month | People making videos in Studio |
| Automators | **$0.01/render, $100/month minimum** | Programmatic rendering: prompt-to-video tools, editors, embedded Player |
| Enterprise | From $500/month | Custom terms |

Sources: [remotion.dev pricing](https://www.remotion.dev/docs/license/pricing), [SpotSaaS review](https://www.spotsaas.com/blog/remotion-review). A GenMotion built on Remotion would fall squarely into the Automators tier.

---

## 4. Side-by-side

| | HyperFrames | Remotion | GenMotion (target) |
|---|---|---|---|
| **Authoring model** | HTML + `data-*` attributes + one paused GSAP timeline per composition | React components + `useCurrentFrame()` | TS scene builders returning `({time,frame,progress}) => void`; HyperFrames HTML still supported |
| **Build step** | None | webpack/Rspack bundle | esbuild per scene (sub-second), hidden behind the CLI |
| **Determinism** | Integer frame time; BeginFrame on Linux only; `--docker` for exact output | Pure function of `frame`; screenshot capture | Pure function of time; SwiftShader WebGL on every OS |
| **3D** | three adapter: author writes `renderAt`, must declare duration, three from CDN | `@remotion/three` (R3F), needs `gl: "angle"` | Three.js is the default engine; duration comes from `project.json` |
| **Agent surface** | 21 skills, router, intent interview, CLI `--json`; no MCP | 12 skills, `llms.txt`; MCP deprecated | Small skills + stdio MCP whose tools act and return images/structured errors |
| **CLI ergonomics** | Excellent: non-interactive, `--json`, `_meta` | Rich but interactive scaffolder; ~60 render flags | Non-interactive, `--json` everywhere, few flags |
| **Cloud render** | Lambda via SAM + repo checkout; Cloud Run; HeyGen cloud | Lambda (15-min/10 GB limits), Cloud Run, Vercel | Local chunked-parallel first; the desktop app renders on-device |
| **License** | Apache-2.0 | Source-available; per-seat and per-render fees | Apache-2.0, no per-render fees |

---

## 5. How agents actually make videos with each

### HyperFrames loop

1. `npx hyperframes init my-video --non-interactive [--audio track.mp3]`. This installs the skills.
2. The agent loads `/hyperframes`. The router checks project state, runs the intent interview and writes `BRIEF.md`, then picks a workflow (for example motion-graphics).
3. It optionally writes `STORYBOARD.md`/`SCRIPT.md`/`DESIGN.md` and fans scenes out to frame-worker sub-agents.
4. It writes `index.html` plus `compositions/*.html`, registers one paused timeline per composition, and adds registry blocks with `hyperframes add`.
5. `hyperframes lint --json` and a fix pass. First builds hit known rules such as a missing duration source, `<audio>` without an `id` and nested `data-start`.
6. `hyperframes check --snapshots --at-transitions --json` runs the layout, contrast and motion audits. The agent reads the PNGs and fixes what it sees.
7. `hyperframes preview --background`, leaving the user to scrub in Studio.
8. Version-pin probes, then `hyperframes render --quality standard --workers N`, or `publish` for a hosted link.

### Remotion loop

1. `npx create-video --yes --blank --no-tailwind my-video && npm install && npx remotion skills add`.
2. The agent loads `/remotion-best-practices` and routes to `-create`/`-markup`.
3. It writes a React component per scene, registers `<Composition>` in `Root.tsx`, and sequences with `<Sequence>`/`<Series>`. Everything is driven by `useCurrentFrame()` + `interpolate`/`spring`.
4. `npm run dev` opens Studio. The skill tells the agent to open a preview rather than render.
5. Verification is mostly the TypeScript compiler, plus `npx remotion still <id> --frame N` to look at frames. There is no built-in layout or contrast lint.
6. `npx remotion render <id> out.mp4 --concurrency N`, or Lambda for scale, with `licenseKey` set in production.

**What the two loops show.** HyperFrames has the better verification loop; Remotion has the simpler instructions. Neither gives the agent **typed tools that return pixels**. Both make the agent shell out and parse text, or locate PNGs on disk.

---

## 6. Weaknesses and openings

**Remotion**
- **The license is a tax on exactly our category.** Companies with more than 3 people pay, prompt-to-video pays per render, and `licenseKey`/`isProduction` now enforce it in code.
- **Setup and build weight.** React + a bundler + `remotion.config.ts` + npm install before the first frame. Self-hosting renders is "its own small project" ([rendley](https://rendley.com/blog/remotion-alternative)).
- **Agents must get React and frame math right.** CSS and wall-clock libraries fail quietly.
- **Rendering.** Screenshot capture per tab. Lambda is capped at 15 minutes and 10 GB, is AWS-first, and depends on a Chromium layer that Remotion hosts.
- **Agent strategy in retreat.** The MCP was retired as unreliable, leaving docs-in-skills.

**HyperFrames**
- **The skill layer is big and ceremonious:** a router, an interview, BRIEF/STORYBOARD files, sub-agents, lazy installs, and a registry that "can lag main by hours". That is a lot for an agent to follow, and first builds still fail documented lint rules.
- **Silent failure modes:** unsized roots collapse, timelines registered before an async build end up empty, `<audio>` without an `id` is silent, `crossorigin` is banned, and nested `data-start` breaks timing.
- **Platform-dependent guarantees:** BeginFrame on Linux only, `--docker` for exact output, and many memory and timeout knobs (about 25 GB of raw frames per minute on the disk path).
- **3D is an afterthought:** the author wires `renderAt`, declares the duration manually, and loads three from a CDN, which contradicts "no network at render time". The adapter API is "experimental v0".
- **Lambda is painful** (SAM + bun + repo checkout), and hosted services (`cloud`, `publish`, `auth`) route through HeyGen.

**Openings, in order of value**
1. Typed agent tools that *act* and return images, in place of prose routers.
2. Rendering that is identical on every OS without Docker.
3. 3D as the default engine rather than an adapter.
4. A permissive license with no render metering.
5. Zero-config agent wiring in the starter repo.
6. Importing Remotion and HyperFrames projects (HyperFrames already treats Remotion migration as a first-class route, so the demand exists).

---

## 7. How GenMotion wins

The plan below maps each opening to something we ship. The desktop app remains the product; the npm packages let the same engine run headless, from any agent, on any machine.

### 7.1 `genmotion` CLI on npm

We copy HyperFrames' best property (a non-interactive CLI with `--json` on every command) and drop the ceremony around it.

| Command | Does | Answers the gap |
|---|---|---|
| `genmotion init [dir] --template <id>` | Scaffolds a project from the catalog | No interview; the agent passes flags |
| `genmotion dev` | Preview server with hot reload; `--background` / `--status` | The agent can manage the server, as with `hyperframes preview` |
| `genmotion render [--out] [--workers N] [--range a-b]` | Chunked parallel MP4 | Local, fast, no Docker |
| `genmotion still --frame N` / `--at 2.5s` | PNG of a single frame | What `remotion still` does |
| `genmotion check [--json]` | Compile + determinism lint + smoke render + layout/contrast | One gate in place of lint + check + validate |
| `genmotion info` | Project, scenes, durations, engine, versions | What `compositions`/`info` do |
| `genmotion scene add <name> [--duration]` | Creates the builder file and updates `project.json` | Removes a class of manifest errors |
| `genmotion mcp` | Starts the stdio MCP server | One binary, one version |
| `genmotion skills [install\|update]` | Writes the skills into `.claude/skills` and `.agents/skills` | Pinned to the CLI version, no registry lag |
| `genmotion doctor` | Checks Chromium, ffmpeg and WebGL (SwiftShader) | |

Every command takes `--json` with a stable `{ok, data, errors[], _meta}` envelope. A missing required input exits non-zero with a usage example; nothing prompts. `create-genmotion` (`npm create genmotion@latest my-video -- --yes`) wraps `init` for people who expect the `create-*` convention.

### 7.2 `@genmotion/render`

- **Playwright + `ffmpeg-static`**, so nothing needs to be installed on the system.
- **SwiftShader WebGL** (`--use-angle=swiftshader`) on every OS. It is slower than a GPU but gives bit-identical output across macOS, Windows and Linux, which HyperFrames only reaches on Linux or with `--docker`. A `--gpu` flag is available as an opt-in for draft speed.
- **Chunked parallel rendering.** The frame range is split into N chunks, each running in its own browser context, with frames piped to ffmpeg and the segments concatenated losslessly. This is the same architecture as HyperFrames' `parallelCoordinator` and Remotion's Lambda chunking, run on one machine. The same chunk function can later back a cloud fan-out without a separate deploy story.
- **Audio** is mixed in ffmpeg from the manifest and the per-frame gains, the same as the desktop export today (see `AGENTS.md`), so there are no silent-drop rules.

### 7.3 `@genmotion/mcp` (stdio)

Remotion's MCP failed because it was a documentation lookup. Ours consists of tools the agent cannot finish without, and each returns structured errors or images.

| Tool | Returns |
|---|---|
| `project_overview` | Scenes, durations, fps, size, assets, last check result |
| `validate_scene` | Compile + determinism findings for one scene: `{file, line, rule, message, fix}` |
| `check_project` | Whole-project gate (compile, lint, smoke render, layout/contrast) |
| `capture_frames` | **Image content blocks** at given times/frames, so the agent sees the result directly |
| `render_video` | Path, duration, size and timings for the MP4 |
| `add_scene` | Creates the builder and updates `project.json` atomically |
| `save_asset` | Imports a file or URL into `assets/` and returns its project path |
| `get_guide` | The authoring guide, or one section of it, versioned with the package |

This follows the pattern already proven in the desktop app (`validate_composition`, `capture_frames` over MCP) and brings it to every agent.

### 7.4 Three.js as the default engine

```ts
// scenes/intro.ts
import * as THREE from "three";
export default function buildScene(ctx) {
  const { scene, camera, width, height } = ctx;
  const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 128, 16),
                              new THREE.MeshStandardMaterial({ color: 0x6d5dfc }));
  scene.add(mesh, new THREE.AmbientLight(0xffffff, 0.6));
  return ({ time, frame, progress }) => {
    mesh.rotation.y = progress * Math.PI * 2;
  };
}
```

- **Plain TS, not React or HTML.** There is no reconciler, no `<Sequence layout="none">` and no `renderAt` event wiring. The runtime owns the renderer, the canvas size, `pixelRatio(1)` and the render loop. It calls the returned function with the seeked time and then renders. The only thing the agent writes is a pure function of time.
- **Duration comes from `project.json`,** so the engine never has to infer it, and HyperFrames' `root_composition_missing_duration_source` failure cannot happen.
- `three` is bundled locally, with no CDN importmap and no network at render time.
- Determinism lint covers `Date.now`, `performance.now`, unseeded `Math.random`, `setAnimationLoop`/rAF and `Clock`. `ctx.random(seed)` is provided.
- HyperFrames HTML stays as a second engine for DOM-heavy typography and captions, the same "two engines, one manifest" design the desktop app already uses.

### 7.5 A starter repo that is pre-wired for agents

`genmotion init` writes:

- `AGENTS.md` and `CLAUDE.md`: a one-page guide covering the scene contract, the determinism rules and the check → capture → render loop.
- `.mcp.json`, which registers `npx genmotion mcp` so Claude Code, Cursor and similar tools find the tools with no setup.
- `.claude/skills/` (mirrored in `.agents/skills/`): a handful of short skills (author a scene, verify, render) pinned to the CLI version.
- `project.json`, `scenes/`, `assets/`, and a `package.json` that depends on `genmotion`.

An agent clones the repo or runs `init`, and the first `check_project` call works. There is no plugin marketplace, no router interview and no separate skills install.

### 7.6 Licensing

**Apache-2.0 for the CLI, renderer, MCP server and runtime, with no per-render fees and no license key in the render path.** This matches HyperFrames and directly undercuts Remotion's Automators tier ($0.01/render, $100/month minimum), which applies to every prompt-to-video product built on Remotion.

### 7.7 Where each competitor still leads

- **HyperFrames:** breadth of source-material tools (TTS, transcription, background removal, beats) and the registry of blocks. For GenMotion this matters only for the HyperFrames engine.
- **Remotion:** a mature Lambda story, an embeddable Player, and the ecosystem of React developers.

We don't have to match either on breadth. We win on the loop: fewer rules to get wrong, tools that show the agent the frame, and the same output on every machine at no per-render cost.
