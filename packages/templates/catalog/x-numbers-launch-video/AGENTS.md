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
- **Name everything the user can see** — `mesh.name = "hero-logo"`. This is
  what makes the preview clickable; see below.
- **Check your work** with the `validate_scene` tool before you finish. It
  compiles and loads the scene, but — unlike the React engine — it cannot
  render WebGL output in Node. Follow up with `capture_frames` to see what
  the scene actually draws.

## Naming: how the user points at things

A React scene is a DOM tree, so the editor can let the user click a heading and
tell you `#hero-title`. This scene is one `<canvas>`, which has nothing in
it to click. So the editor projects your scene graph: every frame it takes each
object's box, projects it through the camera, and lays an invisible element over
it. Click, marquee select, the comment bubble and the Draw tool all read those.

**The id the user's click sends you is `object.name`.** Set it on everything
that is a thing in the picture, and a message like "make this bigger" arrives as
`#stat-card-2` — a string you can search the scene for. Leave names unset and
the same click arrives as `#Mesh-7`, which is numbered by traversal order and
changes the moment you add a mesh above it.

```ts
const logo = new THREE.Mesh(logoGeometry(), brandMaterial());
logo.name = "hero-logo";

const card = new THREE.Group();
card.name = "stat-card";          // the whole card, as one thing
card.add(label, value, plinth);    // each named too — a click takes the innermost
scene.add(logo, card);
```

- **Name for what it is on screen**, not what it is made of: `price-tag`,
  `earth`, `chart-bar-3` — never `mesh1`, `geo`, `obj`.
- **Lower-case, hyphenated, unique within the scene, and stable across edits.**
  The user may have selected something before asking you to change it; renaming
  it mid-conversation loses that thread. Two objects sharing a name get
  suffixed (`card`, `card-2`), which is worse than naming them apart.
- **Name groups as well as their contents.** A named group is how the user
  grabs a composite thing ("move the whole card"); the innermost named object
  under the pointer wins a click, so both work.
- **Text is a thing too.** Type drawn into a canvas texture reads as a blank
  rectangle to the editor, so its name is the only clue anyone has about which
  line it is: name it after the words on it (`headline`, `caption-price`).

Two kinds of object cannot be measured from the CPU and so are skipped:
geometry a vertex shader places (an `InstancedBufferGeometry` on a plain mesh
is one prototype at the origin, scattered by per-instance attributes), and
anything smaller than a few pixels on screen. For the first, say where it draws
and it becomes selectable anyway:

```ts
particles.name = "starfield";
particles.userData.pickBounds = new THREE.Box3(
  new THREE.Vector3(-8, -4.5, 0),
  new THREE.Vector3(8, 4.5, 0),
); // local space, the area the shader actually fills
```

And the other way: `object.userData.pickable = false` takes an object and
everything under it out of the preview entirely. Use it for scenery nobody
would mean to select — a backdrop plane, a floor grid, helper geometry — so the
selection under the pointer is the subject rather than the wall behind it.

After any visual change, `capture_frames` reports what is selectable in the
frame it drew. Read that line: it is the list the user's pointer will see, and
placeholder names (`#Mesh-7`) in it are objects still waiting to be named.
