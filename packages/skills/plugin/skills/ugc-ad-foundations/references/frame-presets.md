# The four looks

Four design directions that cover almost every UGC ad. Each is a palette, a type spec, a caption treatment and a build note. Read it when you choose the look for the Direction block. Caption geometry everywhere follows the one spec in `ugc-craft` (one line centred at y 1160 on 1080×1920, inside y 1110–1210); a look only changes the skin.

Keep the chosen values in one module (`components/look.ts` on Three.js, shared tokens on HyperFrames or React) and read them in every scene.

## Native

The default. Reads as a phone recording, not a production.

- **Palette**: the footage's or stills' own colours. Text white; one accent used only on the active caption word, never as a background fill.
- **Type**: a plain system-style sans (Inter, SF Pro or Roboto stand-ins), weight 700–800 for captions, 600 for anything else.
- **Captions**: 2–3 words per group, 76–88 px, white fill, 8 px black stroke, no plate. Active word in the accent.
- **Chrome**: none. No logo, lower third or watermark until the end card, if there is one.
- **Motion**: hard cuts; caption groups pop in over 4f (scale 0.9 → 1, outCubic) and hard-kill at their end. One creep or drift on stills.
- **Three.js**: captions are canvas-texture planes per word (`three-type`), stroke drawn into the canvas with `strokeText` before `fillText`; footage and stills are planes sized from real pixels (`three-assets`).

## Bold caption

Loud, fast, hook-led. For a cold-traffic opener.

- **Palette**: one saturated accent (yellow #FFE500, lime #00FF66 or the brand's) against near-black or near-white.
- **Type**: a heavy condensed display face (Montserrat Black class), ALL CAPS or Title Case.
- **Captions**: 1–2 words per group, 88–110 px, 10 px stroke or a solid accent block behind the active word; active word pops to 1.1 over 4f.
- **Chrome**: nothing else on screen.
- **Motion**: groups land on the word's start frame; eased punch-ins on stressed words (≤4 per 30 s, `ugc-craft`).
- **Three.js**: the accent block is a rounded-rect plane behind the word plane, scaled with it; keep both in one group so they move together.

## Clean demo

Screen-led. The interface is the star; the design gets out of its way.

- **Palette**: neutral off-white (#F5F5F2) or near-black stage behind the device or crop, so the product's own colours read true. No accent competing with the brand.
- **Type**: restrained sans 600–700.
- **Captions**: one line, sentence case, 64–72 px, white on a 60% black rounded bar, same y as every other look. No word-by-word bounce; it would compete with the UI motion.
- **Chrome**: a device frame only if the capture is a whole phone screen (`screen-capture` has the build); otherwise full-bleed.
- **Motion**: the UI moves (cursor, state changes, focus pushes); the caption bar stays still.
- **Three.js**: the UI is either a video texture or rebuilt as canvas-texture planes; the caption bar is a plane in a camera-parented overlay so focus pushes do not move it.

## Camcorder

Retro handheld, deliberately degraded. For nostalgia, a founder's "found footage" angle, or a pattern interrupt.

- **Palette**: desaturated about 15%, a warm or green cast, lifted blacks.
- **Type**: a monospace timestamp face for any overlay.
- **Captions**: smaller (56–64 px), plain white with a 4 px shadow-free stroke, same y as every other look.
- **Chrome**: `REC ●` and a running timestamp top-left inside the readable area (x ≥ 120, y ≥ 270); film grain; a vignette.
- **Motion**: 1–2 px frame jitter from a seeded hash of the frame index (never randomness), a 2f glitch on cuts instead of a clean snap.
- **Three.js**: grain, vignette and jitter as one full-frame shader pass or a camera-parented plane with a per-frame seeded noise texture (`three-look`).

## Picking one

| Format | Look |
| --- | --- |
| `ugc-screen-demo` | Clean demo (Native for a mobile app recorded on the phone) |
| `ugc-green-screen` | Native |
| `ugc-unboxing` | Native, or Camcorder for a nostalgia angle |
| `ugc-problem-solution` | Native; Bold caption for a cold-traffic cut |
| A hook-only test or pattern-interrupt opener | Bold caption |

Switching looks mid-ad reads as "made by committee", which is the ad-not-a-person problem the format exists to avoid.
