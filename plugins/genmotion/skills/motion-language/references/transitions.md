# The handoff and transition catalogue

Every way GenMotion's templates get from one beat or scene to the next, measured from their source, with duration, an engine-neutral build recipe, Three.js notes, when to use it, and the sound cue that pairs with it. Frames at 30 fps. Levels are linear gain with dB in brackets; `sound-design` owns the mix around them.

How often the house uses each kind, across 122 scene boundaries: motivated handoffs 64%, exit-then-cut 31%, hard cuts 5%. **Zero plain crossfades.** Pick one signature and one workhorse per film (`direction` Step 7); this file is the menu.

Contents: The timing contract · 1 Persisting element · 2 Flood becomes object · 3 Iris · 4 Match-push · 5 Push through the screen / pull back · 6 Flash-to-white · 7 Block wipe and pixel dissolve · 8 Colour-field push, panel wipe, sheet flood · 9 Card morph · 10 Typewriter delete and word swaps · 11 Whip and motion blur · 12 Rush into the lens · 13 Board erase · 14 Elements exit, then cut · 15 Fall into dark, fade to black · 16 Hard cut on the beat · 17 Continuous film · Rarer devices · Choosing

---

## The timing contract (every handoff)

- The last 10–15f of scene N and the first 10–15f of scene N+1 are designed as one move.
- The **carrier** (object, colour, camera framing) is pixel-identical on both sides of the cut: same position, size, colour, rotation. Put the shared numbers in one module both scenes import; never copy them.
- Everything that is not the carrier has left 4–8f before the cut.
- **Drift dies before a matched cut**: multiply ambient camera drift by `(1 − transition progress)`, because the next scene cannot match a moving target.
- A move crossing the cut either accelerates through it (ease-in, then the next scene continues at the same speed) or lands ≥10f before the cut and holds. Never decelerate into the last frame.
- Check every cut with `capture-frames` on its last and first frames, side by side.

---

## 1. Persisting element (shared element)

The single most used motivated handoff in the catalog (about 25 of them).

- **Duration**: 0f at the cut; the element then moves in its new role over 16–22f.
- **Build**: the element (the mark, a hero card, a coin, the cursor, an avatar, the last word) has **no exit** in scene N. Scene N+1 builds the same element at the identical pose at its frame 0, then moves it: shrinks and rises (20f inOutCubic), collapses into a list, swoops to centre, becomes a button. A cursor can travel to the exact position the next scene's cursor starts from.
- **Three.js**: export the pose (`HERO_POS`, `HERO_SCALE`, colour) from `components/`; both scenes build the mesh with it. If the element is text, render it from the same canvas-texture helper at the same size so the glyphs match exactly.
- **Use**: almost any pair of scenes about the same subject; product → feature; mark → end card.
- **Sound**: none at the cut (the continuity is the point), or a soft pop 0.45–0.55 (−6.9 to −5.2 dB) when it lands in its new role.
- **Goes wrong**: a 1–2 px or 2% scale mismatch reads as a jump; check the two frames overlaid.

## 2. Flood becomes object

- **Duration**: 6–13f, ease-in (inCubic or quad), then 10–13f in the next scene to contract.
- **Build**: a circle grows from a UI element (a pressed button, a send icon, the centre) until it covers the frame: radius 0 → `hypot(halfW, halfH) × 1.05` (from an off-centre origin: the distance to the farthest corner × 1.05). Scene N+1 opens fully in that colour and contracts it into an object (a pill, a button, a card), or tints out over 8f (blue full → 0.42 at the cut → 0 over 8f).
- **Three.js**: a `CircleGeometry(1, 96)` plane in front of the camera, scaled each frame; at distance `d` in front of a perspective camera the cover radius is `hypot(halfW, halfH) × 1.05` in world units at that distance. Parent it to the camera so camera moves don't uncover the edge. `userData.pickable = false`.
- **Use**: a CTA press, "send", a brand-colour beat, the move into the end card.
- **Sound**: whoosh 0.7 (−3.1 dB) starting **3f before the flood begins**; optional impact 0.75 (−2.5 dB) one frame after the cut if the next scene lands hard.
- **Goes wrong**: the flood colour is not the next scene's background colour exactly, so the cut flickers.

## 3. Iris (out from a button or logo; in to an object)

- **Duration**: 16–34f inOutCubic. A fast burst version: 11–16f.
- **Build (iris-out)**: a circle centred on the clicked control grows to `REACH = hypot(max(cx, W − cx), max(cy, H − cy))` and becomes the next frame (a solid colour, or the next scene seen through the hole). **Iris-in**: a circular mask shrinks from radius ≈1500 px to the size of an object (an orb, an avatar, a dot) over 30f; the object is the next scene's subject. Two-stage bursts open fast to ~200 px, then ease to full.
- **Three.js**: iris-out = the flood circle (§2) with the next scene's colour. Iris-in = a full-screen plane with a circular hole: a `ShaderMaterial` that discards fragments inside radius `r` (pass `r` and the centre as uniforms), or a `RingGeometry` with a huge outer radius. Dashed rings echoing the burst: `RingGeometry` segments rotated 10–20°/s.
- **Use**: the click that ends a demo; ending on a mark; a reveal from darkness.
- **Sound**: the click 0.9 (−0.9 dB) on the press frame that triggers it; a swell 0.6 (−4.4 dB, fade-in 10f, fade-out 20f) from the iris start, or a riser that lands as the iris closes on its object.

## 4. Match-push (scale-matched cut, drift stopped)

- **Duration**: push 24–48f inOutCubic (readable), or 6–10f inCubic accelerating into the cut (aggressive punch-in). Zoom 1.3–3.8×.
- **Build**: scene N's camera ends at an exact crop (x, y, zoom) on a UI element; scene N+1 is laid out at exactly that crop's scale, so frame 0 matches. Export the handoff constants (`HANDOFF_ZOOM`, `HANDOFF_CENTER`) and compute both layouts from them. Kill drift over the push: `drift × (1 − push progress)`. Interpolate zoom in log space.
- **Three.js**: dolly the camera (`position.z`) or narrow the `fov`; for a matched cut, compute scene N+1's object scale from scene N's final camera distance (`scaleNext = scaleNow × distStart / distEnd`). Never animate both fov and z in one move.
- **Use**: zooming "into" a control to reveal what it does; mic → transcript; button → result.
- **Sound**: whoosh or push 0.5–0.75 (−6 to −2.5 dB) starting 2–4f before the cut; nothing for a slow readable push under VO.
- **Goes wrong**: drift still running at the cut (the frames "almost" match), or the incoming layout guessed by eye.

## 5. Push through the screen / pull back

- **Duration**: push 45f inOutCubic; pull back 52f inOutCubic; then a creep to 1.035 over the rest of the scene.
- **Build**: the camera pushes until the phone's screen fills the frame exactly (zoom = frame width / screen width, e.g. 1080 / 780 = 1.3846, centred on the screen). Scene N+1 is the flat UI at full frame. A later scene opens on that crop and pulls back out to show the device again.
- **Three.js**: the screen is a plane with the UI drawn to a canvas texture; push the camera until the plane fills the frustum; scene N+1 renders the same UI as a full-frame plane.
- **Use**: going from "the product in the world" to "the product's UI" and back; chat and app ads.
- **Sound**: a soft whoosh 0.5 (−6 dB) under the push, or nothing when the chat's own sounds carry the scene.

## 6. Flash-to-white (and the strobe, and the impact frame)

- **Duration**: ramp 0 → 1 over the last 4–8f (0.12–0.25 s, ease-in), cut, decay 1 → 0 over 6–9f in the new scene. Full white-outs (everything but the subject leaves) take 14–16f inOutCubic.
- **Build**: a full-frame white layer above everything. **Strobe variant**: 2 frames of solid foreground colour at the start of an accent card. **Anime impact frame**: 2 frames of inverted colour on an impact.
- **Three.js**: a camera-parented white plane at `renderOrder` 950+ with `depthTest: false`, opacity driven by `kick()` or a ramp (`references/easing.md` §9). An FOV punch of −5 to −10° and a 3–6f shake can stack on the same frame.
- **Use**: music cuts, impacts, "boom" reveals; the music-video family uses it on every cut.
- **Sound**: an impact 0.7–0.85 (−3.1 to −1.4 dB) on the cut frame ±2f, or the track's own hit (move the cut to the hit, never the hit to the cut).
- **Goes wrong**: used on every cut of a non-music film (it becomes a tic), or a long white hold that reads as an error.

## 7. Block wipe and pixel dissolve

- **Duration**: block wipe 18–24f (end−18 … end−2); pixel dissolve 9–10f each way; pixel-glitch dissolve 15–21f.
- **Build (block wipe)**: a grid of 12 × 7 cells. Cell `i` turns on when `progress > sweep(i) × 0.62 + clump(i) × 0.24 + jitter(i) × 0.14`, where sweep is the cell's position along the wipe direction (0–1), clump is a seeded 3 × 3 block value and jitter a seeded per-cell value. Visible cells reveal the next scene. The surface underneath slides 48 px (outCubic) during the wipe. The incoming beat is already 12f into its own animation when the wipe starts, so it is alive as it appears. Alternate the wipe direction scene to scene.
- **Pixel dissolve**: per-cell hash threshold; cells go chunky (larger blocks) just before they drop out.
- **Three.js**: an `InstancedMesh` of cell quads in front of the camera, or a single full-screen `ShaderMaterial` that computes the cell index from UVs and discards by threshold (cheaper, one draw call). Seeded hash, never a random source.
- **Use**: textured, retro-tech and editorial films; alternating between two worlds (paper ↔ phone).
- **Sound**: a wipe sound 0.5 (−6 dB, 20f) starting on the wipe's **first** frame (18–24f before the cut), so it covers the wipe.

## 8. Colour-field push, panel wipe, sheet flood

- **Duration**: panel wipe 8f inOutCubic; sheet flood 16f outSmooth; colour-field push 23f inOutCubic.
- **Build**: a full-frame solid or gradient layer translates across (−W → 0) and owns the final frame. Scene N+1 opens on the identical field and **carries momentum**: its content starts already moving (≈46 px → 0 over 16f) in the same direction. Sheet flood: the last of a stack of sliding sheets keeps travelling until it covers the frame.
- **Three.js**: a camera-parented plane sized to cover (see `three-transitions` for the sizing code), translated on x; for a radial gradient field, a canvas texture drawn once.
- **Use**: chapter changes, palette changes, brand-guide sections.
- **Sound**: whoosh 0.5–0.7 (−6 to −3.1 dB) from the start of the push.
- **Goes wrong**: the incoming content starts at rest (the momentum carry is what makes it feel like one move).

## 9. Card morph (card → full bleed, frame → card)

- **Duration**: 18–28f inOutCubic (end−28 … end−6 is typical).
- **Build**: lerp the card's left, top, width, height and corner radius from its rest rect to an overscanned full frame (−30, −20, W + 60, H + 40); fade scrims and labels at 2.4× the rate so they are gone before the card fills. The other cards leave 16f earlier (end−46 … end−30). The reverse (an outline frame collapsing into a card, cards squashing into a gradient bar that thins to 1 px) closes chapters.
- **Three.js**: a plane with a rounded-rectangle `ShaderMaterial` (signed-distance corner radius as a uniform), or a canvas texture redrawn only at the start and end states; scale and position the plane per frame.
- **Use**: opening one example into its full scene; collapsing a scene into the next one's list item.
- **Sound**: a soft whoosh 0.5 (−6 dB) at the morph start, or none.

## 10. Typewriter delete and word swaps (text-to-text handoffs)

- **Duration**: type 2–2.4 f/char, backspace ≈2.1 f/char (or a fast 6f inOutCubic wipe-back), hold ≥18f between.
- **Build**: type a word; delete it; type the replacement in the same slot, with the caret solid while typing and blinking (8f or 16f/16f) only when idle. Reserve the full string's width invisibly so nothing reflows. Specimen variant: a colour trail 4 characters long runs from accent back to ink behind the caret. Word-slot flip and mask push-up are in `references/text-motion.md`.
- **Three.js**: one plane per character (or per word for the flip); visibility by index from `floor((frame − start) / framesPerChar)`.
- **Use**: "Introducing" → the name; swapping a noun in a sentence; brand specimens.
- **Sound**: key ticks 0.3–0.45 (−10.5 to −6.9 dB), one per character, alternating 2–3 samples; deletes quieter or silent.

## 11. Whip and motion blur

- **Duration**: 8–10f of blur around the cut (the exit 4–5f ease-in, the entry 4–5f ease-out), or a 10f blur-rush at the end of a scene.
- **Build**: exit with a large travel (x −400 px or more) and blur growing to 20–30 px on an ease-in; the next scene enters from the opposite side at the **same speed and direction**, blur resolving on an ease-out. Velocity-derived blur: blur = 0.11 × px moved per frame, capped at 26. Fast scrolls: blur = velocity × 1.6, capped at 220 px of streak.
- **Three.js**: a directional blur pass, or sub-frame sampling (render 4–10 sub-frame positions and average them) for real motion blur on fast moves; scale the sample count to the on-screen displacement (`ceil(maxDisplacement / 3px)`, up to 10).
- **Use**: high-energy montages, social cuts, jumps in place or time. Keep one direction for the whole film.
- **Sound**: whoosh 0.6–0.7 (−4.4 to −3.1 dB) whose loudest point sits on the cut (a 21f whoosh usually starts about 4f before it).
- **Goes wrong**: the two sides travel at different speeds or in different directions; it reads as two unrelated moves.

## 12. Rush into the lens (blow-up, camera slam)

- **Duration**: 10–24f ease-in; a slam 10f inCubic.
- **Build**: scale the page, badge or word exponentially (`exp(ln(N) × ease(t))` with N = 7) or move the camera to almost touch it, while the background goes white (the last 5f) or the zoom blur grows to 18. Camera slam: zoom 1 → 9 into one word over 10f with zoom blur, a 0.9 white flash on the cut decaying over 14f, and the next element popping in (scale 0.2 → 1, rotation −140° → 0).
- **Three.js**: dolly the camera to z ≈ 0.35 from the object (ease-in), or scale the object toward the camera; zoom blur as a radial blur pass, or skip it and let the white flash hide the last frames.
- **Use**: the peak of a launch; "export" or "publish" moments; the switch into the end card.
- **Sound**: a riser 0.55 (−5.2 dB) timed to end on the cut, then an impact 0.85 (−1.4 dB) on the cut frame.

## 13. Board erase

- **Duration**: 10f inOutCubic, starting 18f before the end; 8f of blank paper; cut.
- **Build**: every element reverses its own reveal (strokes un-draw along their paths, text un-writes). The camera drift is built from `sin(2πp)` so it is back at rest at both ends; the cut lands on identical blank paper.
- **Three.js**: if strokes reveal by a draw-range or a dash offset, run it backwards; text planes reverse their reveal.
- **Use**: whiteboard and diagram explainers only.
- **Sound**: none at the cut; the VO starts exactly 6f after it.

## 14. Elements exit, then cut (the workhorse)

- **Duration**: each element leaves over 6–9f (inCubic), staggered 2–3f, finishing 4–8f before the cut.
- **Build**: drift up 26 px + blur 10 + fade; or drop; or slide out along the axis it arrived on. The cut lands on an empty or near-empty frame (background only), and the next scene's first element arrives within 3–6f.
- **Three.js**: per-mesh opacity and position from the frame; nothing special.
- **Use**: the default between VO beats; any cut without a natural carrier. 31% of all house cuts.
- **Sound**: none; VO starts 3–8f after the cut.
- **Goes wrong**: elements still mid-exit on the last frame (it then reads as a hard cut on motion).

## 15. Fall into dark, fade to black

- **Duration**: a black layer rising 0 → 1 over 14–16f (inOutSine), or the group falling/scaling away over 8f ease-in; a dim with blur 12 over 16f.
- **Build**: as described; the next scene (if any) surfaces from black at its own pace.
- **Use**: chapter breaks in long pieces, the very last frame, a drop before a reveal. **Not** between ordinary scenes: mid-film, a fade to black reads as "the video ended".
- **Sound**: music fade-out 15f on a music-only ending (30–45f under VO); silence before a reveal.

## 16. Hard cut on the beat

- **Duration**: 0f.
- **Build**: content to content exactly on a beat or bar line of the track (at 30 fps and 120 BPM a beat is 15f; at 90 BPM an eighth note is 10f). Optional 2-frame strobe on accent cuts.
- **Use**: the beat-cut kinetic style (where it is the grammar), a smash cut from calm to loud, a deliberate mid-scene shift. Elsewhere, rare.
- **Sound**: the beat itself. Do not add a whoosh to a hard cut.

## 17. Continuous film (no cut)

- **Build**: scene files are windows onto one time function; the camera keys (1.5–3 s inOut moves, log-space zoom, a monotone spline through keys) and circle bursts do the work.
- **Use**: one-shot films.
- **Sound**: literal cues on events (up to one per second), or one soundtrack.

---

## Rarer devices

| Device | Duration | Build | Use |
| --- | --- | --- | --- |
| Lens warp | 11–13f each way | Pincushion distortion 0 → strong (inCubic) leaving, strong → 0 (outCubic) entering, stacked on a zoom blur | One signature tech moment |
| Spiral collapse | 11f inCubic | Cards spiral 110° inward with blur 14 into the next scene's bloom | A many-into-one moment |
| Push into a ring | 26f ease-in | Camera dollies z −7.5 into an orbiting ring of tiles | Entering an ecosystem |
| Gradient band | 22f inOutCubic | A brand band wipes across, then morphs over the next two scenes into an underline and a 6 px divider | A brand thread through a whole film |
| Held word recedes | 20f | The last word stays identical at the cut, then recedes on Z (scale 1 → 0.34, blur 0 → 9) | Specimen and typographic films |
| Capsule | 9–10f | A button detaches and shrinks into the next scene's object | Copy-link, share, send |

## Choosing

| Film | Signature | Workhorse |
| --- | --- | --- |
| Beat-cut kinetic type | Hard cut on the beat | Hard cut; fade to black between chapters |
| Soft-light SaaS | Persisting element or iris from the button | Exit-then-cut |
| 3D product hero | Flood becomes object | Persisting element |
| One-shot film | Circle burst | Continuous camera |
| Chat-UI | Push through the screen | None (one scene) |
| Whiteboard | Board erase | Board erase |
| Textured tactile | Block wipe | Exit-then-cut |
| Music video | Flash-to-white | Hard cut on the beat |
| Brand guide | Sheet flood or panel wipe | Persisting element |
| Milestone | Blur-out exit | — (one scene) |

At most two transition styles besides plain cuts in one film. The signature goes on chapter turns and the peak, not on every cut.
