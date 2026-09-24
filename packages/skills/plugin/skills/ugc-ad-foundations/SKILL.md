---
name: ugc-ad-foundations
description: "The shared ground under every UGC ad: why creator-shot beats polished, the hook / body / CTA anatomy, the three-second rule and the retention numbers behind it, the visual codes that now read as an ad within half a second, platform specs and safe zones for TikTok, Reels, Shorts and Meta feed, the phone-shot frame presets, and the 3x3x3 variant matrix. Load it alongside any ugc-* format skill. Not a format on its own: pick one of those."
---

# UGC ad foundations

A UGC ad is an ad that does not look like one. Everything below serves that single idea.

## When to use

Load this whenever you are making a UGC-style ad, alongside exactly one `ugc-*` format skill. Skip it for a product launch video (`launch-playbook`), a feature announcement (`announce-feature`), or any 16:9 piece meant for a landing page.

## Why this format wins

Creator-shot beats polished on the metrics that decide whether an ad is ever seen: on skippable in-stream, UGC-style creative runs roughly a third better on hook rate and click-through than produced video. Not because the content is better, because the *codes* are different. A viewer's first job on a feed is to sort ad from not-ad, and they do it on texture, framing and cadence long before they hear a word.

Which means the codes that used to say "professional" now say "skip":

| Reads as an ad in half a second | Reads as a person |
| --- | --- |
| Even key light, clean background | Available light, a real room, a window blowing out |
| Centred, tripod-steady, rule-of-thirds | Slightly off-centre, hand-held drift, a reframe mid-sentence |
| A scripted problem stated in a bright voice | The problem said flatly, the way you would say it to a friend |
| Dissolves and motion-graphic wipes | Hard jump cuts, some of them ugly |
| Logo in the first second | Logo at the end, if at all |
| A polished lower third | Burned-in captions in the platform's own default look |

Do not read this as "make it bad". Make it *specific*. Imperfection with no intent reads as cheap; imperfection that matches how the thing was plausibly filmed reads as true.

## The anatomy

Three parts, always, whatever the format.

**Hook, 0 to 3 seconds.** One job: earn second three. Top-performing hooks hold 65 to 70 percent of viewers to the three-second mark; the average is under 30. That gap is not talent, it is structure, and it is built from three things at once: a **visual** (what is on the first frame), a **verbal** (the first five words), and a **rhythm** (a cut or a movement inside the first second). Two out of three is a weak hook. Full library in `ugc-hooks`.

Spend something like 40 percent of your effort here. It is the only part most viewers see.

**Body, 3 seconds to the last five.** One benefit, demonstrated. Not a feature list. The body's shape is a micro-story with the product as the turn: see `ugc-scripting` for PAS, BAB, AIDA and the rest, and the format skill for which shape that format wants.

**CTA, the last 3 to 5 seconds.** It has to sound like a recommendation, not a pitch. "Link's in my bio if you want it" outperforms "Shop now and save 20 percent" in UGC because the second one breaks the character the first 25 seconds built. Reinforce it three ways at once: spoken, on-screen text, and a visual cue (a tap, a cursor, a hand).

## Length

| Length | Use it for | Rough shape |
| --- | --- | --- |
| 6 to 10s | One-idea hook tests, a single satisfying moment | Hook 3s, payoff 4s, CTA 2s |
| 15s | The default social ad | Hook 3s, body 9s, CTA 3s |
| 30s | The workhorse. Room for a real demonstration | Hook 3s, problem 5s, demo 15s, proof 4s, CTA 3s |
| 45 to 60s | Story-led, founder, tutorial, comparison | Hook 3s, setup 8s, body 35s, proof 8s, CTA 5s |

Narration runs at roughly 2.5 words a second. A 30-second ad is about 70 to 75 spoken words. Write to that number; do not write a script and hope.

## Platform specs

| Platform | Canvas | Keep clear |
| --- | --- | --- |
| TikTok | 1080x1920 | Top 12%, bottom 20%, right 14% (the caption block, the action rail) |
| Reels | 1080x1920 | Top 10%, bottom 22% |
| Shorts | 1080x1920 | Top 10%, bottom 18% |
| Meta feed | 1080x1350 (4:5) | Bottom 12% |
| Meta / X square | 1080x1080 | Bottom 10% |

Everything that carries meaning lives in the middle 60 percent of the height. Captions sit at roughly 60 to 70 percent down the frame, above the platform's own UI, never at the true bottom.

**Design for mute.** Most of the audience never hears it. If the first three seconds do not communicate visually, the ad is over. Every spoken line needs a caption.

## The look

Four looks cover almost every UGC ad. Pick one before you start building; `references/frame-presets.md` has each one's full palette, type and caption spec.

| Look | For |
| --- | --- |
| `ugc-native` | The default. Phone-shot texture, system-sans captions, high contrast, no brand chrome until the end card |
| `ugc-bold-caption` | Word-by-word captions with a heavy stroke, for a loud, fast, hook-led cut |
| `ugc-clean-demo` | Screen-recording-led. Device frame, restrained type, the interface is the star |
| `ugc-camcorder` | Retro handheld: grain, a timestamp overlay, slight chroma bleed |

Carry the chosen look's colours, type and caption treatment the way this project keeps its own design values: a shared design-system file if it has one, otherwise consistent inline values repeated scene to scene. The look is the same regardless of what wrote the scene; only where the tokens live differs by project.

## The variant matrix

One brief should produce a family, not a file. Three hooks, three bodies, three CTAs is 27 ads, and the point of it is that you learn which *axis* moved the number rather than which video won.

In practice: build the full ad once, then use `ugc-variants` to emit the hook permutations as separate compositions. Hooks first, always. They are where the variance is.

## Claims, and the line you do not cross

A UGC ad is a person saying something. That is exactly what makes a false claim in one worse than a false claim in a banner.

- Never write a testimonial as if a named real person said it unless the user supplied their words.
- Never state a result, a number, a rating or a timeframe the user has not given you. "Sold out twice" and "4.9 stars from 2,000 reviews" are facts or they are nothing.
- Before-and-after implies a typical result. If the user has not said it is typical, do not imply it.
- A synthetic presenter is fine. A synthetic presenter presented as a specific real customer is not.

If the brief asks for a claim you cannot source, put a bracketed placeholder in the script and say so in one line rather than inventing a number.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Narration | `pick_voice` then `generate_voiceover` | A silent, caption-led cut. Many of the strongest UGC ads have no voice at all. |
| A presenter on camera | `ai-presenter` and the fal connector | Go faceless: `ugc-screen-demo`, `ugc-text-story`, `ugc-asmr-product`, `ugc-listicle` all work with no face. |
| B-roll and stills | `save_asset` for the user's own, `generate_image` for the rest | Typography and screen recordings carry a surprising amount alone. |
| Sound design | `generate_sfx` | Music-only. Do not ship silence under a cut. |

## Checks before you finish

Run all five with `capture_frames`, in order:

1. **First-frame test.** Capture frame 0. Would it stop you? If it is a logo, a black screen or a title card, the ad has no hook.
2. **Mute test.** Capture four frames across the ad. Read only what is on screen. Does the pitch survive?
3. **Safe-zone test.** Nothing that matters is in the top 12 or bottom 20 percent.
4. **Caption test.** Every spoken line is on screen, legible at arm's length, and off the very bottom.
5. **Ad test.** Look at the first second again and ask what code says "ad". Remove it.

Then run this project's own check tool (`validate_composition` or `validate_scene`), and only then say it is done.
