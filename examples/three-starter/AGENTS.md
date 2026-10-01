# Three.js starter

A GenMotion video project powered by the Three.js engine. Scenes are plain
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

## Scene authoring

# What a scene is

A scene is a plain TypeScript module — **no JSX, no React, no HTML** — that default-exports a *builder*. The builder runs ONCE, when the scene becomes active, and returns a callback the host runs once per rendered frame.

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, fps, durationInFrames } = ctx;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: "#6ee7ff", roughness: 0.3, metalness: 0.1 }),
  );
  cube.name = "hero-cube";                       // see "Naming" below

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 4, 5);
  scene.add(cube, key, new THREE.AmbientLight(0xffffff, 0.8));
  scene.background = new THREE.Color("#07070c");
  camera.position.z = 5;

  return ({ time, progress }) => {
    cube.rotation.y = time * 0.8;
    camera.position.z = 5 - progress * 0.6;      // a slow push in
  };
}
```

The rules this shape exists to enforce:

- **Build once, position per frame.** Geometry, materials, textures, lights and canvas textures are created in the builder. The callback only *sets values* — positions, rotations, scales, opacities, colours, camera. Allocating in the callback allocates 30 times a second and leaks the GPU.
- **The frame argument is the only clock.** The callback receives `{ frame, time, fps, progress }`: `frame` counts from 0, `time` is `frame / fps` in seconds, `progress` runs 0→1 across the scene. **Never** `new THREE.Clock()`, `renderer.setAnimationLoop`, `requestAnimationFrame`, `Date.now()` or `performance.now()` — the host renders exactly one frame per call, and anything reading a wall clock renders a different video every time it is exported. Validation rejects these.
- **Deterministic only.** No `Math.random()` (seed your own: a small `mulberry32`-style function in `components/` is fine, called in the builder), no `new Date()`, no timers, no `fetch`, no `document`/`window`.
- **Only two imports exist**: `three` and `@genmotion/three-engine`. No `three/addons` (no OrbitControls, GLTFLoader or post-processing passes), no GSAP, no React, no `@genmotion/motion`. Build from the core module: primitives, `BufferGeometry`, `Points`, `ShaderMaterial`, `ExtrudeGeometry`, `Shape`.
- **A scene is in the video only when `project.json` lists it.** Writing `scenes/03-outro.ts` is half the job; the other half is the entry in the manifest.

## What the context gives you

`{ canvas, renderer, scene, camera, setCamera, manager, width, height, fps, durationInFrames }`.

- `camera` is a `PerspectiveCamera(50°, width/height, 0.1, 2000)` at the origin — the host frames it for you. Move it, or call `setCamera(new THREE.OrthographicCamera(...))` to render with your own.
- `manager` is a `THREE.LoadingManager` the export's frame barrier waits on. **Every loader must be wired to it** (below), or an asset still in flight is captured as a blank surface.
- `width`/`height` are the composition's, in CSS pixels. Use them for aspect-dependent framing — a scene that only composes at 16:9 breaks the moment the project is 9:16.

# Animation: what you have

There is no motion library. The whole animation surface is one helper plus Three.js's own maths:

```ts
import { interpolate, Easing } from "@genmotion/three-engine";

interpolate(frame, [0, 14], [0, 1], Easing.easeOut)         // clamped at both ends, always
interpolate(frame, [0, 14, 90, 104], [0, 1, 1, 0])          // in, hold, out — multi-segment
```

- `interpolate(input, inputRange, outputRange, easing?)` — **note the shape differs from the React engine's**: the easing is the fourth argument, not an options object, and the result is always clamped (there is no `extrapolate` to pass).
- `Easing` is `linear`, `easeIn`, `easeOut`, `easeInOut`. That is the whole list. Default to `easeOut` for entrances and `easeInOut` for camera moves.
- **There is no `spring()`.** For an entrance with a little overshoot, use a three-point range: `interpolate(frame, [0, 12, 18], [0, 1.06, 1], Easing.easeOut)`. Deterministic, readable, and it lands exactly where you say it does.
- Reach for Three.js first for anything spatial: `THREE.MathUtils.lerp`/`clamp`/`smoothstep`/`degToRad`, `Vector3.lerpVectors`, `Quaternion.slerp` (never lerp Euler angles through a turn), `Color.lerpColors`, `CatmullRomCurve3.getPointAt(t)` for a path.
- `AnimationMixer` is allowed but must be driven explicitly: `mixer.setTime(time)` each frame, never `mixer.update(delta)`.
- Ambient motion is a slow term added to a value, not a separate system: `mesh.position.y = base + Math.sin(time * 0.8) * 0.04`. `time` is derived from the frame, so it stays deterministic.

# Text is a texture

There is no DOM here, so type has to be drawn into a canvas and shown on a plane. Draw it **once, in the builder** — never per frame — and animate the mesh, not the canvas.

```ts
const FONT = 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif';

/** One line of type as a plane. `pxPerUnit` decides how big a world unit is. */
function label(text: string, size: number, weight: number, colour: string, pxPerUnit = 300) {
  const font = `${weight} ${size}px ${FONT}`;
  const pad = Math.round(size * 0.35);
  const measure = new OffscreenCanvas(8, 8).getContext("2d")!;
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.4) + pad * 2;

  const canvas = new OffscreenCanvas(w, h);
  const g = canvas.getContext("2d")!;
  g.font = font;
  g.fillStyle = colour;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w / pxPerUnit, h / pxPerUnit),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
}
```

- Put this in `components/` the moment a second scene needs type. Every scene hand-rolling its own text helper is how a video ends up with four different typefaces.
- `MeshBasicMaterial`, not `MeshStandardMaterial`: type should not be lit, dimmed or shaded by the scene.
- `transparent: true, depthWrite: false` — otherwise the plane's empty corners punch holes in whatever is behind it.
- Draw at the size you want it read at. Rendering 24px type and scaling the plane up gives you soft, muddy letters; raise `size` (or `pxPerUnit`) instead.
- **Fading text means fading the material** (`material.opacity`), not the canvas.
- Multi-line copy is multiple labels, positioned by hand. There is no wrapping — decide the breaks yourself, and keep them to 2–6 words a line.

# Lights, materials, background

- **`MeshStandardMaterial` with no light is pure black.** One `DirectionalLight` (intensity 2–4) off to one side plus a dim `AmbientLight` (0.4–1) is the floor; a second, weaker directional from the opposite side stops the shadowed half going dead. `MeshBasicMaterial` needs none.
- The canvas is transparent and there is no DOM behind it, so **set the scene's own background**: `scene.background = new THREE.Color("#07070c")`. A `THREE.Fog` matching that colour is what stops a floor or a grid ending in a hard line.
- Keep materials few and shared. One material instance reused across twenty meshes is one GPU state change; twenty instances are twenty.
- **Every frame is rendered and screenshotted.** A heavy fullscreen shader, 4K textures, or a 200k-triangle mesh multiply export time by the frame count. Prefer geometry you can describe over geometry you have to load.

# The camera is a real camera

No `<Camera>` component and no fake zooms: move `camera.position`, call `camera.lookAt(...)`, or change `camera.fov` (then `camera.updateProjectionMatrix()`) in the frame callback.

- **Camera moves are SLOW: 30–60 frames**, eased `easeInOut`. This is the opposite of the 8–14 frames an element entrance takes, and getting it wrong is the most common way 3D reads as cheap.
- **One camera idea per scene.** A push, or an orbit, or a pull-back. Move the camera *or* the subject, not both.
- Framing is arithmetic you can do: at distance `d`, a 50° lens sees `2 * Math.tan(THREE.MathUtils.degToRad(50) / 2) * d` world units of height, and `that * (width / height)` of width. Use it to fit a subject to the frame instead of guessing, and to re-fit for portrait — `width/height` is given to you for exactly this.
- **Composition pixels per world unit** is `height / visibleHeight` at the subject's distance. That is how the 28px text floor below translates into this engine: a label whose plane is 0.4 units tall, seen where 1 unit is 260px, reads as 104px. Work it out, then confirm with `capture_frames`.
- An orbit is `camera.position.set(Math.sin(a) * r, y, Math.cos(a) * r)` with `camera.lookAt(0, 0, 0)`, where `a` comes from `interpolate`. Keep `r` constant unless the shot is a push.

# Naming: how the user points at things

The preview is one `<canvas>`, so there is no DOM for the editor's selection tools to read. It projects your scene graph instead: each object's box, through the camera, as an invisible element over the canvas. Click, marquee, the comment bubble and the Draw tool all work off those, and **the id they send you is `object.name`**.

- **Name everything that is a thing in the picture** — `logo.name = "hero-logo"`, `card.name = "stat-card"`, the group *and* the meshes inside it. Lower-case, hyphenated, named for what it is on screen (`price-tag`, `earth`, `chart-bar-3`), never `mesh1` or `obj`. Unique within the scene, and stable across edits — the user may have selected something before asking you to change it.
- Then "make this bigger" arrives as `#stat-card`, a string you can search the scene for. Unnamed, the same click arrives as `#Mesh-7`, numbered by traversal order and different the moment you add a mesh above it.
- **Name your text meshes after their words** (`headline`, `caption-price`). A canvas texture is a blank rectangle to the editor; the name is the only clue anyone has about which line it is.
- `object.userData.pickable = false` takes an object and its whole subtree out of the preview — a backdrop plane, a floor grid, helper geometry. Use it so a click lands on the subject rather than the wall behind it.
- `object.userData.pickBounds = new THREE.Box3(min, max)` (local space) says where a vertex-shader-driven visual actually draws. Geometry the CPU cannot measure — an `InstancedBufferGeometry` on a plain mesh is one prototype at the origin that a shader scatters — is otherwise skipped entirely. An `InstancedMesh` needs no hint.
- `capture_frames` reports what is selectable in the frame it drew. Read that line: it is exactly what the user's pointer will find.

# Assets

Import them; the bundler turns the import into a URL the renderer can load.

```ts
import textureUrl from "../assets/label.png";

const map = new THREE.TextureLoader(ctx.manager).load(textureUrl);
map.colorSpace = THREE.SRGBColorSpace;   // colour maps only, never data maps
```

- **Every loader takes `ctx.manager`.** A bare `new Image()`, `fetch()` or unmanaged loader is invisible to the export's frame barrier, and the frames that finish first ship untextured.
- **Never hot-link a remote URL** from scene code, and never a logo CDN: the link rots or the host blocks the renderer and the finished video gets a hole in it. `save_asset(url)` copies the file into `assets/` and returns the path to import. For a real brand mark, find the real file — never generate or redraw one.
- Video is a `THREE.VideoTexture` over a `<video>` element you seek yourself from the frame callback (`el.currentTime = time`), never one you `play()`.
- Audio never lives in a scene. It goes on the timeline, in `project.json`'s `audio` array — the export mixes only what the manifest lists.

# You are making VIDEO, not a website

This is the most common failure mode — internalize it. Scenes are frames of an animated film that people WATCH; nothing is clickable, hoverable, or scrollable. Web-design habits produce scenes that look like screenshots of landing pages, which is wrong:

- NO buttons, "Shop Now"/"Get Started"/"Sign Up" pills, input fields, nav bars, footers, cookie banners, or link styling. If a brief asks for a call to action, express it cinematically: a bold animated headline (e.g. the product name + tagline sweeping in), the logo settling center-frame, a URL or handle in elegant type — not a button to nowhere.
- THE ONE EXCEPTION: a UI element may appear when it is ACTED UPON and the action is the shot — a cursor gliding in and clicking a button, a toggle flipping, a field filling itself in, a card being dragged. That is a demo beat or a scene handoff (see below), and the element must move, be used, and pay off. A button that merely sits in frame is page furniture; a button that a cursor clicks and that then expands to become the next scene is motion design. If nothing happens to it, cut it.
- NO page layouts: no hero-section-left-text-right-image, no three-column feature grids with icons unless they're choreographed as animated moments (cards flying in one at a time is motion; a static grid is a website).
- Think like a title designer or motion-graphics artist: one idea per moment, full-frame compositions, movement carrying the story. Reference points are film title sequences, Apple keynote videos, and product launch films — not landing pages.
- Text appears, breathes, and exits with intent. Headlines are protagonists, not labels above a button.
- If a brand's website styles inform the scene (colors, type, logo), borrow the AESTHETIC — palette, typography, mood — never the page furniture (buttons, forms, navigation).

# Design standards (hold yourself to these)

IMPORTANT: when the task or brief specifies a brand's design style (colors, light/dark mode, logo URL, typography), that brand style OVERRIDES the defaults below. Follow the brief's exact hex values and mode strictly, and use the logo URLs it gives you verbatim.

- You are designing 1080p motion graphics, not web pages. Think big but restrained: headlines 72–130px, generous spacing, strong hierarchy.
- TEXT MUST BE LARGE AND READABLE — this is watched on a phone, in a feed, at a glance, often at a fraction of full size. Sizes for a 1080p frame: hero headline 72–130px, supporting line 34–48px, labels/captions/annotations 28–34px, eyebrow labels 22–28px. **28px is the absolute floor — never render text smaller than that, for any reason.** If a layout only works with small text, the layout is wrong: cut words, split it across beats, or make the element bigger. For non-1080p compositions, scale these by frame height (the floor is ~2.6% of height) rather than reusing the px numbers. UI mock-ups inside a scene follow the same floor — zoom into the one part of the interface that matters instead of shrinking a whole screen to fit.
- TYPOGRAPHY IS MINIMAL AND QUIET — this is the house style. Default to weight 400–500 for headlines (500 max; NEVER 700+, never "bold everything"). Hierarchy comes from SIZE and COLOR contrast, not weight. Inter at letterSpacing "-0.01em" to "-0.03em" on large text only; body/captions at normal tracking, weight 400. One type size pair per scene (one hero size + one supporting size) — three sizes max. Sentence case, never ALL-CAPS (uppercase 22–28px eyebrow labels with wide tracking are the one exception). No gradient text, no text shadows, no outlined text, no italics for emphasis.
- Less text, more air: a scene says ONE thing. 2–6 words for a headline, a short supporting line at most. If you're writing a paragraph, cut it. Whitespace is the design.
- Ease EVERYTHING. Nothing may move linearly unless it's a deliberate effect. Default to your engine's smoothest ease-out for entrances, and ease in AND out of anything the camera does.
- Entrances: stagger elements 2–4 frames apart, combine opacity + transform (translateY 40–80px, or scale 0.96→1). Subtle beats showy.
- Color: dark, cinematic backgrounds by default (#0a0a0c, deep gradients, subtle radial glows). One accent color per scene family, used sparingly. Primary text slightly off-white (#ededef), secondary text muted (#8a8a93) — most text should be the muted tone, with only the focal phrase at full contrast.
- NEVER USE INACCESSIBLE COLOR. Every text-on-background pair must clear WCAG AA: **≥4.5:1 for text under 60px, ≥3:1 for display text 60px and above.** When you are unsure of a ratio, go brighter — a slightly-too-bright caption is a minor style miss, an unreadable one is a broken scene. Concretely, on a near-black background: #ededef ≈ 17:1, #8a8a93 ≈ 5.8:1 (the dimmest secondary tone allowed), and anything dimmer fails. Never set text with white alpha below 0.6 (`rgba(255,255,255,0.35)` is unreadable — use a solid muted hex instead). Never put text directly on a photo, video, busy gradient or glow without a scrim behind it (a solid/gradient panel, or a dark overlay at 0.45–0.65 alpha). Never use saturated hues as body text on a same-family background (#0000ff on #0a0a0c, yellow on white, mid-grey on mid-grey). Accent colors are for large text, fills, strokes and glows — not for small copy. And never let color be the ONLY thing carrying meaning: pair it with size, position, an icon or a label, so the frame still reads for a color-blind viewer and in a monochrome thumbnail.
- Motion arcs: give scenes a beginning (entrance), middle (hold/secondary motion), and end (exit/handoff). Nothing may still be arriving when the scene cuts.
- TIMINGS ARE SHORT AND TIGHT. Individual animations are quick and confident, never languid: entrances 8–14 frames, exits 6–10 frames (an exit is always faster than its entrance), staggers 2–4 frames, transforms landing inside half a second. When the brief asks for energy, pace, or a fast-paced edit, compress further — 6–10 frame entrances, 2-frame staggers, beats cutting every 20–40 frames. Overlap rather than queue: the next element starts while the previous is still settling. A 30-frame fade reads as a stall, not as elegance.
- Tight animations and a full-duration arc are NOT in conflict, and confusing them is a common failure. Each individual move is fast; the BEATS are spread across the whole `durationInFrames`. Never fire everything in the first 15 frames and then hold a frozen frame — stage the beats (enter → hold → exit → next beat enters) so something is always resolving, with ambient motion underneath.
- The frame must NEVER be fully static. Choreography spans the entire durationInFrames: staged entrances throughout (not all in the first second), and ambient motion between beats — slow drifts (a few px over seconds), glow/opacity pulses, gradient shifts, gentle scale breathing (1.0→1.02). A viewer pausing at any frame should still sense the design; a viewer watching should never feel the video has stopped.
- Subtle depth: soft shadows (boxShadow with large blur + low alpha), 1px borders rgba(255,255,255,0.08–0.15), borderRadius 12–24px on cards.
- Durations: ~90–150 frames for a title/intro scene, 120–240 for content scenes. Respect what the user asks for.

## Reading those standards in three dimensions

They are written for a 1080p frame, and they hold here — the viewer cannot tell which engine drew the picture. The translations:

- **Sizes are on-screen sizes.** The 28px floor is 28 composition pixels as captured, not a number in your source. Work it out from the camera (above), then look at a frame.
- **Depth replaces the CSS depth cues.** No `boxShadow` or `1px rgba border` here: separation comes from real distance between objects, a rim light, fog, or a darker plane behind the subject.
- **Restraint matters more, not less.** Three dimensions make it easy to fill a frame with spinning objects; a scene still says ONE thing. A slow move on one well-lit subject beats five things tumbling.
- **Never tilt type you want read**, and keep text planes facing the camera (parallel to the screen plane) unless the tilt is the point.

# Everything enters and exits

An object that appears and is still sitting there when the scene cuts is as wrong here as a headline that never leaves. There is no `exit="auto"` to do it for you, so time it yourself against `durationInFrames`:

```ts
const IN = 14;
const OUT = 10;
return ({ frame }) => {
  const enter = interpolate(frame, [0, IN], [0, 1], Easing.easeOut);
  const leave = interpolate(frame, [durationInFrames - OUT - 6, durationInFrames - 6], [0, 1], Easing.easeIn);
  const shown = enter * (1 - leave);
  title.material.opacity = shown;
  title.position.y = 0.4 + (1 - enter) * 0.25 - leave * 0.2;
};
```

- The exit COMPLETES ~6 frames before the scene ends, so the cut lands on a clear frame.
- Exits are faster than entrances (8–14 in, 6–10 out) and travel the same axis the entrance came along.
- Stagger a group by index: `interpolate(frame, [i * 3, i * 3 + 12], [0, 1], Easing.easeOut)`.
- The handoff element is the exception: it survives the cut (below).

# Scene handoffs

Scenes are cut together into one film, so each must not fade to black and restart. Every scene after the first shares a HANDOFF ELEMENT with the one before: the same object, at the same size, colour and screen position, at the boundary.

In this engine the handoff is usually the camera or one mesh:

- Scene N ends with the camera pushed until one object fills the frame; scene N+1 opens with its own camera at that same framing and pulls back.
- A mark scales up until its silhouette is the whole frame; the next scene opens inside that colour.
- An object slides to the edge and parks; the next scene opens with it already parked there, small, and the new subject arrives around it.

The contract: the last ~10–15 frames of scene N and the first ~10–15 of scene N+1 are mirror images — matching *at the boundary* is what makes the cut invisible. The handoff element gets no exit in scene N; everything else clears before it. Keep it fast, 8–14 frames a side, and never use a whole-scene fade as the transition.

# Checking your work

- `validate_scene` compiles the scene, loads it, and rejects the clock and determinism violations above. It CANNOT render WebGL in Node, so a scene that validates has only been proved to build.
- `capture_frames` is how you see it. Use it after every visual change and before telling the user a look is right — 3D is unforgiving about lighting and framing, and an unlit `MeshStandardMaterial`, a subject off frame, or type too small to read all validate perfectly. A frame or two per scene you touched, not a sweep of the whole video.

## Working from the terminal

Everything the GenMotion app does for this folder, the `genmotion` CLI does too.
Every command takes `--json` and prints exactly one JSON object.

| Step | Command | MCP tool (`npx @genmotion/cli mcp`, wired in `.mcp.json`) |
|---|---|---|
| Pick the skill for this kind of video | `npx @genmotion/cli skills search "<request>" --json` | `search_skills` |
| Read a skill | `npx @genmotion/cli skills show <id>` | `get_skill` |
| What's in the project | `npx @genmotion/cli info --json` | `project_overview` |
| Add a scene (file + manifest entry) | `npx @genmotion/cli scene add "Hero" --duration 4s` | `add_scene` |
| Validate scenes without rendering | `npx @genmotion/cli check --static --json` | `validate_scene` |
| Compile + determinism + headless render of every scene | `npx @genmotion/cli check --json` | `check_project` |
| Look at frames | `npx @genmotion/cli still --at 1s --at 50%` | `capture_frames` |
| Add an npm package | `npm install --ignore-scripts <pkg>` | `add_package` |
| Live preview for the user | `npx @genmotion/cli dev --background` | — |
| Final MP4 | `npx @genmotion/cli render --json` | `render_video` |

For a new video, start with the `genmotion` skill (`.claude/skills/genmotion/`): it picks the
video-type skill, and `VIDEO.md` records the choice. Don't call a video done
until `check` passes and you have looked at stills from every scene.
