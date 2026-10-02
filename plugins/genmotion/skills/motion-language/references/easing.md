# Easing, springs and keyframe paths: formulas

Every curve the house motion language uses, written as formulas and as deterministic JS-like pseudocode you can paste into a helper module. All functions are pure: the same frame in gives the same value out, with no randomness and no wall-clock timers. Read it when you need a curve the engine does not ship, a spring on Three.js, or a multi-key move that must not stall.

Contents: 1 Conventions · 2 The curve catalogue · 3 Choosing a curve · 4 Cubic-bezier evaluation · 5 Back (overshoot) tuned by size · 6 Springs · 7 Multi-key moves: monotone spline · 8 Log-space zoom · 9 Ambient functions (drift, breathe, float, pulse, kick) · 10 Seeded variation · 11 What each engine ships

---

## 1. Conventions

- `t` is normalised progress in [0, 1]. Always clamp before easing.
- Frames are integers; the timeline is a pure function of the frame number.

```js
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const progress = (frame, start, duration) => clamp01((frame - start) / duration);
const lerp = (a, b, t) => a + (b - a) * t;
// value of a move from a to b, starting at `start`, lasting `dur` frames, eased by `ease`
const tween = (frame, start, dur, a, b, ease) => lerp(a, b, ease(progress(frame, start, dur)));
```

## 2. The curve catalogue

| Name | Formula | Shape | House use |
| --- | --- | --- | --- |
| linear | `t` | constant speed | Continuous loops, rotation, linear paper drift, typing position |
| inQuad | `t²` | gentle accelerate | Three.js `Easing.easeIn`; light exits |
| outQuad | `1 − (1 − t)²` | gentle decelerate | Three.js `Easing.easeOut`; entrances when nothing better exists |
| inOutQuad | `t < .5 ? 2t² : 1 − (−2t + 2)² / 2` | soft S | Three.js `Easing.easeInOut` |
| inCubic | `t³` | accelerate | **Exits**, punch-ins into a cut, floods |
| outCubic | `1 − (1 − t)³` | decelerate | **Entrances**, counters, cursor x, rings |
| inOutCubic | `t < .5 ? 4t³ : 1 − (−2t + 2)³ / 2` | S-curve | **Moves inside the frame**, camera pushes, wipes, morphs, irises |
| outQuart | `1 − (1 − t)⁴` | strong decelerate | Rules and lines scaling in, blur resolving, mask push-ups |
| truncated outQuart (count clock) | `outQuart(0.85t) / outQuart(0.85)` | strong decelerate that never stops | **Hero count-ups and anything on their clock** (a chart head, a trail, a ring). A plain outCubic or outQuart over 150f+ leaves its last 20–40% of the time under 1% of the travel, so the count parks before the land; over a 180f count this keeps 0.7% of the range for the last 30f and 2.8% for the 30f before (the last digits crawl as the breath, the chart head still moves). At 25% of the time it shows 62% of the range |
| outQuint | `1 − (1 − t)⁵` | very strong decelerate | Words arriving from far off (one-shot films) |
| outExpo | `t === 1 ? 1 : 1 − 2^(−10t)` | snap then glide | Fast scrolls, confident arrivals |
| inExpo | `t === 0 ? 0 : 2^(10t − 10)` | late slam | Rushes into the lens |
| inOutSine | `−(cos(πt) − 1) / 2` | very soft S | Slow camera creeps, fades to black, dreamy holds |
| outSmooth | `cubic-bezier(0.25, 1, 0.5, 1)` | fast start, long tail | **The house entrance ease** (cards, marks, sheets) |
| outBack | `1 + c3(t − 1)³ + c1(t − 1)²`, `c3 = c1 + 1` | overshoot then settle | Buttons, badges, toasts, stamps (see §5) |
| accelerating exit | `cubic-bezier(0.4, 0, 1, 1)` or `(0.5, 0, 0.88, 0.2)` | slow start, leaves fast | A logo or line leaving the frame |
| move | `cubic-bezier(0.65, 0, 0.35, 1)` | firm S | Layout morphs between UI states |
| settle | `cubic-bezier(0.2, 1.1, 0.3, 1)` | small overshoot | A list row growing to make room |

## 3. Choosing a curve

- **Entering**: decelerate (outCubic, outSmooth, outQuart). About 60–70% of the travel happens in the first 30% of the time, so the element arrives with confidence and settles slowly.
- **Leaving**: accelerate (inCubic, inQuad). It gets out of the way; the viewer's eye is already moving to the next thing.
- **Moving within the frame**: inOutCubic. A camera or an element at rest that ends at rest must accelerate and decelerate.
- **Crossing a cut**: never decelerate into the last frame. Either accelerate through it (inCubic) or land 10+ frames before the cut and hold.
- **Easing is the adverb**: outExpo = confident; inOutSine = dreamy; outBack = playful; linear = mechanical or ironic.
- **Two at most per scene for the same role.** A different curve on every element reads as no physics at all.

## 4. Cubic-bezier evaluation (deterministic)

For `cubic-bezier(x1, y1, x2, y2)`, find the parameter `s` whose x equals `t`, then return its y. Newton steps with a bisection fallback are exact enough and fully deterministic.

```js
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s;
  const Y = (s) => ((ay * s + by) * s + cy) * s;
  const dX = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (t) => {
    t = clamp01(t);
    let s = t;
    for (let i = 0; i < 8; i++) {            // Newton
      const err = X(s) - t, d = dX(s);
      if (Math.abs(err) < 1e-6) return Y(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0, hi = 1; s = t;                // bisection fallback
    for (let i = 0; i < 30; i++) {
      const x = X(s);
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}
const outSmooth = bezier(0.25, 1, 0.5, 1);
```

Build each bezier once at module level, not per frame.

## 5. Back (overshoot) tuned by size

`outBack(t) = 1 + (c1 + 1)(t − 1)³ + c1(t − 1)²`. The peak sits at `t = 1 − 2c1 / (3(c1 + 1))` and overshoots by `c1 · (2c1 / (3(c1 + 1)))² / 3`.

| c1 | Overshoot | Peak at | House role |
| --- | --- | --- | --- |
| 1.00 | 3.7% | 67% | Subtle settle on a large panel |
| 1.28 | 6% | 63% | Headline punch (1.06) |
| 1.50 | 8% | 60% | Button, badge, stamp (1.08) |
| 1.70158 | 10% | 58% | Toast, app icon pop (1.10), the textbook default |
| 2.00 | 13% | 56% | Cartoon; almost never |

The keyed equivalent the 3D templates use: `[0 → peak at 60% of the duration → 1]` with outQuad on each half, e.g. a 14f pop to 1.08 = keys at frames 0, 8.4, 14.

A name that does not exist in your engine fails silently: a missing ease resolves to nothing and the move runs linear. Define it yourself (above) rather than guessing a name.

## 6. Springs

A spring is a damped oscillator released from 0 towards 1: mass `m`, stiffness `k`, damping `c`. Natural frequency `ω0 = √(k/m)`, damping ratio `ζ = c / (2√(km))`. Below ζ = 1 it overshoots by `exp(−ζπ / √(1 − ζ²))`.

| Preset | m / k / c | ζ | Overshoot | Settles (natural, to 1%) | House role |
| --- | --- | --- | --- | --- | --- |
| stiff | 0.8 / 320 / 28 | 0.88 | 0.3% | ~7f | Small UI snaps |
| default | 1 / 170 / 26 | 1.00 | 0 | ~16f | General entrances |
| gentle | 1 / 120 / 30 | 1.37 | 0 | ~31f | **Marks and logos** (run over 14–20f) |
| molasses | 2 / 90 / 28 | 1.04 | 0 | ~33f | Heavy, slow settles |
| chat bubble | 0.8 / 165 / 17 | 0.74 | 3% | ~13f | Message bubbles (run over 16f) |
| reaction | 0.6 / 200 / 14 | 0.64 | 7% | ~10f | Emoji reactions (18f) |
| lively bubble | 0.85 / 170 / 13 | 0.54 | 13% | ~18f | A frantic group chat (18f) |
| bouncy | 1 / 220 / 14 | 0.47 | 19% | ~18f | Playful brands only |

The house spring helper takes a `durationInFrames` and time-scales the spring so it settles (within 0.5%) in exactly that window. That is why "gentle over 16f" is a meaningful instruction: the shape is the gentle shape, the length is 16f. Write it the same way on any engine.

Closed form (deterministic, no simulation), for t in seconds = frame / fps:

```js
function springValue(t, m, k, c) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r1 = -w0 * (z - Math.sqrt(z * z - 1)), r2 = -w0 * (z + Math.sqrt(z * z - 1));
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}
// stretched to settle in `dur` frames: precompute `natural` (seconds to settle within 0.5%) once
const springIn = (frame, start, dur, natural, m, k, c, fps) =>
  springValue(((frame - start) / dur) * natural, m, k, c);
```

**Premium, enterprise and luxury tones use ζ ≥ 1 (no overshoot).** Playful and youth tones may use 3–10% on one role. Reuse one spring per role across the whole film; "a bounce that behaves differently each time" is the tell of unconsidered motion.

## 7. Multi-key moves: monotone spline

Segmented interpolation with an ease per segment (`interpolate(f, [0, 30, 60], [a, b, c], easeInOut)`) **decelerates to a standstill at every interior key**. On a camera path that reads as stop, start, stop. The fix the house templates use is a monotone cubic Hermite spline (Fritsch–Carlson / PCHIP): it passes through every key, never overshoots between them, and keeps moving through interior keys.

```js
// keys: frames ascending; vals: values at those frames. Returns f(frame).
function glide(keys, vals) {
  const n = keys.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d[i] = (vals[i + 1] - vals[i]) / (keys[i + 1] - keys[i]);
  m[0] = 0; m[n - 1] = 0;                              // rest at both ends
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }  // a turn or a hold: stop here
    const w1 = 2 * (keys[i + 1] - keys[i]) + (keys[i] - keys[i - 1]);
    const w2 = (keys[i + 1] - keys[i]) + 2 * (keys[i] - keys[i - 1]);
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);    // weighted harmonic mean
  }
  return (frame) => {
    if (frame <= keys[0]) return vals[0];
    if (frame >= keys[n - 1]) return vals[n - 1];
    let i = 0; while (frame > keys[i + 1]) i++;
    const h = keys[i + 1] - keys[i], s = (frame - keys[i]) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vals[i] + (s3 - 2 * s2 + s) * h * m[i]
         + (-2 * s3 + 3 * s2) * vals[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
```

- Ends have zero velocity (the move starts and ends at rest). For a move that must carry momentum across a cut, set `m[n − 1]` to the incoming scene's starting speed instead of 0.
- Two equal consecutive values make a hold: the spline stops there on purpose.
- Use it for camera paths, cursor paths through several targets, and any value with three or more keys.

## 8. Log-space zoom

Perceived zoom speed is proportional to the ratio, not the difference. Interpolating scale 1 → 4 linearly makes the push race at the start and crawl at the end. Interpolate the logarithm:

```js
const zoomAt = (frame, start, dur, z0, z1, ease) =>
  Math.exp(lerp(Math.log(z0), Math.log(z1), ease(progress(frame, start, dur))));
```

On a perspective camera, apparent size ∝ 1 / distance, so interpolate `log(distance)` the same way. For an exponential blow-up (a page flooding the frame ×7), `scale = exp(ln(7) × ease(t))`.

## 9. Ambient functions

All take the frame and return an offset; all are periodic or decaying, never random.

```js
const TAU = 2 * Math.PI;
// Camera drift: two incommensurate sines so the path never visibly repeats.
// amp in px (4–7), hz 0.18–0.4. Multiply by `alive` (1 → 0) to kill it before a matched cut.
function drift(frame, fps, amp, hz, phase = 0) {
  const w = TAU * hz / fps;
  return {
    x: amp * (0.65 * Math.sin(w * frame + phase) + 0.35 * Math.sin(0.633 * w * frame + 1.7 + phase)),
    y: amp * 0.6 * (0.65 * Math.sin(0.81 * w * frame + 2.1 + phase) + 0.35 * Math.sin(0.52 * w * frame + 0.4 + phase)),
  };
}
// Return-to-rest drift for a scene of `len` frames: zero offset at both ends, so cuts land on identical frames.
const restDrift = (frame, len, ampX, ampY) => {
  const p = frame / len;
  return { x: ampX * Math.sin(TAU * p), y: ampY * Math.sin(Math.PI * p) * Math.sin(TAU * p) };
};
// Breathe: scale 1 ± pct at hz (0.2 Hz default). Float: y ± px at hz (0.25 Hz).
const breathe = (frame, fps, pct = 0.012, hz = 0.2) => 1 + pct * Math.sin(TAU * hz * frame / fps);
const float = (frame, fps, px = 3, hz = 0.25) => px * Math.sin(TAU * hz * frame / fps);
// Beat pulse: 1 on each beat, decaying. beatPos = (seconds − firstDownbeat) × bpm / 60.
const beatPulse = (beatPos, sharp = 6) => Math.exp(-(beatPos - Math.floor(beatPos)) * sharp);
// Kick: a decaying spike after each event time (seconds), for flashes, shakes and FOV punches.
const kick = (t, times, sharp = 12) =>
  times.reduce((acc, ti) => (t >= ti ? Math.max(acc, Math.exp(-(t - ti) * sharp)) : acc), 0);
// Velocity motion blur: blur px from how far the element moved this frame.
const motionBlur = (posNow, posPrev, k = 0.11, cap = 26) => Math.min(cap, Math.abs(posNow - posPrev) * k);
```

A line of words that floats shares **one** phase across the line: per-word phases break the common baseline.

## 10. Seeded variation

When many items need different delays, offsets or angles (confetti, a pile of notes, avatars), derive each from its index through a seeded hash, never from a random source:

```js
function seeded(seed) {                    // mulberry32: same seed, same sequence
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const jitter = (index, salt = 0) => seeded(index * 9973 + salt)();  // per-item value in [0, 1)
```

Repeated sounds or motions vary by small fixed amounts by index (levels 0.42 / 0.46 / 0.50) so stacked repeats don't phase.

## 11. What each engine ships

- **React (`@genmotion/motion`)**: linear, quad, cubic, quart, quint, sin, circle, exp, bounce, elastic, back, bezier, in, out, inOut, outQuad, outCubic, outQuart, outQuint, outExpo, outBounce, inOutCubic, outSmooth, plus `spring` with presets and `durationInFrames`. There is no `outBack` or `inQuad` export: write `Easing.out(Easing.back(1.5))` or define the curve.
- **Three.js (`@genmotion/three-engine`)**: `Easing.linear`, `easeIn` (quad), `easeOut` (quad), `easeInOut` (quad) and a multi-key `interpolate`. Put every other curve above in a `components/ease.ts` module (pure functions, defined once) and import it from every scene, so the whole film shares one physics. `three-camera`'s `references/rig.md` has that module, with `outQuad`, `outCubic`, `outQuart`, `inCubic`, `inOutCubic`, `inOutSine`, `outSmooth`, `bezier()` and `trunc(ease, k)` (the count clock is `trunc(outQuart, 0.85)`); add any other curve from the table beside them. `THREE.MathUtils.smoothstep` and `damp` exist too, but `damp` depends on the previous frame's state: only use it where the value is recomputed from the frame number.
- **HyperFrames**: the timeline library's own eases (power, expo, sine, back with a configurable overshoot). Map by name (GSAP numbering): power1 = quad, power2 = cubic, power3 = quart, power4 = quint, so outCubic = power2.out, outQuart = power3.out, inCubic = power2.in, inOutCubic = power2.inOut; outBack with c1 = 1.5 is back.out(1.5).
