# X Numbers launch video

A feature announcement that opens on orbiting app icons, then walks a phone screen through the menu, the number sheet and a chat in the dark.

Started from the **X Numbers launch video** template. A GenMotion video project powered by the Three.js engine. Scenes are plain
TypeScript modules — no React, no JSX, no HTML — that build a `THREE.Scene`
once and update it frame by frame. Every frame must be a pure function of the
frame index the host hands you.

## Layout

| Path | What it is |
|---|---|
| `project.json` | The timeline: fps, dimensions, scene order and durations, audio placement. Edit it to reorder, retime, or add scenes. |
| `scenes/` | One default-exported scene builder per file. Order comes from `project.json`, not the filename. |
| `components/` | Shared pieces (geometry factories, materials) used by more than one scene. |
| `assets/` | Images, audio, video, models. Import them (`import logo from "../assets/logo.png"`) rather than hard-coding URLs. |
| `.genmotion/` | App state. Don't edit. |

## Rules

- **A scene file default-exports a builder**: `export default function
  buildScene(ctx) { ...set up the scene graph...; return (frame) => {
  ...update it...; }; }`. The builder runs once, when the scene becomes
  active; the returned callback runs once per rendered frame.
- **Never start your own clock.** No `new THREE.Clock()`, no
  `renderer.setAnimationLoop`, no `requestAnimationFrame`. The host renders
  exactly one frame per call — drive every transform from the `time`/
  `frame`/`progress` argument your update callback receives. Validation
  rejects scenes that break this.
- **Deterministic only.** No `Math.random`, `Date.now`, `new Date()`,
  timers, `fetch`, or direct `document`/`window` access.
- **Adding a scene** means writing the file *and* adding an entry to
  `project.json`. A file nothing references is not in the video.
- **Assets are local.** Import them from `assets/` and load them
  through a loader wired to `ctx.manager` — e.g. `new
  THREE.TextureLoader(ctx.manager).load(url)` — never a bare `new Image()`
  or `fetch()`, which the export's frame barrier can't wait on. Never
  hot-link a remote URL from scene code. Use the `save_asset` tool to copy a
  remote file in first.
- **New packages** go through the `add_package` tool, not `npm install` —
  it screens for browser safety and installs without running lifecycle
  scripts. `three` and `@genmotion/three-engine` are already available and
  supplied by the host at runtime.
- **No GSAP, no React, no DOM composition.** This engine's whole surface is
  `three` plus `@genmotion/three-engine`'s tiny `interpolate`/`Easing`
  helper — reach for Three.js's own `MathUtils`, `Quaternion.slerp`, or
  `AnimationMixer` (driven by an explicit `setTime`, never its own clock)
  first.
- **Check your work** with the `validate_scene` tool before you finish. It
  compiles and loads the scene, but — unlike the React engine — it cannot
  render WebGL output in Node. Follow up with `capture_frames` to see what
  the scene actually draws.
