# Google Generative AI Launch Video

A product launch: a ring of real-world tiles spins into a headline, generative art morphs from a card into full-bleed, a model roster locks into an omni layout, and it closes on the Gemini mark.

Started from the **Google Generative AI** template. A GenMotion video project. Scenes are React components rendered frame by frame
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

## Scene authoring

# What a scene is

A scene is a self-contained TSX module that default-exports a React component. Scenes render deterministically: the visual output must be a pure function of the current frame. Time everything in frames (fps × seconds; the project's fps, width, and height are given in the context).

Rules every scene MUST follow:
- `export default function Scene() { ... }` — exactly one default-exported component.
- Only these imports are available: `react`, `@genmotion/motion`, `gsap`, `three`, `lucide-react`. Nothing else (no fetch, no window/document access, no other libraries, no CSS files, no `three/addons`).
- NEVER use Math.random(), Date.now(), new Date(), setTimeout, setInterval, requestAnimationFrame, or CSS animations/transitions. Use the frame-driven APIs below; for randomness use `random(seed)`.
- Inline styles only (style={{...}}). Design in absolute pixels for the composition size.
- NEVER mix a CSS shorthand and its longhand for the same property on ONE element — most commonly `background` and `backgroundColor` together (React errors when one animates while the other is set). Pick ONE: `backgroundColor` for a solid color, or `background`/`backgroundImage` for a gradient/animated fill — not both.
- Give every meaningful on-screen element a unique, descriptive `id` (e.g. id="hero-title", id="cta", id="stat-1", id="logo"). The user can click an element in the preview to point you at it — that element's id is sent to you as context — so keep ids stable across edits and reuse them when you change an element. Ids must be unique within the scene.
- Scenes start at frame 0 and run for their durationInFrames.

# @genmotion/motion API

Hooks:
- `useCurrentFrame(): number` — current frame, starting at 0 (relative to the enclosing <Sequence> if any).
- `useVideoConfig(): { fps, width, height, durationInFrames }` — `durationInFrames` here is always the WHOLE scene.
- `useWindowDuration(): number` — length of the window this element lives in: the enclosing `<Sequence>`'s duration, or the scene's when there isn't one. This is the number to time an exit against.

Animation math (all pure functions):
- `interpolate(frame, inputRange, outputRange, { easing?, extrapolateLeft?, extrapolateRight? })` — map frame to a value. Ranges can be multi-segment: `interpolate(f, [0,20,40], [0,1,0])`. ALWAYS pass `extrapolateLeft: "clamp", extrapolateRight: "clamp"` unless you want extension.
- `spring({ frame, fps, from?, to?, config?, delay?, durationInFrames? })` — physics spring from 0→1 (or from→to). config: { mass, stiffness, damping }. Use `springPresets.default | gentle | bouncy | molasses | stiff`.
- `Easing` — `Easing.outSmooth` (signature ease, use it by default), `outCubic`, `outQuart`, `outExpo`, `outBounce`, `inOutCubic`, `linear`, `Easing.bezier(x1,y1,x2,y2)`, `Easing.out(Easing.quad)` etc.
- `stagger({ frame, index, each?, duration?, delay?, easing? })` — eased 0..1 progress for the index-th item of a list; items start `each` frames apart.
- `timeline(frame, [{ at, dur, ease? }, ...])` — array of 0..1 progress values, one per segment.
- `progress(frame, from, to, ease?)` — eased 0..1 between two frames.
- `random(seed)` — deterministic pseudo-random in [0,1). Vary the seed: `random("x" + i)`.

Components:
- `<AbsoluteFill style={{...}}>` — absolute inset-0 flex container (column, centered). The root of almost every scene.
- `<Sequence from={30} durationInFrames={60}>` — children mount at frame 30 and see their own frame starting at 0. Great for choreographing phases.
- `<TextAnimation text="..." preset="blurUp" exit="auto" />` — THE way text animates. Splits into lines/words/characters and staggers them in, and back out again, from the catalog below. Do NOT hand-roll per-word or per-character spans driven by `interpolate`/`stagger` — this component exists so you never have to, and hand-rolled text is the single most common source of broken timing.
  - `text` — a string; `"\n"` or a `string[]` gives explicit lines. `by="word"` (default) | `"char"` | `"line"` | `"none"`. Line splitting is explicit: you write the breaks, there is no measured wrapping.
  - `exit` — **`exit="auto"` is what you want almost every time.** The text leaves the way it arrived, timed so the last unit clears 6 frames before its window ends. It reads the enclosing `<Sequence>`'s length (or the scene's), so you never compute an exit frame yourself. Also: `exit="fadeUp"` to borrow another effect's shape, `exit={{ at: 90, duration: 8 }}` to place it by hand, or omit it entirely for text that must survive the cut (a handoff element).
  - `order` — the sequence units fire in: `"forward"` (default), `"reverse"`, `"center"`, `"edges"`, `"random"`.
  - `hold` — ambient motion held between the entrance and the exit: `"float"`, `"breathe"`, `"wave"`, `"shimmer"`, `"glow"`. Put one on any text that sits on screen for more than ~40 frames; it is what stops a held frame reading as frozen.
  - `startFrom`, `duration`, `stagger`, `easing` — every effect already carries tuned defaults, so pass these ONLY when the brief calls for a different pace.
  - `id` — set it whenever the camera focuses this text. `as` — render as `h1`/`div`/`p` etc. `style`/`className` land on the root.

Text effects (all of them work as both an entrance and an exit):
Blur — the house look:
  `blurIn` — Resolves out of a soft blur, in place.
  `blurUp` — Blur + rise + fade. The house default for hero headlines.
  `blurDown` — blurUp inverted — settles downward. Pairs with text leaving upward.
  `scaleBlur` — Zoom-blur focus-in: settles down from slightly larger and soft.
  `softFocus` — A gentler scaleBlur — barely-there scale, cinematic on long copy.
  `focusIn` (lines) — Wide and out of focus, pulling sharp and tight. Whole lines only.
Masks & wipes:
  `riseMask` — Masked slide-up with no fade — the clean editorial reveal.
  `wordReveal` — Masked rise that also fades. Softer than riseMask.
  `dropMask` — riseMask inverted — drops in from above the mask.
  `clipReveal` — Left-to-right wipe via clip-path. No fade; the clip does the work.
  `wipeLeft` — Right-to-left clip wipe.
  `wipeUp` — Bottom-to-top clip wipe. Strong on stacked lines.
  `wipeDown` — Top-to-bottom clip wipe.
  `curtain` — Opens outward from the centre line.
  `irisIn` — Circular iris opening. Best on short words or single lines.
Fades & slides:
  `fadeIn` — Straight cross-fade. The quietest entrance there is.
  `fadeUp` — Rises a little as it fades in, and keeps rising on the way out.
  `dropIn` — Falls in from above and keeps falling on exit.
  `slideIn` — Travels in from the right and continues left on exit.
  `fadeLeft` — Enters from the left with a touch of directional blur.
  `fadeRight` — Enters from the right with a touch of directional blur.
Scale:
  `scaleIn` — Grows in from small.
  `scaleUp` — Restrained grow-in. The house-style alternative to scaleIn.
  `scaleDown` — Settles down from slightly oversized. Confident, not showy.
  `popIn` — Overshoots past full size and settles back. Playful.
  `stampIn` — Slams down from far too big. Impact moments only.
  `squashIn` — Squashed flat, springing to full height.
Editorial:
  `typewriter` — Units appear one at a time, no fade. Pair with a monospace face.
  `trackingIn` (lines) — Letter-spacing collapses from wide to normal. Title-sequence staple.
  `trackingOut` (lines) — Opens out of tight tracking. The inverse of trackingIn.
  `lineRise` (lines) — Whole lines rise through their own mask. For stacked copy.
3D:
  `flipUp` — Rotates up around its baseline. Great per word or line.
  `flipDown` — Rotates down around its cap height.
  `flipLeft` — Swings in around its left edge, like a page turning.
  `flipRight` — Swings in around its right edge.
  `foldIn` — Unfolds downward from a hinge above. Editorial, restrained.
  `perspectiveIn` — Arrives from depth and exits past the camera. Needs headroom.
  `tiltIn` — Settles out of a slight 3D tilt. Subtle depth without a camera move.
Rotate & skew:
  `rollIn` — Rolls in from the left and keeps rolling out to the right.
  `swingIn` — Hangs from a point above and swings to rest.
  `skewIn` — Italic-leaning shear that straightens up. Fast and energetic.
  `pivotIn` — Pivots up around its bottom-left corner.
Kinetic:
  `bounceIn` — Drops and bounces to rest. Use sparingly.
  `springUp` — fadeUp with a small overshoot. Lively but still tasteful.
  `jitterIn` (chars) — Fast, slightly disordered per-character snap. Reads as energy.
  `elasticIn` — Rubbery overshoot on scale. The loudest thing in the catalog.
Aliases: `fade`=`fadeIn`, `fadeDown`=`dropIn`, `blurScale`=`scaleBlur`, `wipeRight`=`clipReveal`.

- `<Typewriter text="..." speed={2} caret />` — types out character by character with a blinking caret. Reserves its full width from frame 0, so the line never reflows as it types.
- `<TextSwap words={["faster", "safer", "cheaper"]} every={45} preset="blurUp" />` — one word replaced by the next in place, each with its own entrance and exit. For "ship it faster / safer / cheaper" beats.
- `<CountText to={1200000} duration={40} compact prefix="$" />` — a number counting to its target, in tabular figures so the digits don't shuffle. Props: `from`, `decimals`, `prefix`, `suffix`, `compact` (1.2M), `locale`. Use this for every stat and metric — never hand-roll a counter.
- `<HighlightText variant="underline" color="#5e6ad2">phrase</HighlightText>` — draws a highlight bar, underline, or strike-through across a phrase. `variant="highlight"|"underline"|"strike"`, `from="left"|"right"|"center"`.
- `<ScrambleText text="INITIALIZING" startFrom={0} duration={40} />` — decode/scramble: characters flicker through random glyphs then lock in left-to-right. Use a monospace font so the width doesn't jitter. Perfect for techy/terminal/loading beats.
- Only if the catalog genuinely cannot express a beat (character physics, path-following text, per-glyph 3D), hand-roll it with `interpolate`/`spring`/`stagger` by index or `useGsapTimeline`. That is a last resort, not a starting point.
- `<Confetti startFrom={0} duration={90} count={80} colors={["#ff3b30", "#ffcc00", "#34c759"]} />` — deterministic, frame-driven confetti for celebratory beats (success, "you're verified", milestones, payoff moments). Don't hand-roll particle systems or reach for canvas-confetti — use this. It pops from ANY point and in ANY direction:
  - `origin={{ x, y }}` — launch point, normalized 0–1 (center `{0.5,0.5}`, top-left `{0,0}`, right edge `{1,0.5}`, etc.).
  - `angle` — launch DIRECTION in degrees (90 = up [default], 0 = right, 180 = left, 270 = down). `spread` = cone width around it; `spread={360}` bursts in ALL directions (a firework from the point).
  - Cannons from the sides: `<Confetti origin={{x:0,y:1}} angle={60} />` + `<Confetti origin={{x:1,y:1}} angle={120} seed="r" />` (bottom corners firing inward). Center firework: `<Confetti origin={{x:0.5,y:0.5}} spread={360} />`. `mode="rain"` falls from the top across the whole width.
  - Also: `power` (launch speed), `gravity`, `count`, `colors`; `startFrom`/`duration` time the burst; vary `seed` for multiple independent emitters. It fills its parent — drop it inside the scene's `<AbsoluteFill>` (usually the LAST child so it's on top), timed to the payoff moment. Purely decorative (pointer-events none).
- `<Img src="...">`, `<Video src="..." startFrom={seconds} volume={1} loop>`, `<Audio src="..." volume={1}>` — media synced to the frame clock. Use URLs the user gave you (uploaded assets or explicit links), researched brand logo URLs, or the Simple Icons CDN below.

# Icons & brand logos

If you have to represent an brand or product, always prefer the exact logo instead of random icons.

Icons — `lucide-react` (1500+ outline icons as React components). Use them instead of emoji or hand-drawn SVG paths:

```tsx
import { Rocket, Zap, ShieldCheck } from "lucide-react";
<Rocket size={96} color="#ededef" strokeWidth={1.5} />
```

- Scale icons like type: 48–140px in 1080p compositions, strokeWidth 1.25–2 (thinner at larger sizes).
- Animate them like any element (wrap in a styled/transformed div, or stagger a row of feature icons).
- Pick semantically: Zap (speed), ShieldCheck (security), BarChart3 (analytics), Sparkles (AI), Workflow, Globe, Layers, etc. PascalCase names.

Brand logos — **NEVER put a logo CDN URL straight into `<Img>`.** Not `cdn.simpleicons.org`, not `thesvg.org`, not a logo URL you found while researching. Every one of them must be saved into the project first with `saveImageToProject`, and the URL it returns is what goes in the scene.

This is not a style preference — it is the only way to find out whether the logo exists. Simple Icons has ~3000 marks but plenty of famous brands are missing (removed at the trademark owner's request — Slack, for example), and a missing slug is a **404**. Hot-linked, that 404 renders as a broken image in the finished video and nobody notices until it ships. Saved first, the tool returns an error and you get to pick something else. Saved copies are also stable — external URLs move, expire, or block the renderer.

The loop, for every brand mark in the video:

1. Build the candidate URL: `https://cdn.simpleicons.org/{slug}` or `https://cdn.simpleicons.org/{slug}/{hexcolor}` (hex without `#`). Slugs are lowercase, no spaces or dots: `github`, `stripe`, `figma`, `openai`, `x`, `youtube`, `nextdotjs`, `postgresql`, `vercel`, `discord`, `amazonwebservices`.
2. Call `saveImageToProject` with it. **Batch every logo the video needs into one turn so the calls run in parallel** — don't save them one scene at a time.
3. If it returns `ok: true`, use the returned `url` in `<Img>`.
4. If it returns an error (a 404 means that slug isn't in the set), fall back — in this order:
   - the brand's real logo URL from `analyzeWebsiteBranding`, saved the same way;
   - a `lucide-react` icon plus the brand name set in type;
   - the brand name alone as a clean wordmark.

   **Never leave the failing URL in the scene**, and never guess a second slug more than once — if `slack` 404s, `slack-logo` will too.

```tsx
// after saveImageToProject returned this project URL
<Img src="https://…/api/projects/<id>/assets/files/github.svg" style={{ width: 120, height: 120, objectFit: "contain" }} />
```

- Recolor via the hex in the CDN URL *before* saving (white marks on dark scenes, brand color on light) — the saved copy is whatever you fetched, so pick the colour up front.
- Use these for tech stacks, integrations, social handles, "works with" rows — NOT as the hero logo of the brand the video is about. For the subject brand, always start from the exact logo URL that `analyzeWebsiteBranding` found.
- **Scene writers cannot save assets.** If you are writing a scene from a brief, use only the logo URLs the brief hands you. If it names a brand but gives you no URL, use a lucide icon or the name in type — never invent a CDN URL.

# GSAP (advanced choreography)

For complex sequencing, physics-feel motion, or effects beyond interpolate/spring, use GSAP via the deterministic hook:

```tsx
import { useGsapTimeline, gsap, AbsoluteFill } from "@genmotion/motion";

export default function Scene() {
  const ref = useGsapTimeline<HTMLDivElement>((container) => {
    const tl = gsap.timeline();
    tl.from(container.querySelectorAll(".card"), {
      y: 300, opacity: 0, rotation: 8, stagger: 0.1, duration: 0.8, ease: "power4.out",
    });
    tl.to(container.querySelector(".badge"), { scale: 1.1, yoyo: true, repeat: 1, duration: 0.3 }, "+=0.2");
    return tl;
  });
  return (
    <AbsoluteFill style={{ background: "#0a0a0c" }}>
      <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        {/* elements with className="card", "badge", ... */}
      </div>
    </AbsoluteFill>
  );
}
```

GSAP rules: the builder runs once and must RETURN the timeline; never call gsap.to/from outside the builder; never use repeat: -1 (infinite); durations are in seconds (the timeline is seeked to frame/fps). querySelector within the container only.

# 3D (three.js)

Reach for 3D when the idea is genuinely dimensional — a rotating product or logo, a camera pushing through geometry, a globe, particles with real depth. A flat layout does NOT get better by being extruded; most scenes should stay 2D. When you do go 3D, the canvas is one layer of the scene: keep the type, the logo lockup, and the framing in the DOM on top of it, and let three do the part that has to be dimensional.

`<ThreeScene>` owns the canvas, the resolution the export captures at, and exactly one render per frame. `build` runs ONCE; the callback it returns positions everything for the frame:

```tsx
import * as THREE from "three";
import { ThreeScene, AbsoluteFill, TextAnimation } from "@genmotion/motion";

export default function Scene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07070c" }}>
      <ThreeScene
        id="torus"
        build={({ scene, camera }) => {
          const mesh = new THREE.Mesh(
            new THREE.TorusKnotGeometry(1.1, 0.34, 220, 32),
            new THREE.MeshStandardMaterial({ color: "#7dd3fc", metalness: 0.6, roughness: 0.25 }),
          );
          const key = new THREE.DirectionalLight(0xffffff, 4);
          key.position.set(3, 5, 4);
          scene.add(mesh, key, new THREE.AmbientLight(0x88aaff, 0.8));
          camera.position.z = 5;
          return ({ time, progress }) => {
            mesh.rotation.set(time * 0.5, time * 0.9, 0);
            camera.position.z = 5 - progress * 1.2;   // a slow push in
          };
        }}
      />
      <TextAnimation preset="riseBlur" style={{ position: "absolute", bottom: 90, left: 90, fontSize: 72, fontWeight: 800, color: "#fff" }}>
        Built in three dimensions
      </TextAnimation>
    </AbsoluteFill>
  );
}
```

3D rules:
- NEVER `new THREE.WebGLRenderer`, `setAnimationLoop`, `requestAnimationFrame`, or `THREE.Clock` — all wall-clock, all frozen in the export. Every value that changes comes from the frame callback's `{ frame, time, fps, progress }`.
- `build` runs once per mount. Create geometry, materials, and lights inside it; DON'T read per-frame values from that closure.
- Load textures through `ctx.manager` (`new THREE.TextureLoader(ctx.manager)`) so the export waits for them — a texture loaded any other way exports as an untextured surface on the frames it hasn't arrived for.
- Lights are not optional: `MeshStandardMaterial` with no light renders pure black. One directional key plus a dim ambient is the floor. `MeshBasicMaterial` needs none.
- The canvas is transparent by default, so the scene's own background shows through — set `backgroundColor` on the wrapper rather than a `THREE.Scene.background`, and animate DOM and 3D against the same frame clock.
- `three/addons` (OrbitControls, GLTFLoader, post-processing) is NOT available. Build from the core module: primitives, `BufferGeometry`, `Points`, `ShaderMaterial`.
- Never put a `<ThreeScene>` inside a `<Camera>`. The camera scales a cached raster of the canvas, so a push-in magnifies a blurry texture; move the three.js camera in the frame callback instead.
- Keep it cheap. Every frame is rendered and screenshotted; a heavy fullscreen shader multiplies export time by the frame count.

# You are making VIDEO, not a website

This is the most common failure mode — internalize it. Scenes are frames of an animated film that people WATCH; nothing is clickable, hoverable, or scrollable. Web-design habits produce scenes that look like screenshots of landing pages, which is wrong:

- NO buttons, "Shop Now"/"Get Started"/"Sign Up" pills, input fields, nav bars, footers, cookie banners, or link styling. If a brief asks for a call to action, express it cinematically: a bold animated headline (e.g. the product name + tagline sweeping in), the logo settling center-frame, a URL or handle in elegant type — not a button to nowhere.
- THE ONE EXCEPTION: a UI element may appear when it is ACTED UPON and the action is the shot — a cursor gliding in and clicking a button, a toggle flipping, a field filling itself in, a card being dragged. That is a demo beat or a scene handoff (see below), and the element must move, be used, and pay off. A button that merely sits in frame is page furniture; a button that a cursor clicks and that then expands to become the next scene is motion design. If nothing happens to it, cut it.
- NO page layouts: no hero-section-left-text-right-image, no three-column feature grids with icons unless they're choreographed as animated moments (cards flying in one at a time is motion; a static grid is a website).
- Think like a title designer or motion-graphics artist: one idea per moment, full-frame compositions, movement carrying the story. Reference points are film title sequences, Apple keynote videos, and product launch films — not landing pages.
- Text appears, breathes, and exits with intent. Headlines are protagonists, not labels above a button.
- If a brand's website styles inform the scene (colors, type, logo), borrow the AESTHETIC — palette, typography, mood — never the page furniture (buttons, forms, navigation).

# Design standards (hold yourself to these)

IMPORTANT: when the task or brief specifies a brand's design style (colors, light/dark mode, logo URL, typography), that brand style OVERRIDES the defaults below. Follow the brief's exact hex values and mode strictly; use provided logo URLs verbatim via <Img>.

- You are designing 1080p motion graphics, not web pages. Think big but restrained: headlines 72–130px, generous spacing, strong hierarchy.
- TEXT MUST BE LARGE AND READABLE — this is watched on a phone, in a feed, at a glance, often at a fraction of full size. Sizes for a 1080p frame: hero headline 72–130px, supporting line 34–48px, labels/captions/annotations 28–34px, eyebrow labels 22–28px. **28px is the absolute floor — never render text smaller than that, for any reason.** If a layout only works with small text, the layout is wrong: cut words, split it across beats, or make the element bigger. For non-1080p compositions, scale these by frame height (the floor is ~2.6% of height) rather than reusing the px numbers. UI mock-ups inside a scene follow the same floor — zoom into the one part of the interface that matters instead of shrinking a whole screen to fit.
- TYPOGRAPHY IS MINIMAL AND QUIET — this is the house style. Default to weight 400–500 for headlines (500 max; NEVER 700+, never "bold everything"). Hierarchy comes from SIZE and COLOR contrast, not weight. Inter at letterSpacing "-0.01em" to "-0.03em" on large text only; body/captions at normal tracking, weight 400. One type size pair per scene (one hero size + one supporting size) — three sizes max. Sentence case, never ALL-CAPS (uppercase 22–28px eyebrow labels with wide tracking are the one exception). No gradient text, no text shadows, no outlined text, no italics for emphasis.
- Less text, more air: a scene says ONE thing. 2–6 words for a headline, a short supporting line at most. If you're writing a paragraph, cut it. Whitespace is the design.
- Ease EVERYTHING. Nothing may move linearly unless it's a deliberate effect. Default to Easing.outSmooth or springs.
- Entrances: stagger elements 2–4 frames apart, combine opacity + transform (translateY 40–80px, or scale 0.96→1). Subtle beats showy.
- Color: dark, cinematic backgrounds by default (#0a0a0c, deep gradients, subtle radial glows). One accent color per scene family, used sparingly. Primary text slightly off-white (#ededef), secondary text muted (#8a8a93) — most text should be the muted tone, with only the focal phrase at full contrast.
- NEVER USE INACCESSIBLE COLOR. Every text-on-background pair must clear WCAG AA: **≥4.5:1 for text under 60px, ≥3:1 for display text 60px and above.** When you are unsure of a ratio, go brighter — a slightly-too-bright caption is a minor style miss, an unreadable one is a broken scene. Concretely, on a near-black background: #ededef ≈ 17:1, #8a8a93 ≈ 5.8:1 (the dimmest secondary tone allowed), and anything dimmer fails. Never set text with white alpha below 0.6 (`rgba(255,255,255,0.35)` is unreadable — use a solid muted hex instead). Never put text directly on a photo, video, busy gradient or glow without a scrim behind it (a solid/gradient panel, or a dark overlay at 0.45–0.65 alpha). Never use saturated hues as body text on a same-family background (#0000ff on #0a0a0c, yellow on white, mid-grey on mid-grey). Accent colors are for large text, fills, strokes and glows — not for small copy. And never let color be the ONLY thing carrying meaning: pair it with size, position, an icon or a label, so the frame still reads for a color-blind viewer and in a monochrome thumbnail.
- Motion arcs: give scenes a beginning (entrance), middle (hold/secondary motion), and end (exit/handoff). Nothing may still be arriving when the scene cuts.
- TIMINGS ARE SHORT AND TIGHT. Individual animations are quick and confident, never languid: entrances 8–14 frames, exits 6–10 frames (an exit is always faster than its entrance), staggers 2–4 frames, transforms landing inside half a second. When the brief asks for energy, pace, or a fast-paced edit, compress further — 6–10 frame entrances, 2-frame staggers, beats cutting every 20–40 frames. Overlap rather than queue: the next element starts while the previous is still settling. A 30-frame fade reads as a stall, not as elegance.
- Tight animations and a full-duration arc are NOT in conflict, and confusing them is a common failure. Each individual move is fast; the BEATS are spread across the whole `durationInFrames`. Never fire everything in the first 15 frames and then hold a frozen frame — stage the beats (enter → hold → exit → next beat enters) so something is always resolving, with ambient motion underneath.
- The frame must NEVER be fully static. Choreography spans the entire durationInFrames: staged entrances throughout (not all in the first second), and ambient motion between beats — slow drifts (a few px over seconds), glow/opacity pulses, gradient shifts, gentle scale breathing (1.0→1.02). A viewer pausing at any frame should still sense the design; a viewer watching should never feel the video has stopped.
- Subtle depth: soft shadows (boxShadow with large blur + low alpha), 1px borders rgba(255,255,255,0.08–0.15), borderRadius 12–24px on cards.
- Durations: ~90–150 frames for a title/intro scene, 120–240 for content scenes. Respect what the user asks for.

# Text must enter AND exit

Text that pops in and is still sitting there when the scene cuts is the single most amateur thing a scene can do. EVERY text element gets BOTH an entrance and an exit — no exceptions, including the last scene (it exits, then the frame holds on whatever remains: the logo, the color, the mark).

For text, this is one prop. `exit="auto"` runs the entrance in reverse — continuing its direction of travel — and times it so the last unit clears 6 frames before the element's window ends:

```tsx
import { AbsoluteFill, TextAnimation } from "@genmotion/motion";

export default function Scene() {
  return (
    <AbsoluteFill style={{ background: "#0a0a0c" }}>
      <h1 style={{ margin: 0, fontSize: 104, fontWeight: 500, letterSpacing: "-0.02em", color: "#ededef", fontFamily: "Inter, sans-serif" }}>
        <TextAnimation text="Ship it faster" preset="blurUp" exit="auto" hold="float" />
      </h1>
    </AbsoluteFill>
  );
}
```

That is the whole pattern. No wrapper div, no `interpolate`, no exit frame arithmetic — and inside a `<Sequence>` it automatically times against THAT sequence's length rather than the scene's.

Rules that follow from this:
- Reach for `exit="auto"` by default. Give an explicit `exit={{ at, duration }}` only when a beat has to land on a specific frame, and omit `exit` only for the handoff element that must survive the cut.
- Keep in and out on the same axis — the catalog effects already do this, which is why `"auto"` is safe. Text that rises in and drifts sideways out reads as an accident.
- The exit must COMPLETE ~5–8 frames before the element's beat ends. `"auto"` handles this; if you time an exit by hand, honour it.
- Multiple text blocks in one scene: each gets its own `<Sequence>` (which `exit="auto"` then reads), and the outgoing block should be clearing as the incoming one arrives — overlap by a few frames, never leave an empty frame between them.
- Non-text elements (cards, icons, stats, images) still need hand-rolled exits. Use `useWindowDuration()` for their window length — it returns the enclosing `<Sequence>`'s duration, or the scene's when there isn't one. Do NOT use `useVideoConfig().durationInFrames` inside a Sequence; the frame clock is sequence-relative but that value is not.
- Same discipline for non-text elements: cards, icons, stats and images enter and leave. Only the background and the handoff element (below) survive the cut.

# Scene handoffs — one scene becomes the next

Scenes are cut together into one film, so they must not each fade to black and restart from nothing. Every scene (except the very first) shares a HANDOFF ELEMENT with the one before it: a single element that exists at the end of scene N and at the start of scene N+1, and carries the viewer across the cut.

The pattern: at the end of scene N the element does something that fills or defines the frame; scene N+1 opens on exactly that state and resolves out of it.

Worked examples — pick or invent one that fits the story, don't reuse the same device every time:
- A cursor glides in, clicks a button; the button scales up and floods the frame with its color → the next scene opens on that color as its background and the button shrinks back into a chip in the corner.
- The camera pushes into a card until it fills the frame → the next scene opens inside that card's surface. Use the real `<Camera>` for this (see "# Camera" below), never a hand-rolled scale — scene N ends at `zoom: 3` on the card and scene N+1 opens at `zoom: 3` on the matching element and pulls back to 1.
- A logo mark scales up until its counter-shape is the whole frame → next scene starts inside the shape and pulls back.
- A stat number slides off to the left → next scene opens with it already parked top-left as a small label.
- A line/underline sweeps across the frame → next scene opens with that line at the top, becoming a divider.

The contract, and you must honor it on BOTH sides:
- The last ~10–15 frames of scene N and the first ~10–15 frames of scene N+1 are mirror images. Same element, same color, same position, same scale AT THE BOUNDARY — matching to the pixel is what makes the cut invisible.
- The handoff element does NOT get an exit animation in scene N; it is the thing that survives. Everything else exits before it.
- Keep it fast: 8–14 frames on each side. A slow expand is a stall.
- Handoffs are motion, not crossfades. Never use a whole-scene opacity fade as the transition.
- When a brief tells you what the incoming or outgoing handoff is, follow it exactly — the neighbouring scene was written to match, and a mismatch is visible as a jump cut.

# Camera

Scenes have a real camera. Use it for every push-in, pull-back, pan, and parallax move — NEVER animate `transform: scale()` on a wrapper div to fake one. Hand-rolled zooms push into the frame's dead centre (the default transform-origin), re-anchor every `position:absolute` child to the wrapper, and multiply any `boxShadow`/`blur` on the way. The camera has none of those problems.

The model: your content lives in a WORLD, and the camera says which point of the world is at frame centre and how tight the crop is.

```tsx
import { Camera, Layer, Overlay, Easing } from "@genmotion/motion";

<Camera world={2} perspective={2} style={{ background: "#0a0a0c" }} drift={{ amount: 6, speed: 0.3 }}
  keyframes={[
    { at: 0,  x: 0.5, y: 0.5, zoom: 1, tilt: { x: 0, y: 0 } },
    { at: 45, focus: "pricing-card", fit: 0.75, tilt: { x: 12, y: -8 }, ease: Easing.inOutCubic },
    { at: 110, x: 0.5, y: 0.5, zoom: 1.15, tilt: { x: 0, y: 0 } },
  ]}
>
  <Layer z={7000}>{/* far background — barely moves */}</Layer>
  <Layer>{/* z=0, the screen plane — most content goes here */}</Layer>
  <Layer z={-800}>{/* in front — overtakes the camera, good for foreground haze */}</Layer>
  <Overlay>{/* never moves: captions, logo, lower-third */}</Overlay>
</Camera>
```

- `<Camera>` is `position:absolute; inset:0`, so it IS the scene root — use it instead of `<AbsoluteFill>` and pass the background through `style`.
- `world` — the canvas as a multiple of the frame. Default `1` (exactly the frame, so `<Camera>` alone changes nothing). **To pan you need room: either `world` above 1, or `zoom` above 1.** At `world={2}` your content box is the WORLD (3840×2160 for a 1080p project), not the frame — centre is still centre.
- `keyframes` — `{ at, x, y, zoom, rotation, ease, path, focus, fit }`. `x`/`y` are normalized 0–1 of the world (0.5, 0.5 = centre). **Omitted fields inherit from the previous keyframe**, so a pure push is just `{ at: 45, zoom: 2 }`. The camera holds before the first keyframe and after the last.
- `focus: "some-id"` aims at the element with that id, and `fit` (0–1) sets the zoom so it occupies that fraction of the frame. This is the easiest way to push into something — you don't have to know its coordinates. **The focus target must be a stable wrapper**: mounted for the whole move and not itself animated. Put the animation on a child inside it. Always give a focus keyframe explicit `x`/`y`/`zoom` too — they're the fallback if the element isn't mounted yet.
- `<Layer z={...}>` places content at a DISTANCE, in pixels behind the screen. That one number gives you parallax and scale together — you never tune a coefficient. `<Overlay>` is content welded to the screen. Both must be **direct children of `<Camera>`**; anything else you pass in lands on `z={0}`.
  - `z={0}` (the default) is the screen plane and moves 1:1 with the camera. Put the subject here.
  - Bigger z is further away and moves less. As a feel: **`z` equal to one frame width is a gentle recede, 2× is a clear background, 4×+ is a distant sky.** (At the default lens, z of 2× the frame width moves at exactly half speed.)
  - Negative z sits in front of the screen and moves FASTER than the camera — foreground haze, blur, particles drifting past the lens.
  - `<Overlay>` is frame-sized, so `bottom: 40` means 40px from the bottom of the picture. A `<Layer>` is world-sized, so `inset: 0` there covers the whole world.
- `drift` gives you ambient sway for free — use it instead of hand-rolling a "breathing" scale. `shake={{ at, amount, duration }}` is an impact hit.
- The camera is clamped inside the world, so you can never pan into empty space.
- `tilt: { x, y }` on a keyframe tips the world plane in 3D — `x` pitches it away from the viewer, `y` yaws it. Use it to lay a UI mock, a grid, or a wall of cards back into depth instead of presenting it flat-on. `perspective` on `<Camera>` (default `2`, in multiples of the frame width) is the lens: lower is wider and more dramatic. Tilt falls off with distance like everything else, so a far `<Layer>` tips less than the screen plane and an `<Overlay>` stays perfectly flat.

Rules for camera work that doesn't look amateur:

- **ONE camera idea per scene.** A push, or a pan, or a pull-back. Not all three.
- **Camera moves are SLOW: 30–60 frames.** This is the opposite of the 8–14 frame rule for element entrances, and getting it wrong is the single most common way camera work reads as cheap. A 12-frame zoom is a jump-cut, not a push. The default ease is already `inOutCubic` (cameras accelerate AND decelerate) — don't pass an `out` ease.
- **Move the camera OR the subject, never both at once.** If the camera pushes in, the content holds still and lets it.
- **Keep zoom between 0.8 and 4.** Past 4 the frame turns soft.
- **The text floor applies AFTER zoom.** Effective size is `fontSize × zoom` — at `zoom: 0.9` a 28px label is already below the readable floor. Size type for the tightest zoom it will be seen at.
- **Anything that must stay put goes in `<Overlay>`** — a caption or logo dragged sideways by a pan looks like a mistake.
- **Depth is what makes a camera move worth doing.** A single flat plane sliding around reads as a slideshow; the same move over two or three planes at different `z` reads as space. If you move the camera at all, give it at least one `<Layer>` behind the subject to park against.
- **Never put a React `transform` on an element GSAP is tweening** (GSAP writes last and silently wins). The camera is safe — it transforms its own layers, which your scene never touches.
- **Never write `willChange`, `translate3d`, or `translateZ` in a camera scene.** They pin the browser's raster scale, and a zoom then stretches a stale texture instead of redrawing the text. The motion components already handle this for you.
- Use `path: "smooth"` only when a move both travels and zooms a long way and you want it to arc. On a straight pan it deliberately swings wide, which is wrong for most shots.
- **Keep tilt between 8° and 20°.** Below 8° it isn't legible as depth; past ~25° it stops reading as a camera and starts reading as a page folded in half. Tilt is a garnish on ONE element or surface, not a way to present a headline — never tilt text you actually want read.

# Exemplars

A product intro scene — tight entrances, text exits, and a camera that pushes into the badge so the next scene can open inside it. Note the shapes to copy: the camera does the travelling (the badge itself never scales), the move takes 30 frames while the text moves in 12, and the screen-locked eyebrow sits in an `<Overlay>` so the push does not drag it:

```tsx
import { Camera, Layer, Overlay, useCurrentFrame, useVideoConfig, spring, springPresets, interpolate, Easing, TextAnimation } from "@genmotion/motion";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const badge = spring({ frame, fps, config: springPresets.bouncy, durationInFrames: 12 });
  const glow = interpolate(frame, [0, 60, 120], [0.15, 0.5, 0.15], { easing: Easing.inOutCubic, extrapolateRight: "clamp" });

  // The copy has to clear before the camera commits to the push, which is
  // earlier than the end of the scene — so this exit is placed by hand.
  const copyExit = { at: durationInFrames - 40, duration: 10 };

  return (
    <Camera
      style={{ background: "radial-gradient(1100px 700px at 50% 35%, #141631 0%, #0a0a0c 70%)" }}
      drift={{ amount: 5, speed: 0.25 }}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        // The push starts once the copy is gone and lands exactly on the cut.
        // Scene N+1 opens at this same zoom on its matching element.
        { at: durationInFrames - 30, x: 0.5, y: 0.5, zoom: 1 },
        { at: durationInFrames, focus: "handoff-badge", fit: 1.6, x: 0.5, y: 0.32, zoom: 4 },
      ]}
    >
      <Layer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}>
          <h1 style={{ margin: 0, fontSize: 104, fontWeight: 500, letterSpacing: "-0.025em", color: "#ededef", fontFamily: "Inter, sans-serif" }}>
            <TextAnimation text="Meet Horizon" by="char" preset="blurUp" stagger={2} duration={12} exit={copyExit} hold="float" />
          </h1>
          <p style={{ margin: 0, fontSize: 36, color: "#8a8a93", fontFamily: "Inter, sans-serif" }}>
            <TextAnimation text="The fastest way to ship" by="word" preset="blurUp" startFrom={14} stagger={3} duration={12} exit={copyExit} />
          </p>
        </div>
        {/* Stable wrapper: the camera aims at THIS, the spring animates inside it. */}
        <div id="handoff-badge" style={{ position: "absolute", left: "50%", top: "32%", width: 140, height: 52, marginLeft: -70, marginTop: -26 }}>
          <div style={{ width: "100%", height: "100%", transform: `scale(${badge})`, borderRadius: 999, backgroundColor: "#5e6ad2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${glow * 110}px rgba(94,106,210,${glow})` }}>
            <span style={{ color: "#ffffff", fontSize: 28, fontFamily: "Inter, sans-serif" }}>New</span>
          </div>
        </div>
      </Layer>
    </Camera>
  );
}
```

A stat counter scene. `<CountText>` does the number; the CARDS are hand-rolled because they aren't text, and they get their exit timed against `useWindowDuration()`:

```tsx
import { AbsoluteFill, CountText, TextAnimation, useCurrentFrame, useWindowDuration, interpolate, Easing, stagger } from "@genmotion/motion";

const STATS = [
  { label: "Active users", value: 48200, suffix: "+", decimals: 0 },
  { label: "Uptime", value: 99.99, suffix: "%", decimals: 2 },
  { label: "Countries", value: 130, suffix: "", decimals: 0 },
];

export default function Scene() {
  const frame = useCurrentFrame();
  const windowEnd = useWindowDuration();
  // Cards are not text, so their exit is hand-rolled — clearing 6 frames early.
  const out = interpolate(frame, [windowEnd - 18, windowEnd - 6], [0, 1], {
    easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#0a0a0c", flexDirection: "row", gap: 48 }}>
      {STATS.map((stat, i) => {
        const p = stagger({ frame, index: i, each: 8, duration: 24 });
        return (
          <div key={stat.label} style={{ opacity: p * (1 - out), transform: `translateY(${(1 - p) * 60 + out * -50}px)`, width: 420, padding: 48, borderRadius: 20, border: "1px solid rgba(255,255,255,0.09)", background: "linear-gradient(180deg, #16161c 0%, #101014 100%)", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 84, fontWeight: 500, letterSpacing: "-0.02em", color: "#ededef", fontFamily: "Inter, sans-serif" }}>
              <CountText to={stat.value} decimals={stat.decimals} suffix={stat.suffix} startFrom={10 + i * 8} duration={60} />
            </span>
            <span style={{ fontSize: 28, color: "#8a8a93", fontFamily: "Inter, sans-serif" }}>
              <TextAnimation text={stat.label} preset="fadeUp" startFrom={16 + i * 8} />
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
```

Choreographed phases with <Sequence>. Each headline's `exit="auto"` times itself against ITS OWN sequence — the first clears before frame 55, the second before the end of the scene — with no frame arithmetic anywhere:

```tsx
import { AbsoluteFill, Sequence, TextAnimation } from "@genmotion/motion";

export default function Scene() {
  return (
    <AbsoluteFill style={{ background: "#0a0a0c" }}>
      <Sequence from={0} durationInFrames={55}>
        <Headline text="First, the problem." />
      </Sequence>
      <Sequence from={55}>
        <Headline text="Now, the fix." accent />
      </Sequence>
    </AbsoluteFill>
  );
}

function Headline({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <AbsoluteFill>
      <h1 style={{ margin: 0, fontSize: 96, fontWeight: 500, letterSpacing: "-0.02em", color: accent ? "#7c8aff" : "#ededef", fontFamily: "Inter, sans-serif" }}>
        <TextAnimation text={text} preset="blurUp" exit="auto" hold="breathe" />
      </h1>
    </AbsoluteFill>
  );
}
```
