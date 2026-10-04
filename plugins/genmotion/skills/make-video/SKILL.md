---
name: make-video
description: Make or edit a video with GenMotion — launch videos, feature announcements, explainers, logo stings, app store previews, product walkthroughs, social ads, or anything custom — and render it to MP4. Use for any request to create, change, animate, preview or export a video.
---

# Making a video with GenMotion

GenMotion videos are folders of scenes (Three.js by default) listed in `project.json`. Every frame is a pure function of time, so the preview and the rendered MP4 are the same pictures.

## 0. Find or create the project

- A folder with a `project.json` is a GenMotion project: work there and read its `AGENTS.md` (the scene rules) first.
- No project yet: create one with `create_project` (or `npx @genmotion/cli init <folder> --yes`; `--size portrait` for 9:16). A catalog template is `list_templates`, then `create_project` with `template`.

## 1. Pick the skill that owns this video

GenMotion ships a skill pack: one skill per kind of video, plus craft skills (camera, type, transitions, look) for the engine.

1. If `VIDEO.md` exists, it already names the skill. Load that one and carry on.
2. Otherwise read the router, `genmotion-skills`, for the rules, then search with a short phrase for the deliverable, not the whole brief (`"launch video"`, `"animated logo for a coffee roastery"`: brand names, colours and platform details drown the words that pick the format): `search_skills` with that phrase.
3. Pick **one** owner (a `workflow` or `style` result), ask only its missing `askFirst` questions, and write `VIDEO.md` as the router describes.
4. Read the owner and the requirements search lists for this engine: `get_skill`.

## 2. Build

- `add_scene` creates a scene file **and** registers it in `project.json`. Then write the builder. Delete the starter scene once you have your own.
- Remote images, fonts, recordings: `save_asset` first, then import from `assets/`.

## 3. Verify, every time, before you say it's done

1. `check_project`: compile, determinism rules, and a real headless render of each scene's first, middle and last frame. Fix every `error`, read every `warning`.
2. `capture_frames`: **look at the frames**. A check that passes can still be an ugly frame.
3. The owner skill's own checklist.

## 4. Deliver

- A live preview for the user: `npx @genmotion/cli dev --background` prints the URL.
- The MP4, when asked or at the end: `render_video` writes `exports/<name>.mp4`. Report the path and length.

## Capabilities

Skills name what to do as backticked capability ids, never tool names. What each one is here:

| Skill says | Meaning | With the `genmotion` MCP server |
| --- | --- | --- |
| `validate` | Check the scenes you just wrote | `check_project` (or `validate_scene` for one file) |
| `capture-frames` | Render frames and look at them | `capture_frames` |
| `project-overview` | The project's scenes, timing, audio and assets | `project_overview` |
| `save-asset` | Copy a remote image, video, font or audio file into `assets/` | `save_asset` |
| `generate-image` | Generate artwork | not available — ask the user for the image, or build the visual from geometry and type instead |
| `pick-voice` | Choose a narration voice | not available — ask the user which voice, or skip if there is no narration |
| `voiceover` | Narration | not available — use an audio file the user provides (put it in `assets/` and place it with `place-audio`), or carry the words as on-screen type |
| `sfx` | Clicks, taps, chimes and other cues | not available — place sound files the user provides with `place-audio`; or credited CC0 sounds found with `web-research`; or placeholders synthesised with `ffmpeg` (tested recipes in `sound-design`; tonal cues, never a noise bed, room tone or air), named as placeholders to the user; silence only where the skill allows it |
| `music` | A music bed or score: generated, or found under a licence that allows the use | not available — use a track the user provides; or generate one through a connected music service (ElevenLabs, or Replicate/fal models) — offer it with `recommend-integration`; or find a CC0 or attribution-licensed track with `web-research`, fetch it with `save-asset` and credit it. Place it with `place-audio`. With none of these, carry the video on sfx and silence rather than an unlicensed song |
| `transcribe` | Words with timestamps from speech, for cutting footage by what is said | not available — run a local Whisper with word timestamps if your shell has one (`whisper-cli` from whisper.cpp, or `whisper` from the openai-whisper Python package; installing one needs the user's go-ahead and a model download), or a connected speech-to-text service (ElevenLabs' connector transcribes; offer it with `recommend-integration`), or a transcript or subtitle file the user has. Without any of these, cut on silences found with `ffmpeg` (`silencedetect`); captions then need the words from the user, so ask once, even after "just make it" — never invent caption words |
| `place-audio` | Put music, narration or an effect on the timeline (`project.json`'s `audio`) | `add_audio` (then `update_audio` / `remove_audio`) |
| `search-skills` | Rank the skill pack against a request | `search_skills`, then `get_skill` |
| `search-scenes` | Find how a beat (hook, integrations, stat, end card…) was done in GenMotion's templates: frames, notes and code | `search_scenes`, then `get_scene` |
| `recommend-integration` | Offer the user a connector a skill wants | not available — say in one sentence which service would help and carry on without it |
| `ffmpeg` | Trims, transcodes, frame extraction | `ffmpeg` in your shell, if you have one |
| `web-research` | Look things up on the web | your own web tools |

## Don'ts

- No clocks: no `THREE.Clock`, `setAnimationLoop`, `requestAnimationFrame`, wall-clock time or unseeded randomness. Everything comes from the `time`/`frame`/`progress` your update callback receives.
- No hot-linked remote URLs in scene code.
- Never two owner skills at once.
