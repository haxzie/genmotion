---
name: make-video
description: Make a video with code — a launch video, explainer, logo sting, social clip, data animation or any motion graphics — and render it to MP4. Use whenever the user asks to create, animate, preview or export a video, even if no video project exists yet.
---

# Making a video with GenMotion

GenMotion videos are folders of Three.js scenes. Every frame is a pure function
of time, so the live preview and the rendered MP4 are the same pictures.

## 0. Find or create the project

- A folder with a `project.json` is a GenMotion project — work there, and read
  its `AGENTS.md` first (it has the scene rules).
- No project yet: create one. Pick a short folder name from the brief.
  ```sh
  npx genmotion init launch-video --yes                 # 1920x1080, 30fps
  npx genmotion init reel --size portrait --yes         # 1080x1920
  npx genmotion templates                               # or start from a template:
  npx genmotion init launch --template <id> --yes
  ```
  Then `cd` in and read its `AGENTS.md`.

## 1. Plan

Pin down purpose, length and aspect ratio; ask only what you can't infer.
Plan 3–8 scenes of 2–6 s, one idea each. Call `get_guide` with `three` (or read
the "Scene authoring" section of AGENTS.md) before writing your first scene.

## 2. Build

- `add_scene` (or `npx genmotion scene add "Hero" --duration 4s`) creates the
  file **and** registers it in `project.json`. Then write the builder.
- Delete the starter scene (file and `project.json` entry) once you have your own.
- Remote images/fonts/models: `save_asset` first, then import from `assets/`.

## 3. Verify — every time, before you say it's done

1. `check_project` (or `npx genmotion check --json`): compile, determinism
   rules, and a real headless render of each scene's first/middle/last frame.
   Fix every `error`; read every `warning`.
2. `capture_frames` returns the frames as images — **look at them**. Fix what
   looks wrong (layout, contrast, text overflow, empty frames) and re-capture.

## 4. Deliver

- Live preview for the user: `npx genmotion dev --background` → prints the URL.
- The MP4, when asked or at the end: `render_video` (or `npx genmotion render`)
  → `exports/<name>.mp4`. Report the path, length and size.

## Rules that bite

- No clocks: no `THREE.Clock`, `setAnimationLoop`, `requestAnimationFrame`,
  `Date.now`, `Math.random`, timers. Drive everything from the
  `time`/`frame`/`progress` your update callback receives.
- Load assets through `ctx.manager` (`new THREE.TextureLoader(ctx.manager)`),
  so the renderer waits for them.
- Name every visible object (`mesh.name = "hero-logo"`).
