# Video tool templates

A template renders one frame of a free-tool video as a pure function of the current
frame. It is a normal React component using `@genmotion/motion`, previewed with
`@genmotion/player`'s `<Player>` and exported by rasterizing the DOM frame by frame
(`../render/export-video.ts`).

## Authoring rules

These exist because the export path serializes the live DOM into an SVG
`<foreignObject>` and rasterizes it. Anything the serializer can't see, or that
browsers rasterize inconsistently, will silently differ between the preview and
the downloaded file.

1. **Inline styles only.** No Tailwind classes, no external stylesheet, no
   `<style>` tags. Computed styles are copied per element; class-based rules that
   resolve through a stylesheet the clone doesn't carry will be dropped.
2. **Pure function of the frame.** No `Math.random`, `Date.now`, `setTimeout`, or
   CSS transitions/animations. Frame N must look identical every time it is
   rendered — the exporter renders each frame once, out of real time.

   **Animate with GSAP, via `useGsapTimeline`.** It builds the timeline once,
   pauses it, and seeks it to `frame / fps` — so a real easing curve survives
   cold frame-stepping. Prefer one timeline per scene with beats placed relative
   to each other (`"-=0.4"`) over a pile of independent `interpolate` calls.
   Off-the-shelf animation libraries almost all fail here: `countup.js` is
   `requestAnimationFrame`-driven, `@number-flow/react` fires Web Animations on
   value change, and `odometer` uses CSS transitions. None expose a seek, so
   each export frame would capture the animation's first moment. GSAP is the
   exception because its timelines are seekable.

   Geometry GSAP can't tween — an SVG path's `d`, say — stays computed from
   `useCurrentFrame()`. `chart-rise` does both: the curve is per-frame, the
   fades ride the timeline.
3. **Images must be `data:` URIs.** A cross-origin image cannot be drawn to the
   export canvas; it taints or fails outright. Every remote image goes through
   `/api/tools/image`, which inlines it. `data.avatar` is already a data URI.
4. **Fonts must be the app's own self-hosted faces** (`--font-sans`,
   `--font-mono`, `--font-display`). They are same-origin `next/font` files, so
   the rasterizer can inline them. A remote font silently falls back.
5. **No `backdrop-filter` or `mix-blend-mode`.** These rasterize inconsistently
   through `foreignObject`. Solid fills, gradients, `opacity`, `transform`,
   `border-radius`, `box-shadow`, and inline SVG are all safe. A
   `linear-gradient` `mask-image` is also verified to rasterize — the rolling
   number uses one to fade each digit slot's edges.

   `filter: blur()` is a special case: it *does* rasterize correctly (verified),
   but it is isotropic, so inside any `overflow: hidden` box its halo is sliced
   off at the edges and leaves a hard rectangle. `RollingNumber` needed motion
   blur inside a clipped slot and uses stacked offset copies instead — see
   `rolling-number.tsx`. If you reach for `filter`, add it to
   `STYLE_PROPERTIES` in `../render/rasterize.ts` first, or it will be dropped
   from the export while still showing in the preview.
6. **Size everything relative to `useVideoConfig()`**, not fixed pixels, so the
   same template works at 1920×1080, 1080×1080, and 1080×1920.
7. **Give every run of text a width budget.** Templates scale type off the
   SHORT edge so the design holds across aspects, but what text has to fit is
   the LONG edge minus padding — and at 1:1 and 9:16 those are the same 1080px.
   A headline that is comfortable at 1920×1080 will run off both margins at
   9:16 and be clipped by the frame. Pass the available width through
   `fitSize()` (in `shared.ts`) so the size drops until it fits:

   ```tsx
   const content = width - unit * 16;               // the padding this scene uses
   <span style={{ fontSize: fitSize(unit * 4.4, content, textEm(data.title)) }}>
   <RollingNumber value={data.value} size={unit * 24} maxWidth={content} />
   ```

   `textEm()` estimates from character count with a deliberately generous
   per-character advance. `RollingNumber` doesn't estimate — it knows its exact
   glyph composition and computes a real width, because tabular figures all
   share one advance.

## Adding a template

1. Create `<id>.tsx` exporting a `VideoTemplate`.
2. Add the id to `TEMPLATE_IDS` in `types.ts`.
3. Register it in `index.ts`.
4. List it on the generators that should offer it, in `../registry.ts`.

`supports()` is how a template opts out of data it can't render — `chart-rise`
requires `data.series`, so it disappears for sources that have no history.

## Adding a data source

No template work at all. Add a route handler under
`src/app/api/tools/<source>/`, map the upstream response to `MetricVideoData`,
then add a `GENERATORS` entry and a `TOOLS` entry. Every existing template picks
it up automatically.
