---
"@genmotion/cli": minor
"@genmotion/shared": patch
---

Timeline audio from the CLI, and a real timeline in the dev studio.

- `genmotion audio add|set|remove|list` puts music, narration and effects on the timeline: `--at`, `--duration`, `--from`, `--track`, `--volume`, `--fade-in`, `--fade-out`, `--name`, `--mute`. A URL is saved into `assets/` first. Clips get a free lane, and a clip that would overlap the next one on its lane is shortened and reported.
- MCP tools `add_audio`, `update_audio` and `remove_audio` do the same for agents. `project_overview` and `info` now report each clip's track, offset, fades and name.
- `genmotion dev` shows a timeline under the picture: a ruler, the scene track, and every audio lane with its waveform. Audio plays in sync, with volume, fades and mute applied as the render mixes them. Click or drag to seek; it reloads at the same frame as the agent edits.
- New skill capability `place-audio`.
