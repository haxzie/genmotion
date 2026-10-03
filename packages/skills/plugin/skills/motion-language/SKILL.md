---
name: motion-language
description: "GenMotion's house motion vocabulary, measured from its own templates, for every engine: entrance and exit timings and easing, word and character staggers, blur and rise distances, overshoot and springs, holds that breathe, easing formulas, camera grammar (push, pull, punch, orbit, drift) and the handoff catalogue (persisting element, flood, iris, match-push, flash-to-white, block wipe, morph, typewriter delete, whip, exit-then-cut, hard cut) with durations, build notes and the sound cue each pairs with. Load it before animating any scene."
---

# Motion language: one physics for the whole film

The giveaway of amateur and machine-made motion is inconsistency: a different curve on every element, a different trick on every cut, bounce everywhere, nothing ever still or nothing ever alive. GenMotion's 25 templates share one small vocabulary. This skill is that vocabulary with its numbers, so every scene in a film moves by the same rules and other skills can cite them instead of inventing their own.

All numbers are frames at 30 fps (at 60 fps double them; at 24 fps multiply by 0.8). Formulas for every curve are in `references/easing.md`.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- Before animating any scene, on any engine: pick the entrance, exit, hold and handoff from here.
- When a video's motion feels cheap, bouncy, floaty, stiff or "template-y".
- When a scene must hand off to the next one, or a camera has to move.
- When `direction` asks for the Motion, Camera and Transitions lines of the Direction block.

Not for: what the film should say or look like (`direction`), levels and mixing (`sound-design`), Three.js plumbing for cameras and cover planes (`three-camera`, `three-transitions`).

## Six rules the numbers come from

1. **Enter decelerating, leave accelerating.** Entrances use outCubic or outSmooth (`cubic-bezier(0.25, 1, 0.5, 1)`, the house entrance ease); exits use inCubic. Moves within the frame use inOutCubic. Why: arrivals should land with confidence and settle; departures should get out of the way.
2. **Exits are about 0.6× the entrance**, and finish 4–8f before a cut. A 12f entrance pairs with a 7f exit.
3. **One curve per role, reused everywhere.** No more than two curves share a role in a scene. The same spring for every button; the same entrance for every headline.
4. **Something is always alive, but only one thing.** A held frame breathes, floats or drifts; never several behaviours at once, never dead still (except the beat-cut style, where stillness is the point).
5. **Never stop at an interior key.** Multi-key moves go through a monotone spline, and zoom interpolates in log space (`references/easing.md` §7–8).
6. **Never decelerate into a cut.** A move that crosses a cut accelerates through it and the next scene continues at the same speed; a move that must land, lands ≥10f before the cut and holds. Drift dies before a matched cut.

## Entrances

| Role | Duration | Ease | Travel | Blur | Stagger |
| --- | --- | --- | --- | --- | --- |
| Headline word, energetic (blurUp) | **12f** (12–14) | outCubic | y +0.5em (10–50 px) | 10 → 0 px | **3–4f** per word |
| Headline word, calm (rise + fade) | 14–16f | outCubic | y +0.3em (10–30 px) | **0** | 3–4f per word, or by line |
| Evidence line (a fact, a number, a run's label) | 8–10f, or a hard cut on | outQuart | mask rise, or none | 0 | by line |
| Sub line, eyebrow | 10–12f | outCubic | y 10–20 px | 0–6 px | 2f per word, or by line 4f |
| Display title, by character | 8–16f | outSmooth | y 20–46 px | 10–14 px | **1–2f** per character (1.2–1.6 for display) |
| Card, panel, UI element | **14–16f** | outSmooth | 20–60 px, or scale 0.94 → 1 | 0–10 px | 2–5f; grids centre-out at 2–2.5f per ring |
| Mark, logo | 14–20f | spring gentle (no overshoot) | scale 0.72–0.9 → 1, or clip-draw 16f with a 26 px lift | 0 | — |
| Button, badge, stamp | 14f | pop: keys 0 → **1.08** at 60% → 1 | — | — | 1–4f |
| Toast, app icon | 10–14f | outBack c1 1.70 (**1.10**) | — | — | — |
| Hero number | 12f | outSmooth | y +50 px, scale 0.94 → 1 | 10 px | — |
| Chat bubble | 16f | spring m0.8 k165 c17 | scale 0.8 → 1 from the tail corner | 0–9 px | slot opens 12f before |
| Headline slam (3D) | 14f | keys z 6 → 0, scale 0.7 → 1.04 → 1 | out of the lens | — | — |
| Card word on a dark ground (glow-resolve) | 10–14f | outCubic | y +0.3em | 12 → 0 px, plus a soft glow copy (16 px) 1 → 0.45 | 3–4f per word |
| Punch word (smear-in) | 8–10f | outQuart | scale x 1.5 → 1 from the reading side | 14 → 0 px | — |
| Lifted control (to poster scale) | 14–18f | spring gentle (no overshoot) | scale 1 → 2.5–4 about its own centre | 0 | — |

**Which headline entrance**: blurUp is the default only for energetic families and personalities (A, B, C, confident premium, playful). Calm-trust films (finance, health, enterprise, luxury, calm C) rise and fade with no blur. Give evidence lines a second, plainer entrance than message lines, so the film has two entrance roles; never the same blur in and blur out on every line (a template tell). Heavy display type can take blur 18–34 px. Slow slide-ins use 140–420 px travel with a 5f word stagger. Short social launch cards on a dark or gradient ground (family K) use glow-resolve as the message entrance and a smear-in for the one punch word; the cards' *exits* ride the ground's move rather than a matching blur-out. Long text arrives by line or word, never by character: `references/text-motion.md` has the kinetic-type recipes and the reading-time rules every one of them obeys.

**Order of arrival is order of importance.** The first thing to move after a cut is the focal point. Offset the first entrance 3–6f from the cut so the cut itself reads. Exception: a card or title that **lands on a hit** (a trailer card, a beat card, a word on a music hit) is fully legible on the hit frame: pre-roll its entrance so it completes on the hit, or put it on hard; a blur still clearing on the hit frame misses the hit.

## Exits

| Role | Duration | Ease | Motion |
| --- | --- | --- | --- |
| Text line | **6–9f** | inCubic | up 10–26 px + fade; blur 10 only when it entered with blurUp |
| Card or block | 8–10f | inCubic | drop or slide along its arrival axis, or fade up −18 px |
| Hero element | 12f | inOutCubic | up 60 px + blur 12 |
| Logo leaving frame | 12f | accelerating `bezier(0.4, 0, 1, 1)` | slides off |
| A group before a cut | 6–9f each, staggered 2–3f | inCubic | clears 4–8f before the cut |

Leave along the axis you arrived on, or along the film's direction of travel.

## Overshoot and springs

Overshoot is a role, not a default. Premium, enterprise, finance, health and luxury tones use **none**. Playful, consumer and youth tones may overshoot on one role (buttons, badges, stamps, reactions) at 6–10%.

| Size | Value | outBack c1 | Use |
| --- | --- | --- | --- |
| Headline punch | 1.06 | 1.28 | A word that must hit, a number landing |
| Button, badge, stamp | 1.08 | 1.50 | Things you press or that stamp |
| Toast, icon pop | 1.10 | 1.70 | Small objects arriving |

The peak sits at about 60% of the duration. Springs, measured from the templates (ζ = damping ratio):

| Preset | m / k / c | ζ | Overshoot | Use |
| --- | --- | --- | --- | --- |
| gentle | 1 / 120 / 30 | 1.37 | 0 | **Marks and logos**, run over 14–20f |
| default | 1 / 170 / 26 | 1.00 | 0 | General arrivals |
| stiff | 0.8 / 320 / 28 | 0.88 | 0.3% | Small UI snaps |
| chat bubble | 0.8 / 165 / 17 | 0.74 | 3% | Message bubbles, 16f |
| reaction | 0.6 / 200 / 14 | 0.64 | 7% | Emoji reactions, 18f |
| bouncy | 1 / 220 / 14 | 0.47 | 19% | Playful brands only |

"Gentle over 16f" means the gentle shape time-scaled to settle in exactly 16f; write springs that way on every engine (closed-form code in `references/easing.md` §6).

**Damped swings** (a pendulum, a hanging sign, a gauge pointer, a wobbling card): `θ(t) = A · e^(−ζω0·t) · cos(ωd·t)`. The eye reads the motion as over at its **last visible swing**, not at the formula's end, so plan the settle frame as the frame where the amplitude envelope `A · e^(−ζω0·t)` drops under **1°** (or 1 px for a translation): `t_settle = ln(A / 1°) / (ζω0)`. Then capture a strip of every 2nd frame around it and confirm; a swing planned to settle at f44 that is visibly still from f32 leaves a 12f dead beat. If the next move must start at the settle, start it on the measured frame.

**Searching swings** (anticipation that builds into a snap, the opposite of a damped settle): amplitude shrinks while the rate rises, so energy climbs into the trigger. It has two parts: a chirped swing over `[0, T]` that ends **on an extreme** (velocity 0), then a **snap** from that extreme to rest over 3f outCubic that lands on the trigger frame `T + 3` (the tick and the glint go there). Ending on an extreme is what makes the snap a move: a swing that ends on a zero crossing is already at rest position, moving at full speed, and has nothing left to snap.

- Swing, with `p = t / T` and a phase offset `φ0` so frame 0 is already mid-swing: `θ(t) = A0 · (1 − 0.6p) · sin(2π · φ(t))`, `φ(t) = φ0 + f0·t + (f1 − f0) · t² / (2T)`. Defaults: `A0` 35°, `φ0` 0.125 (frame 0 at 0.71 × A0 and moving), `f0` 1.2 Hz.
- Solve `f1` so `φ(T)` is an odd quarter (an extreme): compute `φ(T)` with a trial `f1` of 3.5 Hz (`φ(T) = φ0 + T·(f0 + f1)/2`), round it to the nearest `n + 0.25` or `n + 0.75`, then `f1 = 2·(φ_end − φ0) / T − f0`.
- Snap: `θ = θ(T) · (1 − outCubic((t − T) / 3f))`, ending at 0 on `T + 3`. Its first frame must move ≥ 0.8 × the last swing's peak per-frame speed, or it reads as a settle: if it does not, shorten it to 2f or decay the amplitude less (`1 − 0.5p`).
- North passes (zero crossings, where a tick is motivated) are where `φ(t) = k/2`: `t = (−f0 + √(f0² + 2a·(k/2 − φ0))) / a`, with `a = (f1 − f0) / T`.
- Worked example (tested numerically, 30 fps, trigger on f36): `T` = 33f = 1.1 s, `φ(T)` with 3.5 Hz = 2.71 → 2.75, so `f1` = 3.573 Hz. Frame 0 = +24.8°; the swing peaks at 11.7°/frame, the last extreme is −14.0° on f33; the snap moves 9.9°, 3.6°, 0.5° per frame and rests on f36. North passes at f7.6, 15.1, 21.1, 26.2, 30.9 (ticks on f8, 15, 21, 26, 31, the snap tick on 36).
- Check a strip: no two consecutive anticipation frames identical (an extreme falling exactly between two frames duplicates them; nudge `φ0` by 0.02).

Never let a damped swing stand in for this, and never decay the amplitude to zero before the trigger: the motion reads as over once the envelope drops under 1°, which leaves a dead beat before the snap.

## Holds that breathe

| Behaviour | Numbers | On |
| --- | --- | --- |
| Camera drift | **4–7 px at 0.18–0.4 Hz**, two incommensurate sines | The whole frame: the best default hold |
| Float | y ± **2–4 px** at 0.25 Hz | A headline or line, one shared phase |
| Breathe | scale ± **0.4–2.2%** at 0.2 Hz (numbers 0.4–0.6%, marks 1.2–2.2%) | One hero object |
| Creep | zoom +1.5–6% over the scene, inOutSine | Long holds, UI demos |
| Ambient glow | radial glows drifting 26–46 px | Backgrounds |
| Constant spin | 0.006 rad/frame (rays), 0.05°/frame (orbits) | Background objects, linear |

- **One** ambient behaviour on the focal element at a time; the camera drift can run under it.
- **A held line still needs a visible change.** A line held at its formula (`direction` Step 6) is not a dead hold only if something can be seen changing on a 4 fps strip of the hold: the device acting, the next beat's first motion overlapping in, an ambient big enough to see. A 1.5% breathe or a 3–6% creep is invisible on the strip and does not count.
- **Lockups move as one group.** A mark + name, an icon + label, a chip + its text: animate the group's transform, not the parts on separate paths, so nothing passes through a visible word. If one part must arrive first, the other enters only after the first has cleared its slot.
- A line floats with one shared phase; per-word phases break the baseline.
- Drift dies before a matched cut: `drift × (1 − transition progress)`.
- In diagram explainers, drift returns to rest at both ends of each scene so cuts land on identical frames.
- Build a scene in its first 30%, breathe through 30–70%, resolve in the last 30%. Reveal later pieces when the VO names them.

## Interaction

| Move | Numbers |
| --- | --- |
| Click / tap | press **4f in, 6f out**, scale −8 to −15%; ring 8–14f outCubic |
| Finger tap | approach 22f, dip 4f / release 9f, ripple 18f |
| Cursor travel | **16–26f**: x outCubic + y inOutCubic gives a natural arc; 9f fast, up to 50f when the camera leads |
| Typing (UI) | 2–3 frames per character, finishing ~4f before the press; caret solid while typing, blinking 8f only when idle |
| Count-up | small stats 40–48f, hero 120–210f, outCubic; land punch 1.06 (5f up, 13f down); celebration within ±2f of the land |
| Layout morph | 24f on `bezier(0.65, 0, 0.35, 1)`, one every ~50f |
| List row grows | 11f on `bezier(0.2, 1.1, 0.3, 1)` (small overshoot), slot opens before content |

## Camera grammar

One move per shot, always eased, always motivated by what the shot needs to say.

| Move | Numbers | What it says | Use |
| --- | --- | --- | --- |
| Push-in | **24–48f inOutCubic**, zoom 1.3–2.5×; **a launch peak 1.7–3.8×** (`launch-playbook`), ending with the subject in the centre third at ≥ 40% of frame height | "Look at this"; importance, focus | Before a reveal, onto the control that matters |
| Match-push | 6–10f inCubic to 3.8× into a cut | "We're going inside" | Mic → transcript, button → result |
| Punch-in | 6–10f inCubic, 8–15%, hold ≥15f, release 10–15f | Emphasis on a word or beat | Key line, music hit |
| Slam | zoom 1 → 9 over 10f inCubic + zoom blur + white flash | Impact, the peak | Once per film at most |
| Pull-back | 45–52f inOutCubic; as the film's broken rule, it scales about the focal element so the focal stays put on screen | Context, scale, release | Revealing the bigger picture, toward the end card |
| Orbit | 10–30° over 90–150f, inOutSine or linear | Premium form, "every side" | 3D product hero |
| Pan / truck | 1.5–3 s inOut, cursor or subject leads | Journey, scanning a line-up | One-shot films, feature line-ups |
| Creep | +1.5–6% zoom over the scene | Quiet life | Long holds |
| Drift | 4–7 px at 0.18–0.4 Hz | Alive, not moving | Default under everything |
| Shake | 3–6f decay, on the impact frame | Impact, urgency | Hits only |
| FOV punch | −5 to −10°, decaying with a kick | Music hits | Music video |

- **A move that carries the peak starts its ease-in 10–14f before the hit**, so on the hit frame it is visibly under way (about 40–60% of its peak speed) and the picture change lands *on* the hit; "ease in over 10–15f" and "the change lands on the hit frame" are the same rule once the ease-in is pre-rolled. A 4f lean-in leaves the hit frame looking still. Recipe and the speed formula: `three-camera`.
- **Type waits for the move.** Labels belonging to the moving world land after it settles; nothing in the world crosses a visible word mid-move (route it out of the headline band, or under a feathered knockout with a ≥ 40 px soft edge, never a hard box: `three-type`).
- Interpolate zoom in log space; route paths with three or more keys through a monotone spline.
- Never animate dolly and FOV in the same move. Never a camera move under 6f except a deliberate punch-in into a cut.
- Keep one direction of travel for progress across the film.
- On Three.js the camera is real: `three-camera` has the rig.

## Handoffs and transitions

Choose one signature and one workhorse per film (`direction` Step 7). House usage: motivated handoffs 64% of cuts, exit-then-cut 31%, hard cuts 5%, plain crossfades 0%. Full build recipes, Three.js notes and failure modes: `references/transitions.md`.

| Handoff | Duration | Carrier / build | Use | Sound cue (linear / dB) |
| --- | --- | --- | --- | --- |
| Persisting element | 0f at the cut; moves 16–22f after | No exit in scene N; identical pose at frame 0 of N+1 | The default for related scenes | None, or a pop 0.5 (−6) when it lands |
| Flood becomes object | 6–13f ease-in, contract 10–13f | Circle from a button to `hypot(halfW, halfH) × 1.05`; next scene contracts it into an object | CTA press, send, brand beats | Tap 0.8 (−1.9) on the press that starts it, or nothing |
| Iris | 16–34f inOutCubic | Circle from the clicked control to the farthest corner; iris-in shrinks to an object | End of a demo, ending on a mark | Click 0.9 (−0.9) on the press; tonal swell 0.6 (−4.4) from iris start |
| Match-push | 24–48f readable, 6–10f aggressive | Camera ends at an exact crop; next scene laid out at that scale; drift stopped | Into a UI element | None; soft land 0.5–0.7 (−6 to −3.1) on the settle, or a tonal note on the beat |
| Push through screen | 45f in, 52f back out | Zoom = frame width / screen width | Device → UI → device | None, or the UI's own sound as the screen fills |
| Flash-to-white | ramp 4–8f ease-in, decay 6–9f | White layer straddles the cut; ≥ 50% luma contrast with the frames either side, measured within the flashing area; letterboxed picture: flash the picture area only; never into an already bright plate | Music cuts, impacts; once or twice per film elsewhere | Impact 0.7–0.85 (−3.1 to −1.4) on the cut ±2f |
| Block wipe | 18–24f | 12 × 7 cells by sweep + clump + jitter, growing out of an on-screen object of the wipe's colour; incoming beat already 12f into its entrances | Textured, editorial films | None, or soft ticks 0.3–0.45 as clumps land |
| Colour-field push / panel wipe | 8–23f inOutCubic | Field owns the last frame; next scene carries momentum (46 px → 0 over 16f) | Chapters, palette changes | Soft land 0.5–0.7 (−6 to −3.1) on the settle, or none |
| Card morph | 18–28f inOutCubic | Card lerps to an overscanned full frame; labels fade 2.4× faster | Opening an example into its scene | None, or the tap 0.8 (−1.9) that opens the card |
| Typewriter delete | 2–2.4 f/char type, 2.1 delete | Same slot, width reserved | "Introducing" → the name | Key ticks 0.3–0.45 (−10.5 to −6.9) |
| Rise-through | 18–24f outSmooth | The next beat's panel rises from below through the card while the card's words blur 0 → 12 px and fade over its first 10f; no cut | A type card into a product beat (family K) | None, or a soft land 0.5 (−6) when the panel settles |
| Brand-shape pass | 10–16f inOutCubic close, 10–16f open | A large soft brand shape (an arc, a lens, a light band) closes over the frame and opens on the next beat; the same shape every time, in the film's ground colours | Every cut of a short social film | A tonal note 0.5 (−6) on the close (never a noise swell), nothing on the open |
| Defocus-through | 6f blur 0 → 16 px, cut, 8f 16 → 0 | Both sides defocus; the cut hides at peak blur | Card to card when nothing carries | None, or a soft tick |
| Whip / blur-rush | 8–10f around the cut | Same speed and direction both sides; blur 20–30 px | Montages, high-energy social | The beat or hit on the cut, or nothing; never a whoosh |
| Rush into the lens | 10–24f ease-in | Exponential scale ×7 or camera to the object, bg to white | The peak, publish moments | Riser 0.55 (−5.2) ending on the cut + impact 0.85 (−1.4) |
| Board erase | 10f + 8f blank | Every stroke un-draws | Whiteboard explainers | None; VO +6f after the cut |
| Exit-then-cut | 6–9f, clear 4–8f before | Elements leave, cut on a near-empty frame | The workhorse between VO beats | None; VO +3–8f after the cut |
| Fade to black | 14–16f inOutSine | Black layer rises | The final frame, chapter breaks only | Music fade-out 15f (30–45f under VO) |
| Hard cut on the beat | 0f | Content to content on the grid | Beat-cut style, smash cuts | The beat itself; add nothing |

## Building it on each engine

The numbers are engine-neutral. How to apply them:

- **Three.js** (the default): `@genmotion/three-engine` ships only linear, quad in/out/inOut and a multi-key `interpolate` (which stops at each key). Put the house curves, the spline, springs and ambient functions in one `components/ease.ts` module of pure functions, defined once from `references/easing.md`, and import it in every scene. Text is canvas-texture planes per word (`three-type`); blur is pre-rendered levels or a shader; floods, wipes, irises and flashes are camera-parented planes (`three-transitions`); camera moves are real dolly, orbit and FOV (`three-camera`). Shared handoff poses live in `components/` so both scenes import the same numbers.
- **React**: `@genmotion/motion` has outCubic, outQuart, outExpo, inOutCubic, outSmooth, `bezier`, `back`, and `spring` with presets and `durationInFrames`. There is no `outBack` or `inQuad` export: a missing name silently runs linear. Use `Easing.out(Easing.back(1.5))` or define the curve.
- **HyperFrames**: the timeline library's eases map by name (power2 = cubic, power3 = quart; back.out(1.5) = the 1.08 pop). Everything stays on the seekable timeline: finite tweens, no infinite repeats.

Everything is a pure function of the frame: no randomness and no wall-clock timers. Variation comes from seeded hashes of an index.

## Anti-patterns

You will be tempted to do each of these. Don't.

- **The same fade-up on everything.** Every element rising 20 px with opacity in every scene is the signature of unconsidered motion. Pick by role from the entrance table.
- **Bounce as the default.** Overshoot on every element reads as a toy. One role, 6–10%, and none for premium tones.
- **A different transition per cut.** Glitch, then spin, then zoom-blur: decoration, not grammar. One signature, one workhorse.
- **Plain crossfades between scenes.** The house never uses them. Carry an element, flood, wipe, or exit-then-cut.
- **Easing out into a cut.** A move that decelerates into the last frame stops dead at the cut. Accelerate through, or land early and hold.
- **Stop-start camera paths.** Segmented interpolation with eased segments halts at every key. Use the monotone spline.
- **Linear zoom.** It races then crawls. Interpolate in log space.
- **Everything floating on its own phase.** One ambient behaviour; one shared phase per line.
- **Exits longer than entrances.** The viewer has already moved on.
- **Drift still running at a matched cut.** The frames "almost" match, which reads as a jump.
- **Per-letter wobble on held text.** A single slow drift on the whole line instead.
- **Guessed ease names.** A name the engine doesn't export runs linear without an error.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Checking timing and cuts | `capture-frames` on the frames either side of each move and cut | None |
| Measuring a stall or a cut's timing in an export | `ffmpeg` (extract the frames around it) | Capture single frames one by one |
| Three.js camera rig and cover planes | `three-camera`, `three-transitions` | — |

## Checks before you finish

1. Every entrance decelerates and every exit accelerates; spot-check three elements with `capture-frames` at 25%, 50% and 100% of their move (most of the travel is done by 25% on an entrance).
2. Exits finish 4–8f before each cut: the frame 3f before every exit-then-cut shows background only.
3. For every matched handoff, the last frame of scene N and the first of N+1 match in carrier position, size and colour, with camera drift at zero.
4. No multi-key camera or cursor path stalls: capture 5 consecutive frames around each interior key; the subject keeps moving. A camera move that carries the peak differs visibly between the hit frame and 2f before it.
5. Overshoot appears only on the roles the Direction block allows, at the sizes above.
6. Each held frame has exactly one ambient behaviour on its focal element.
7. Every sound cue paired with a handoff sits at the frame this table gives (check against the cue sheet).
8. No randomness or wall-clock timing anywhere in scene code; `validate` passes.
