# genmotion

## 0.5.0

### Minor Changes

- 7c5e84b: The bundled skill pack is rebuilt around direction and taste. A new `direction` skill is read before any owner is chosen; `launch-taste` teaches when each launch-film style fits a message (including short title-card launches for X and feeds); `motion-language` and `sound-design` carry the house timing and mix numbers; `video-editing` edits footage the user brings (podcasts, talking heads, trailers, launch cuts, social edits); `device-mockup` draws a modern phone frame and app UI kit for screen-led films, with 9:16 feed framing that keeps the product clear of platform UI. Every existing skill is rewritten with frame-budgeted beat sheets and verifiable checks. Adds the `music` and `transcribe` capabilities.

  Sound: with no track supplied, `sound-design` now finds a free CC0 / CC BY track on the web, verifies its licence and credits it, detects its tempo, downbeats and drop, and fits the scenes to its beat. Feed films master to −14 LUFS with a recipe tested on real recorded effects. Whoosh/swoosh effects and synthesised noise beds (room tone, "air") are banned outright.

  MP4 and MOV renders now keep `+faststart` through the segment join and the audio mux, so a browser can start playing before the whole file has downloaded.

  A render's audio now runs the full length of the picture: when the last clip ends early, the mix is padded with silence instead of ending short.

### Patch Changes

- 18553cf: `genmotion audio add|set --from` keeps the offset into the file to the millisecond instead of snapping it to a frame, so a sound can be trimmed to its transient and land exactly on the frame it is placed on.

## 0.4.1

### Patch Changes

- 76dd298: The `dev` studio uses the GenMotion logo as its favicon, Edit in studio matches the dark Export button, and Export MP4 gets a download icon.

## 0.4.0

### Minor Changes

- 3263353: The `dev` studio gets an **Export MP4** button (renders into `exports/` and downloads it in the browser, with progress and cancel) and an **Edit in studio** button that opens the project in the GenMotion app. The project's size, fps and engine move into the timeline bar, and the GenMotion logo leads the header.

### Patch Changes

- 3263353: A project made with `init --template` (or the `create_project` tool) now pins `@genmotion/cli` to the line that created it, as plain `init` already did. Remixes pinned `^0.2.1`, so `npm run dev` started the 0.2 studio, which has no timeline and plays no audio. Projects the app scaffolds now pin `^0.3.0`.

## 0.3.0

### Minor Changes

- d1b6cbe: Timeline audio from the CLI, and a real timeline in the dev studio.

  - `genmotion audio add|set|remove|list` puts music, narration and effects on the timeline: `--at`, `--duration`, `--from`, `--track`, `--volume`, `--fade-in`, `--fade-out`, `--name`, `--mute`. A URL is saved into `assets/` first. Clips get a free lane, and a clip that would overlap the next one on its lane is shortened and reported.
  - MCP tools `add_audio`, `update_audio` and `remove_audio` do the same for agents. `project_overview` and `info` now report each clip's track, offset, fades and name.
  - `genmotion dev` shows a timeline under the picture: a ruler, the scene track, and every audio lane with its waveform. Audio plays in sync, with volume, fades and mute applied as the render mixes them. Click or drag to seek; it reloads at the same frame as the agent edits.
  - New skill capability `place-audio`.

### Patch Changes

- fb22c93: `init --template` names itself to the templates API (`X-GenMotion-Client: cli/<version>`), so remixes from the CLI are counted apart from the app's.

## 0.2.2

### Patch Changes

- e9f77b5: A project's `AGENTS.md` now says the CLI is the npm package `@genmotion/cli`
  and that there is no package called `genmotion`, so an agent outside the
  project runs `npx @genmotion/cli` instead of searching for one.

  Fixes 0.2.1, which was published without its build (`dist/`) and failed on
  every command with `Cannot find package 'tsx'`. The package now builds itself
  on `npm pack`/`npm publish`, and a copy missing its build says so instead.

## 0.2.1

### Patch Changes

- 0603220: The CLI is published as `@genmotion/cli`; the command it installs is still
  `genmotion`. npm refuses the bare `genmotion` name as too similar to
  `emotion`, so `genmotion@0.2.0` never reached the registry and
  `create-genmotion@0.2.0`, which depends on it, could not install.
  `npm create genmotion` works again, `npx @genmotion/cli <command>` runs the
  CLI anywhere, `npm install -g @genmotion/cli` installs the `genmotion`
  command, and the app's "Install the 'genmotion' command" installs
  `@genmotion/cli`. New projects and the MCP config use the new name.

## 0.2.0

### Minor Changes

- 7e800b6: There is now one `genmotion` command: the npm CLI. The app and its installer
  install it with npm (it needs Node 22 or newer) instead of writing a launcher
  script of their own, and replace the script older versions left in
  `/usr/local/bin`, which could block `npm install -g genmotion` or answer ahead
  of it. `genmotion .`, `genmotion clone` and a bare `genmotion` still open the
  app. New `genmotion upgrade` updates the app and the command together, and
  `genmotion doctor` reports the app version and flags an old launcher on PATH.

## 0.1.0

### Minor Changes

- 4169473: First public release: the `genmotion` CLI (init, dev, render, still, check, info,
  scene add, mcp, skills, templates, browser, doctor), `npm create genmotion`, and
  the Three.js engine runtime that scenes are written against.
- 4169473: Video-type skills: `genmotion skills list|search|show|add` and the MCP tools
  `search_skills`/`get_skill` expose GenMotion's skill pack (launch, feature
  announcement, milestone, explainer, brand sting, app store preview,
  walkthrough, UGC ad formats, freeform, and Three.js camera/type/transitions/
  assets/look craft skills). New projects get the `genmotion-skills` router, and
  the chosen skill is recorded in `VIDEO.md`.
