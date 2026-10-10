# @genmotion/shared

## 0.2.1

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
