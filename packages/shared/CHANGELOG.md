# @genmotion/shared

## 0.5.1

### Patch Changes

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

- 99c4a53: `BrandInspection` and the brand `description`, plus real font files: a brand's
  fonts now carry the actual woff2/otf for each weight and style rather than a
  family name, which is the difference between type that matches and type that
  falls back to Helvetica.
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

## 0.4.0

### Minor Changes

- 53542a0: The Marketplace is now Plugins: same tab, same servers, a name that matches what the composer's `+` already calls them. Mapbox joins the catalog under a new Maps category, so an agent building a map scene can geocode a place, trace a route and pull a static map instead of guessing at the geography. It connects in one click.

## 0.3.0

### Minor Changes

- 93c8127: Typing and mouse-click sounds, synthesised locally.

  A shot of text being typed gets `generate_typing_sound`: the sound of someone typing it, plus a `.timing.json` beside the WAV saying what the text says on every frame, so the sound and whatever draws the text come from one plan and cannot drift. `generate_click_sound` does the same for mouse clicks, and `pick_keyboard_sound` offers the five keyboards and ten click sounds in the chat with a play button on each, for when the user wants to choose. From a shell or over MCP the same three are `genmotion keysound typing|click|list|demo` and the `generate_typing_sound` / `generate_click_sound` / `list_sound_profiles` tools; `--place` puts the clip on the timeline in the same call.

  No key, no credits and no network: a keystroke is synthesised from a table of resonances, which is also why it is the one audio capability every surface has. The rhythm is modelled rather than evenly spaced — digraphs cost what they cost on a real keyboard, the tempo drifts into bursts and lulls, there are pauses at punctuation, and by default the typist occasionally slips onto a neighbouring key and backspaces it out. The same text and seed give the same file byte for byte, so re-rendering a project never re-times its typing.

  The voice picker and the new keyboard picker are now one component.

### Patch Changes

- 75b522f: Agents can pull the video out of a post on X. In the studio, paste an x.com link in the chat and `download_x_video` lands the clip in the project's `assets/`, with who posted it and what the post said, so it can be quoted on screen. The CLI has the same thing without an account: `genmotion x-video <post url>`, and `download_x_video` over MCP. Posts are resolved through X's own embed endpoint, which needs no key and no login, and the file comes straight from `video.twimg.com`, so no video passes through our servers. The best rendition is taken by default (`--quality smallest` for a clip that plays inside a phone mock), stepping down the ladder when the top one is over 100MB. Skills name it as the `x-video` capability.

## 0.2.0

### Minor Changes

- 5ba9426: Free is a 7-day trial again. An organization gets a week of the whole studio,
  exports included and unbranded, and when it runs out exporting stops until the
  org upgrades. Everything else keeps working: projects, scenes, the preview and
  chat with your own agent are never gated. Chat plugins stay Pro-only
  throughout, as before.

  The monthly export allowance goes with it, so nothing is counted against a
  ceiling any more. `export_events` stays as a record of what was exported and on
  which plan.

## 0.1.1

### Patch Changes

- d1b6cbe: Timeline audio from the CLI, and a real timeline in the dev studio.

  - `genmotion audio add|set|remove|list` puts music, narration and effects on the timeline: `--at`, `--duration`, `--from`, `--track`, `--volume`, `--fade-in`, `--fade-out`, `--name`, `--mute`. A URL is saved into `assets/` first. Clips get a free lane, and a clip that would overlap the next one on its lane is shortened and reported.
  - MCP tools `add_audio`, `update_audio` and `remove_audio` do the same for agents. `project_overview` and `info` now report each clip's track, offset, fades and name.
  - `genmotion dev` shows a timeline under the picture: a ruler, the scene track, and every audio lane with its waveform. Audio plays in sync, with volume, fades and mute applied as the render mixes them. Click or drag to seek; it reloads at the same frame as the agent edits.
  - New skill capability `place-audio`.

## 0.1.0

### Minor Changes

- 4169473: First public release: the `genmotion` CLI (init, dev, render, still, check, info,
  scene add, mcp, skills, templates, browser, doctor), `npm create genmotion`, and
  the Three.js engine runtime that scenes are written against.
