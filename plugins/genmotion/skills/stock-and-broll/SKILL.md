---
name: stock-and-broll
description: "Sourcing cut-aways, product shots and staged stills that read as real rather than stock: the sourcing order from the user's own material through the brand's assets and stock connectors to generated, the licence and resolution checks before anything is used, the tells of stock and the four treatments that fix them (grade, crop, move, cut short) with ffmpeg and in-scene recipes, prompting image and video models for phone-grade material, and where a cut-away goes against the voice. Load it when an ad needs material nobody has shot."
---

# Stock and b-roll

The wrong cut-away is worse than none. A stock shot in a UGC ad says "ad" as loudly as a logo does.

Frames at 30 fps; positions on 1080×1920. Moves (creep, jump zoom) are defined in `ugc-craft`; clip preparation in `screen-capture`.

## When to use

- An ad or video needs material nobody has: cut-aways behind narration, a staged failure state, a product shot, an environment, a texture.
- A user says footage "looks generic" or "looks like stock".
- An owner's build notes say "generate the stills" (`ugc-problem-solution`, `ugc-unboxing`).

Not for: the user's own long footage to be cut into a story (`video-editing`), real software on screen (`screen-capture`), a presenter (`ai-presenter`).

## The sourcing order

Work down the list and stop at the first one that yields something usable.

1. **The user's own.** A badly lit phone photo of the real thing beats a beautiful render of an imaginary one. Ask explicitly; people do not volunteer it. In with `save-asset`.
2. **The brand's own assets.** The product's site and press kit have photography that is already on-brand. Find them with `web-research`, fetch with `save-asset`. Never redraw a logo; fetch the real one.
3. **A stock connector** (`freepik`): good for environments and textures, weak for people.
4. **Generated**: `generate-image` for stills; a video model through `fal` or `replicate` for 2–4 s clips. Best for the specific, staged shots stock never has: a particular failure, a particular desk, a particular moment.

## Before anything is used: licence and resolution

| Check | Pass | Why |
| --- | --- | --- |
| Licence | Commercial and advertising use allowed; not editorial-only; not NC; attribution text recorded if required | An ad is commercial use; editorial stock cannot sell anything |
| Releases | Recognisable people and private property carry model/property releases (stock), or are generated | A face in an ad implies endorsement |
| Marks | No third-party logo, readable sign, screen or packaging you cannot account for | A stray brand in frame is a claim you did not mean to make |
| Resolution | After the crop to the canvas, the region kept is ≥1080 px wide for 9:16. Total enlargement of source pixels, zooms included: ≤1.3× ideal, 2.0× ceiling, with a mild sharpen (`unsharp=5:5:0.6`) above 1.3× | Upscaled stock goes soft on a phone, and soft reads as cheap; with stock you can usually pick a bigger file instead. The same limit governs the user's own footage (`video-editing`) |
| Credit | A line in `VIDEO.md` for every non-user, non-generated file: source URL, creator, licence, attribution text | Same rule `sound-design` uses for audio |

Video clips are trimmed and re-encoded per `screen-capture` (VP9 WebM at the project fps, a keyframe every 15 frames, a 0.5 s tail) before a scene plays them.

## What makes stock look like stock

| The tell | The fix |
| --- | --- |
| Even, soft, directionless light | Grade it: contrast up, one end warmer or cooler, let a highlight clip |
| Everything in frame, nothing cropped | Crop hard: cut off a corner, a hand, the top of a head |
| A person smiling at a laptop | Do not use it; there is no fix. Cut to the screen instead |
| Perfectly steady | The creep: +3% scale over the shot plus a 4–7 px drift (`ugc-craft`) |
| Held for four seconds | Hold it 30–60f. Stock survives a short cut and dies in a long one |
| Clean, empty surfaces | Pick or generate a shot with clutter; real desks have things on them |
| The same colour temperature as the shot before | Let it differ slightly; real footage does |

The pattern: **grade it, crop it, move it, cut it short.** A shot treated all four ways passes; a shot treated none of them does not.

**Grading** with `ffmpeg`, in the same encode as the seek-safe master (a warm, slightly crushed phone look, light grain baked in):

```
ffmpeg -t 3 -i assets/broll.mp4 -vf "fps=30,colortemperature=temperature=5200,eq=contrast=1.08:saturation=0.9:gamma=0.97,vignette=PI/5,noise=alls=6:allf=t,format=yuv420p,tpad=stop_mode=clone:stop_duration=0.5" -c:v libvpx-vp9 -b:v 0 -crf 28 -g 15 -keyint_min 15 -row-mt 1 -deadline good -cpu-used 4 -an assets/broll-graded.webm
```

Or in the scene: on Three.js a grade in the plane's material (a shader multiplying a warm tint and a contrast curve) or the film's look pass (`three-look`); on HyperFrames or React a filter on the clip's wrapper. Grain in-scene comes from a seeded noise texture per frame, never randomness.

## Prompting for phone-grade material

Generated footage defaults to cinematic, which is exactly wrong here. Prompt against the model's instinct, in this order:

1. **The camera**: "handheld vertical phone video, slight camera shake" (for a still: "phone photo"). It sets everything else.
2. **The light**: "available light", "window light from the left", "overhead kitchen light, slightly underexposed". Never "cinematic lighting" or "golden hour".
3. **The framing**: "off-centre", "the subject slightly cropped", "casual framing".
4. **The room**: a real, specific, untidy place: "a cluttered home desk with a cold coffee and cables".
5. **The action**: one thing already in progress: "hands mid-gesture", never "a person begins to".
6. **Exclusions**: "no text, no logos, no watermark, not cinematic, no lens flare, no slow motion".

> Handheld vertical phone video, slight shake. A cluttered home desk under overhead light, slightly underexposed. Hands mid-gesture over a laptop trackpad, the screen bright and off-centre, a cold mug and a tangle of cables beside it. Casual framing, the top of the laptop cropped. Not cinematic, no lens flare, no slow motion, no text, no logos.

- **A matched set** (failure and relief, three unboxing stages): the same surface, light direction, hand and camera height in every prompt, and the same seed when the model takes one.
- **A product shot** is the exception: a clean shot of the product itself is expected. The phone-grade codes apply to the environment around it.
- **Clips**: ask for 4–5 s and use 1–2; the first and last second of a generated clip are often the weakest.

## Placement against the voice

- **30–60f (1–2 s).** A cut-away is a break in the picture, not a scene.
- **On a stressed word**: the cut-away lands 3–6f after the word that names it starts (the voice motivates the cut), never in a pause, which reads as running out of footage.
- **Back before the sentence ends**: the voice continues over the cut-away and returns to the main shot on its own words (an L cut, `ugc-craft`).
- **Often enough**: in a talking or presenter-led ad, at least one cut-away per 15–20 s of continuous speech, inside `ugc-craft`'s three-second rule for a change on screen.

## Cut-aways that usually work

In order of preference, for a line in the VO:

| The VO says | Cut away to |
| --- | --- |
| A thing (a product, a feature, a place) | That thing, literally: the product in a hand, the UI element, the place |
| A consequence ("I missed the flight") | The evidence of it: the departures board, the empty gate |
| A number the user supplied | The number as type, full frame, on the word |
| A feeling ("finally") | Hands doing the relieved action, never a face acting relief |
| Time passing | The same frame later: the mug empty, the light changed |

## Building it

- **Three.js** (default): stills and clips are planes sized from their real pixels (`three-assets`), clips seeked per frame and never played; the creep is a camera dolly (`three-camera`); crops are the camera's framing or UV offsets on the plane.
- **HyperFrames / React**: `<img>` or `<video>` in a wrapper the timeline scales; crops as the wrapper's bounds.

## Good and bad

- **Bad**: a smiling team around a laptop, held 4 s. **Good**: a 45f graded close-up of hands on a trackpad, cropped through the laptop lid, cut on "late".
- **Bad**: a generated "cinematic office, golden hour" frame. **Good**: "phone photo, overhead light, a cluttered desk, slightly underexposed".
- **Bad**: an editorial-only stock clip in a paid ad. **Good**: a commercial-licence clip, credited in `VIDEO.md`, or a generated one.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The user's material | `save-asset` | Ask before generating anything |
| Brand imagery and logos | `web-research`, `save-asset` | Ask. Never redraw a logo or guess a brand colour |
| Stock | The `freepik` connector | Generate instead; for staged shots it is better anyway |
| Generated clips | A video model through `fal` or `replicate` | Generated stills with a creep: at 1–2 s a moving still reads as a clip |
| Generated stills | `generate-image` | Typography cut-aways: a full-frame line of text is legitimate b-roll |
| Grading, trimming, re-encoding | `ffmpeg` | Grade in the scene's material or wrapper |

## Checks before you finish

1. Every cut-away has a credit line or is the user's or generated; no licence is editorial-only or NC.
2. `capture-frames` on every cut-away: no stray logo, readable sign, watermark or unaccounted-for face; it would pass for a phone shot.
3. Every cut-away lasts 30–60f (longer only with a reason written in `VIDEO.md`) and lands 3–6f after its word starts.
4. The region kept after the crop is ≥1080 px wide (probe the source with `ffprobe` and do the crop arithmetic).
5. Compare each cut-away with the shot before it: not a perfect match in colour and light.
6. No generated person is presented as a real customer, employee or expert.
7. `validate` passes.
