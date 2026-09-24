---
name: stock-and-broll
description: "Sourcing footage and stills that read as real rather than stock: what makes stock look like stock and the treatments that fix it, the sourcing order from the user's own material through connectors to generated, and how to prompt a video or image model for UGC-grade material (handheld, available light, imperfect framing, a real room). Load it when an ad needs cut-aways, a product shot or a staged still nobody has photographed."
---

# Stock and b-roll

The wrong cut-away is worse than no cut-away. A stock shot in a UGC ad is a code that says "ad" as loudly as a logo does.

## When to use

Load this when an ad needs material nobody has: cut-aways behind narration, a staged failure state, a product shot, an environment. Also when a user says finished footage "looks generic" or "looks like stock".

## The sourcing order

Work down this list and stop at the first one that yields something usable.

1. **The user's own.** Always. A badly lit phone photo of the real thing beats a beautiful render of an imaginary one. Ask for it explicitly; people do not volunteer it. In with `save_asset`.
2. **The real brand's own assets.** For a product ad, the product's own site has photography, and it is already on-brand. Research with `WebSearch` and `WebFetch`, pull with `save_asset`. Never redraw a logo; always fetch the real one.
3. **A stock connector.** Freepik for stills and short clips. Good for environments and textures, bad for people.
4. **Generated.** `generate_image` for stills, a video model through the fal or replicate connector for clips. Best for the staged, specific shots stock never has: a particular failure state, a particular desk, a particular moment.

## What makes stock look like stock

Every item here is a fix, not a complaint.

| The tell | The fix |
| --- | --- |
| Even, soft, directionless light | Grade it: lift the contrast, cool or warm one end, let something clip |
| Everything in frame, nothing cropped | Crop in hard. Cut off a corner, a hand, the top of a head |
| A person smiling at a laptop | Do not use it. There is no fix. Cut to the screen instead |
| Perfectly steady | Add a slow drift, 2 to 4 percent over the shot |
| Held for four seconds | Hold it for one. Most stock survives a short cut and dies in a long one |
| Clean, empty surfaces | Pick or generate a shot with clutter in it. Real desks have things on them |
| The same colour temperature as the shot before | Let them mismatch slightly. Real footage does |

The pattern: **grade it, crop it, move it, cut it short.** Any stock shot treated all four ways passes; any shot treated none of them does not.

Photographic treatments, grades and LUTs are their own craft; check for this project's own grading guidance before hand-rolling a CSS filter.

## Prompting for UGC-grade material

Generated footage defaults to cinematic, which is exactly wrong here. You have to prompt against the model's instinct.

**For a video model** (Veo 3.1 or Kling v3 through the fal or replicate connector), the elements that matter, in order:

- **The camera**: "handheld phone video", "slight camera shake", "vertical", "shot on an iPhone". Say it first; it sets everything else.
- **The light**: "available light", "window light from the left", "overhead kitchen light", "slightly underexposed". Never "cinematic lighting", never "golden hour".
- **The framing**: "off-centre", "the subject slightly cropped", "casual framing". Never "perfectly composed".
- **The room**: name a real messy place. "A cluttered home desk with a cold coffee and cables". Specificity is what stops it generating a stock image.
- **The action**: one thing, already in progress. "Hands already mid-gesture", not "a person begins to".
- **What to avoid**: "no text, no logos, no watermark, not cinematic, no lens flare, no slow motion".

A worked example:

> Handheld vertical phone video, slight shake. A cluttered home desk under overhead light, slightly underexposed. Hands mid-gesture over a laptop trackpad, the laptop screen bright and off-centre in frame, a cold mug and a tangle of cables beside it. Casual framing, the top of the laptop cropped. Not cinematic, no lens flare, no slow motion, no text, no logos.

**For a still** through `generate_image`, the same list applies with the camera line becoming "phone photo, available light". Add the composition and palette; leave out anything that implies a studio.

**For a product shot**, the exception: a clean shot of the product itself is fine and expected. The UGC codes apply to the environment around it, not to the object.

## Length and placement

- **One to two seconds.** A cut-away is a break in the visual, not a scene.
- **On a stressed word**, not between sentences. Cutting away on emphasis reads as deliberate; cutting away on a pause reads as running out of footage.
- **Back to the main shot before the sentence ends.** The cut-away must not become the shot.
- **One cut-away per 15 to 20 seconds of speech**, minimum. `ugc-craft` has the cadence.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The user's own material | `save_asset` | Ask for it before generating anything. It is usually there. |
| Stock stills and clips | The `freepik` connector | Generate instead, which for staged shots is better anyway. |
| Generated video clips | The `fal` or `replicate` connector | Generated stills with a slow move on them. At one to two seconds a moving still is indistinguishable from a clip. |
| Generated stills | `generate_image` | Typography cut-aways. A full-frame line of text is legitimate b-roll. |
| Brand imagery and logos | `WebSearch`, `WebFetch`, `save_asset` | Ask. Never redraw a logo, never guess a brand colour. |
| Grades and treatments | This project's own grading guidance, if it has one | A restrained CSS filter on the clip's wrapper. |

## Checks before you finish

1. `capture_frames` on every cut-away. Would you believe a person shot it on a phone?
2. Check each one for a logo, a watermark, a readable sign or a face you cannot account for.
3. Count the cut-away durations. Anything over two seconds is a shot, not a cut-away. Justify it or trim it.
4. Compare a cut-away against the shot before it. If they match perfectly in colour and light, break the match.
5. No generated person is presented as a real customer, employee or expert.
6. This project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
