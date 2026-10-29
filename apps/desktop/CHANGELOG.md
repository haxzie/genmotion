# @genmotion/desktop

## 0.5.1

### Patch Changes

- 9d92d55: The template galleries are laid out by a real masonry grid. Cards fill left to
  right, newest first, each pulled up under the one above it — rather than CSS
  columns, which filled one column top to bottom before starting the next and so
  put the newest template beside the oldest. Every card declares its own aspect
  ratio, so the layout no longer waits on a poster decoding or on a `matchMedia`
  list that only resolves after hydration, and the grid stops jumping on load.
- ba34413: The editor sits in a framed pane: a hairline and a few pixels of window round
  the whole surface, which is what says where the editor ends and the app
  begins. The home screen keeps none — it is the app itself, and a border round
  the whole window only boxes it in. The preview column drops its own top
  border and rounded corner now that the frame draws them; the seam against the
  chat is the only edge left with a job.
- 9d92d55: Gallery cards play a small preview rendition on hover instead of the full
  video. A card is a few hundred pixels wide and the full file is the same
  footage at up to eighty times the weight — fetching it was most of why
  hovering the gallery felt broken. Falls back to the full video for any
  template that has not been re-rendered yet, so nothing waits on the catalog.
- 9d92d55: The voice picker plays its previews again. Nothing in the chain from the play
  button to object storage had a deadline, so a store that stopped answering
  left the button spinning rather than falling back to the source — the
  `.catch(() => null)` that was supposed to handle exactly that can only run if
  the read fails, and an unreachable store does not fail, it waits. Cache reads
  now give up after three seconds and the desktop's binary requests time out
  with an error the picker can show.
- 9d92d55: HyperFrames is no longer offered for new projects. The engine picker drops the
  row, a machine that had already chosen it comes back to the default rather than
  going on creating HyperFrames projects with no control left to change it, and
  "set this folder up" uses the same engine the composer would have — it had been
  pinned to HyperFrames since before that stopped being what a new project is.
  Existing HyperFrames projects open, compile, preview and export exactly as
  before; this is only the creation side.
- 9d92d55: Template videos play again. The app's loopback proxy now forwards `Range`
  upstream and passes `Content-Length` back down, so a `<video>` can do the
  seek it was already being told (by `Accept-Ranges`) that it could — until
  now it asked for a slice and was handed the whole file from byte zero, which
  no template whose `moov` atom sits at the end of the file can start from. The
  30-second deadline on the request now covers the headers rather than the
  whole transfer, so a large template is no longer cut off mid-stream, and an
  abandoned preview stops pulling bytes instead of running to completion.
- 83463e6: Every tool call in the chat has an icon and a readable label.

  Two separate causes behind the grey dots and the raw `mcp__…` names in the
  transcript. `parseMcpToolName` matched `[^_]+` for the server segment, so any
  server this app did not name itself failed to parse at all: Claude Code's own
  connectors arrive as `mcp__claude_ai_Firecrawl__firecrawl_search`, and every
  one of them lost its icon, its label and its `mcp_tool_called` event. The
  split is now on the first `__`.

  Separately, eight GenMotion tools had no card registered — `search_skills`,
  `search_scenes`, `get_scene`, `fork_scene`, `brand_overview`,
  `use_brand_asset`, `validate_composition` and `recommend_integration` — and
  the MCP fallback skips our own server on purpose, so they fell through to a
  dot and their raw name. All eight have labels, subjects and icons now, there
  is a GenMotion fallback behind them for the next tool somebody adds, and a
  test holds the two lists together.

## 0.5.0

### Minor Changes

- 99c4a53: Brands: a brand kit the agent reads

  A new Brands section holds everything a video needs to look like a company: the
  real logo files, the exact hex values, the typefaces, reference work that is
  on-brand, written notes, and optionally skills of its own. Each brand is an
  ordinary folder under `~/.genmotion/brands`, so a logo can be dropped in from
  Finder.

  Pick a brand from the composer and the project gets it before the first
  message: the palette and type are written into `components/brand.ts`, the real
  logo files are copied into `assets/brand/`, and the brand folder becomes
  readable to the agent alongside the prompt block naming all of it. New brand asks for the
  company's website first: the API reads it with Firecrawl and comes back with
  the name, what they do, the palette, the typefaces and the real logo, and
  nothing is written until you confirm what it found.

  Two new agent tools, `brand_overview` and `use_brand_asset`, and a
  `brand-assets` capability the owner skills now require.

  Colours are picked in the app rather than through the macOS colour panel,
  which dismissed itself whenever anything else took focus.

  The New brand dialog is two columns: the form on the left, and on the right the
  palette running as banded simplex noise, drawn live from whatever is ticked. It
  idles in GenMotion's own colours until a site has been read.

## 0.4.1

### Patch Changes

- ecc308a: A plugin's row now opens a sheet instead of connecting on the spot. A 28px `+` was the only target on a row 500px wide, sitting beside a description cut off mid-sentence, so the one thing you could press was the one thing you had the least to go on. The sheet says what the plugin does, what signing in actually involves and what the agent ends up holding, and then offers the button. A plugin that wants an API key asks for it there, beside the sentence explaining where the key goes, rather than in a second dialog after it.
- ecc308a: The Plugins screen is a list, not a shelf. Twenty-two cards in a grid was a wall, and a card spent most of its area on the border around two lines of text. A plugin is now a row: its mark, its name, one line about it, and the one button that matters. Two tabs split the two questions the screen was trying to answer at once, All for finding something to add and Installed for managing what you added, so neither list pushes the other off a short window.
- 5077614: three-engine: `withFonts` moves into the engine, and a swapped font file is seen

  Every Three.js project carried its own copy of the font loader, and each copy
  skipped a face whose **family name** was already in `document.fonts`. An export
  opens a fresh window per capture, so it always drew the newest file; the editor
  keeps one document alive across every rebuild, so it kept drawing the first one.
  Changing the file behind a family was a no-op in the preview and correct in the
  render — the same project looking like two different videos.

  `withFonts(ctx, files, build)` is now exported from `@genmotion/three-engine`,
  host-provided at runtime, and tracks each face by the URL it loaded from (per
  family + weight + style slot), so changing the import is all a font swap takes.
  A file also takes `variation`, which pins variable-font axes: canvas 2D has no
  `font-optical-sizing`, so an `opsz` face drew its small-text design at any size.

- 53542a0: The Marketplace is now Plugins: same tab, same servers, a name that matches what the composer's `+` already calls them. Mapbox joins the catalog under a new Maps category, so an agent building a map scene can geocode a place, trace a route and pull a static map instead of guessing at the geography. It connects in one click.
- d45b3e5: A template on the start screen opens in a lightbox before it is remixed: the video plays at a size you can read, with its title, description and running time under it, and Remix is a button there. The pill in the card's corner still remixes straight away.

## 0.4.0

### Minor Changes

- 93c8127: Typing and mouse-click sounds, synthesised locally.

  A shot of text being typed gets `generate_typing_sound`: the sound of someone typing it, plus a `.timing.json` beside the WAV saying what the text says on every frame, so the sound and whatever draws the text come from one plan and cannot drift. `generate_click_sound` does the same for mouse clicks, and `pick_keyboard_sound` offers the five keyboards and ten click sounds in the chat with a play button on each, for when the user wants to choose. From a shell or over MCP the same three are `genmotion keysound typing|click|list|demo` and the `generate_typing_sound` / `generate_click_sound` / `list_sound_profiles` tools; `--place` puts the clip on the timeline in the same call.

  No key, no credits and no network: a keystroke is synthesised from a table of resonances, which is also why it is the one audio capability every surface has. The rhythm is modelled rather than evenly spaced — digraphs cost what they cost on a real keyboard, the tempo drifts into bursts and lulls, there are pauses at punctuation, and by default the typist occasionally slips onto a neighbouring key and backspaces it out. The same text and seed give the same file byte for byte, so re-rendering a project never re-times its typing.

  The voice picker and the new keyboard picker are now one component.

- d0086fc: Rename, duplicate and delete a project from one menu — on the Projects screen and beside the title in the editor. Renaming happens in place on the card; duplicating copies the whole folder (scenes, assets, installed packages, card image) into a new project and opens it, leaving the original's chat, exports and git remote behind.

### Patch Changes

- 6899508: Desktop: never open a blank window.

  A quit tears the loopback server down before the process has actually gone. If
  the quit then stalls — a prevented window close, an updater handing off to
  Squirrel and not coming back — the app lived on holding the single-instance
  lock with its server closed, so the dock icon (and every later launch, which
  the lock folds into that process) opened a window against a dead port. The
  window painted its background colour and nothing else, with no error anywhere,
  until the app was force-quit.

  The quit is now bounded and backed by `app.exit`, so it always ends the
  process; `createWindow` brings the server back if it is down; a main-frame load
  failure retries instead of leaving an empty window, and says so plainly if the
  retries run out. A second instance no longer starts a server, a menu or a
  window on its way out.

- 82c2b82: Fix the editor running out of memory on a project with a long audio clip. The timeline's waveforms decoded every audio file in full, at full rate, once per component asking for one — so a project carrying an hour-long music bed drove the renderer to ~8.8GB and killed it (taking every open tab with it) as soon as a second project was opened. A file now decodes once however many strips want it, long files decode at a rate the strip can actually use, and anything over twenty minutes shows its length without a shape. The same project now peaks at ~270MB.
- 7ce1037: The studio agent now confirms the spend before it makes a paid call. Both harnesses' prompts carry one rule: the GenMotion generators and any connected integration's tools cost real money, so the agent puts the whole plan in front of the user first (what it would generate, how many, which model, what it costs) and waits for a yes. It may only quote a price the tool or the provider's own balance tool actually states, never an invented one, and one yes covers that plan, with a fresh ask before going past it or re-generating something that already came back. Local work (capture, validate, ffmpeg, save_asset) still needs no permission.
- 75b522f: Agents can pull the video out of a post on X. In the studio, paste an x.com link in the chat and `download_x_video` lands the clip in the project's `assets/`, with who posted it and what the post said, so it can be quoted on screen. The CLI has the same thing without an account: `genmotion x-video <post url>`, and `download_x_video` over MCP. Posts are resolved through X's own embed endpoint, which needs no key and no login, and the file comes straight from `video.twimg.com`, so no video passes through our servers. The best rendition is taken by default (`--quality smallest` for a clip that plays inside a phone mock), stepping down the ladder when the top one is over 100MB. Skills name it as the `x-video` capability.

## 0.3.0

### Minor Changes

- 5ba9426: Free is a 7-day trial again. An organization gets a week of the whole studio,
  exports included and unbranded, and when it runs out exporting stops until the
  org upgrades. Everything else keeps working: projects, scenes, the preview and
  chat with your own agent are never gated. Chat plugins stay Pro-only
  throughout, as before.

  The monthly export allowance goes with it, so nothing is counted against a
  ceiling any more. `export_events` stays as a record of what was exported and on
  which plan.

## 0.2.2

### Patch Changes

- 3a44de7: MCP connections: one server per marketplace entry (a second Connect resumes the first rather than adding a duplicate), and the main process pushes reachability changes to the renderer so a row flips to Connected the moment an OAuth redirect lands, instead of waiting on a poll the window being backgrounded had paused.
- 3a44de7: Marketplace icons are the vendors' own filled app tiles rather than Simple Icons' monochrome glyphs, and fill their box edge to edge. Replicate's gradient mark ships inline.
- 3a44de7: First-run onboarding: pick the coding agent (installing one from npm if it isn't there, with opencode and Grok CLI marked coming soon), then connect the generative-media MCP servers.

## 0.2.1

### Patch Changes

- 61bd6d7: Picking a template says so, then takes you to the box it landed in.

  Remix on a gallery card now turns green and reads "Added to chat" with a check, and the start screen scrolls back up to the composer where the chip is waiting. The scroll is held for a beat first: Chromium begins a smooth scroll on the same frame as the click, which carried the confirmation off screen before it had drawn.

## 0.2.0

### Minor Changes

- deb4fd0: Templates move to the start screen, projects get a screen of their own, and Remix is a chip in the prompt box.

  The Create screen now shows the template gallery under the composer: poster-only cards that play their own video on hover and lazy-load as you scroll. Every project you have made is its own destination in the nav instead, with the grid and list it already had.

  Remix no longer copies anything the moment it is pressed. It loads the template into the composer as a chip, and the copy is made when that message is sent, so the prompt and the template reach the agent together. The web site's "Open in the app" link lands in the same place: the app comes forward with the template on the prompt box, and nothing is written to disk until you send.

## 0.1.1

### Patch Changes

- e9c0ee0: Home composer: a rotating brand-gradient hairline and bloom around the box.

## 0.1.0

### Minor Changes

- 3688c84: Add the scene library: `genmotion scenes search|show|add` and the `search_scenes` / `get_scene` / `fork_scene` tools find how a beat (hook, integrations, stat, end card…) was done in GenMotion's templates, with notes, code and a three-frame filmstrip, and fork the closest scene into the project to re-skin.

## 0.0.32

### Patch Changes

- f864428: Remixing a template now keeps the template's own README.md, alongside its
  AGENTS.md. Every template in the catalog ships one: what the video is, how to
  open the folder, what each scene does, and where to find the rest of the
  gallery and the docs. It is the page someone lands on once a remix is published
  to GitHub, so the scaffold's generic README no longer overwrites it.

## 0.0.31

### Patch Changes

- 3263353: A project made with `init --template` (or the `create_project` tool) now pins `@genmotion/cli` to the line that created it, as plain `init` already did. Remixes pinned `^0.2.1`, so `npm run dev` started the 0.2 studio, which has no timeline and plays no audio. Projects the app scaffolds now pin `^0.3.0`.

## 0.0.30

### Patch Changes

- 0603220: The CLI is published as `@genmotion/cli`; the command it installs is still
  `genmotion`. npm refuses the bare `genmotion` name as too similar to
  `emotion`, so `genmotion@0.2.0` never reached the registry and
  `create-genmotion@0.2.0`, which depends on it, could not install.
  `npm create genmotion` works again, `npx @genmotion/cli <command>` runs the
  CLI anywhere, `npm install -g @genmotion/cli` installs the `genmotion`
  command, and the app's "Install the 'genmotion' command" installs
  `@genmotion/cli`. New projects and the MCP config use the new name.

## 0.0.29

### Patch Changes

- 7e800b6: There is now one `genmotion` command: the npm CLI. The app and its installer
  install it with npm (it needs Node 22 or newer) instead of writing a launcher
  script of their own, and replace the script older versions left in
  `/usr/local/bin`, which could block `npm install -g genmotion` or answer ahead
  of it. `genmotion .`, `genmotion clone` and a bare `genmotion` still open the
  app. New `genmotion upgrade` updates the app and the command together, and
  `genmotion doctor` reports the app version and flags an old launcher on PATH.

## 0.0.28

### Patch Changes

- 4169473: The agent now picks a skill for the kind of video you ask for (launch,
  feature announcement, milestone, explainer, logo sting, app store preview,
  walkthrough, social ad formats, or freeform), asks only what's missing, and
  remembers the choice in `VIDEO.md`. New explainer and Three.js camera, type,
  transitions, assets and look skills. The `genmotion` terminal command now
  hands `init`, `dev`, `render`, `check` and friends to the npm CLI.
