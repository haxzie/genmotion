# Create a 3d globe using kobe,

A GenMotion video project. Scenes are React components rendered frame by frame
and encoded to MP4 — every frame must be a pure function of its frame index.

## Layout

| Path | What it is |
|---|---|
| `project.json` | The timeline: fps, dimensions, scene order and durations, audio placement. Edit it to reorder, retime, or add scenes. |
| `scenes/` | One default-exported React component per file. Order comes from `project.json`, not the filename. |
| `components/` | Shared pieces. Factor anything used twice into here. |
| `assets/` | Images, audio, video. Import them (`import logo from "../assets/logo.png"`) rather than hard-coding URLs. |
| `.genmotion/` | App state. Don't edit. |

## Rules

- **Deterministic only.** No `Math.random`, `Date.now`, `new Date()`, timers,
  `requestAnimationFrame`, `fetch`, or direct `document`/`window` access. Use
  `random(seed)` from `@genmotion/motion` and drive everything from
  `useCurrentFrame()`. Validation rejects scenes that break this.
- **No CSS transitions or animations.** The renderer seeks to a frame and
  screenshots it; anything animating on wall-clock time will not be there.
- **Adding a scene** means writing the file *and* adding an entry to
  `project.json`. A file nothing references is not in the video.
- **Assets are local.** Import them from `assets/` and use the imported
  value as the `src`. Never hot-link a remote URL from scene code: the link
  rots or the host blocks the renderer, and the finished video gets a hole in
  it. Use the `save_asset` tool to copy a remote file in first.
- **New packages** go through the `add_package` tool, not `npm install` — it
  screens for browser safety and installs without running lifecycle scripts.
  `react`, `@genmotion/motion`, `gsap`, `three`, and `lucide-react` are
  already available and supplied by the host at runtime.
- **3D goes through `<ThreeScene>`** from `@genmotion/motion`, never a
  hand-rolled `WebGLRenderer` and never `setAnimationLoop`. The component
  owns the canvas, the pixel ratio the export captures at, and one render per
  frame; a scene that starts its own loop animates in the preview and comes out
  frozen. `three/addons` (OrbitControls, loaders) is NOT available — the host
  supplies the main `three` module only.
- **Check your work** with the `validate_scene` tool before you finish. It
  compiles the scene, loads it, and renders three frames.
