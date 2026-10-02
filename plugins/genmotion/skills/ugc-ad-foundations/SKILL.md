---
name: ugc-ad-foundations
description: "The shared ground under every UGC-style social ad: the codes that read as an ad versus a person, hook / body / CTA anatomy with frame budgets per length, the one safe-zone and caption-position spec for 9:16, 4:5 and 1:1, the shared UGC numbers (change interval, VO budget, bed level, loudness), the four looks, hook variants, and the claims rules every format inherits. Load it with exactly one UGC format owner (screen demo, green screen, unboxing, problem-solution). Not a format on its own."
---

# UGC ad foundations

A UGC ad is an ad that does not look like one. Everything below serves that idea, and every number here is the one the four UGC owners (`ugc-screen-demo`, `ugc-green-screen`, `ugc-unboxing`, `ugc-problem-solution`) and the craft skills (`ugc-hooks`, `ugc-scripting`, `ugc-craft`, `ad-qa`) use. Where a number is shared with the rest of the pack it comes from `direction`, `motion-language` or `sound-design`; this skill only states the UGC deviations.

Frames are at 30 fps (at 60 fps double them).

## When to use

- With exactly one UGC format owner, after `direction` and before building.
- When a user asks what makes a TikTok, Reels, Shorts or Meta ad work, how long it should be, or where text may go.
- When a finished ad "looks like an ad".

Not for: a launch film (`launch-playbook`), a feature announcement (`announce-feature`), a 16:9 landing-page piece, or cutting footage the user filmed themselves (`video-editing` owns that, including talking-head and Gen Z edits; this skill's safe zones and claims rules still apply there).

## Why the format works, and what it is not

A viewer's first job on a feed is to sort ad from not-ad, and they do it on texture, framing and cadence long before they hear a word. Practitioners consistently report that creator-style creative out-holds polished spots in the feed; treat that as the working assumption, not a measured fact you can quote to the user.

| Reads as an ad in half a second | Reads as a person |
| --- | --- |
| Even, directionless key light; seamless background | Available light, a real room, a window blowing out |
| Centred, tripod-still | Slightly off-centre (3–6% off the axis), a slow drift, a reframe mid-sentence |
| A bright, performed read | The problem said flatly, the way you would say it to a friend |
| Crossfades, graphic wipes, a spinning logo | Hard cuts on a word or a sound |
| Logo in the first second, a watermark throughout | Product in context early; name card only at the end |
| A designed lower third | Burned-in captions in the platform's own idiom |

Do not read this as "make it bad". Make it specific: imperfection that matches how the thing was plausibly filmed reads as true; imperfection with no intent reads as cheap.

## The anatomy, in frames

Google's ABCD framing for video ads (Attract, Brand, Connect, Direct) maps onto three parts. Spend the most effort on the first.

- **Hook** (Attract): the first 1.5–3 s. Visual, verbal and rhythm arrive together; the frame at 0.5 s (frame 15) already shows it. `ugc-hooks` owns it.
- **Body** (Brand + Connect): one benefit, demonstrated. The product or its UI is in frame by 3–4 s in context, never as a logo card (exception: `ugc-problem-solution` holds the product back until its turn, at most 7 s, and says so in the Direction block). `ugc-scripting` owns the words.
- **CTA** (Direct): the last 3–5 s, said as a recommendation, shown three ways at once (spoken, on-screen text, a visual cue such as a tap or a cursor). The CTA text is legible for at least 60f.

| Length | Hook | Body | CTA | VO words at 2.5 w/s | Beats |
| --- | --- | --- | --- | --- | --- |
| 6–10 s | 0–60f | 60–240f | last 60f | 13–22 | 3 |
| 15 s (450f) | 0–75f | 75–360f | 360–450f | ≤35 | 4–6 |
| 30 s (900f) | 0–90f | 90–780f | 780–900f | ≤73 | 7–10 |
| 45 s (1350f) | 0–90f | 90–1200f | 1200–1350f | ≤110 | 10–14 |
| 60 s (1800f) | 0–90f | 90–1650f | 1650–1800f | ≤148 | 13–18 |

VO budget: the VO starts 5–8f in and ends ≥15f before the last frame, so `words ≤ 2.5 × (seconds − 0.7)`. UGC ads end on a spoken CTA rather than a silent logo hold, which is the one deviation from `direction`'s 1.5 s VO-free tail.

## The shared UGC numbers

Owners cite these and only state deviations.

| Thing | Value | Why |
| --- | --- | --- |
| Readable area, 9:16 (1080×1920) | x 120–840, y 270–1210. Hard limit for every word, logo, face and CTA | The union of TikTok's right rail and bottom band and Reels' top band (`direction` → `references/pacing.md`) |
| Hook line | y 270–450, ≤7 words, legible by frame 6 | Just under the top UI, where the eye lands first |
| Captions | One line, centred at y 1160 (60% down), inside y 1110–1210; grows upward to y 1040 if it needs two lines | Above every platform's bottom band, below the face. Full spec in `ugc-craft` |
| Face | Eyes at y 500–750, face centre about 40% across (x ≈ 430) | Upper third, clear of the right rail |
| CTA, price, offer | Centre or centre-left, inside the readable area, never bottom-right | Bottom-right is under the action rail |
| 4:5 (1080×1350) | Margins 54–86 px; key content inside the central 1080×1080 (y 135–1215) | Feed previews may crop to 1:1 |
| 1:1 (1080×1080) | Margins 54–86 px | |
| Change interval | Nothing held more than 90f (3 s) without a change; hook shots ≤36f (1.2 s) | Feed viewers leave on stillness; `ugc-craft` has the cadence table |
| Smallest read text | Captions 70–96 px; UI or source text that must be read ≥34 px; nothing meaningful under 24 px | At 1080 wide on a phone held at arm's length |
| Music bed under VO | 0.12 (−18.4 dB) | Inside `sound-design`'s 0.1–0.18 UGC range; talk must win |
| Music with SFX, no VO | 0.5–0.6 (−6 to −4.4 dB); music alone 1.0 | Per `sound-design` |
| Master | −14 LUFS integrated, ≤ −1 dBTP, frame 1 audible | Per `sound-design`; measure the export |
| Moves | Jump zoom, punch-in and focus push, defined once in `ugc-craft` | One name per move |

**Design for mute.** Feeds autoplay muted. If the first three seconds do not communicate with the sound off, the ad is over. Every spoken line is captioned; sound is the reward for unmuting, never the only carrier of a claim.

## Direction defaults for UGC ads

When `direction` asks for the Direction block, a UGC ad usually writes:

- **Placement**: feed, 9:16, sound off first. Ask for 4:5 and 1:1 cut-downs only if the user names Meta feed or LinkedIn.
- **Energy curve**: social ad, front-loaded: hook at 8 by frame 15, a micro-peak every 1–3 s, one bigger peak on the proof or the reveal, CTA calm in the last 3–4 s.
- **Pacing**: High in the hook (new information every 18–30f), Medium in the demonstration (30–50f).
- **Transitions**: the workhorse is a **hard cut on a word or a sound transient**. This is a deliberate deviation from the house grammar: in a UGC ad the visible jump cut is the native code. The signature is one motivated move at the turn or payoff (a focus push into the thing that changed, a persisting cursor or hand). No crossfades, ever.
- **Sound**: VO-led when there is narration, otherwise sound-off-first with SFX carrying the events; bed 0.12 under VO.
- **Memorable moment**: the frame where the product does the one thing (the result appears, the price lands, the lid comes off, the problem disappears).

## The four looks

Pick one look per ad before building; `references/frame-presets.md` has each one's palette, type, caption treatment and how to build it on Three.js. One ad never switches looks.

| Look | For |
| --- | --- |
| Native | The default. Phone-shot texture, system-sans captions, no brand chrome until the end |
| Bold caption | Word-by-word captions, heavy stroke, a loud hook-led cut |
| Clean demo | Screen-led. The interface is the star; type stays out of its way |
| Camcorder | Retro handheld: grain, a timestamp, soft chroma bleed. Nostalgia or a pattern interrupt |

Keep the look's values in one place (a `components/look.ts` module on Three.js, shared tokens on HyperFrames or React) so every scene reads the same numbers.

## Variants

One brief should produce a small family, not one file. Vary **hooks first**: they carry the most variance and are the cheapest to swap. Build the full ad once, then make two more hooks from different families, changing nothing else. `ugc-hooks` → "Hook variants" has the build pattern. Bodies and CTAs come second, and only once a hook has been chosen.

## Claims: the line you do not cross

A UGC ad is a person saying something, which makes a false claim in one worse than a false claim in a banner. These are the rules every UGC owner and `ad-qa` check against:

1. Never write words as said by a named real person unless the user supplied the words and the name.
2. Never state a number, rating, review count, timeframe or result the user has not given you. "Sold out twice" and "4.9 stars" are facts or nothing.
3. A before-and-after implies a typical result. Do not imply it unless the user says it is typical.
4. A synthetic presenter is fine; one presented as a specific real customer, employee or expert is not.
5. A rebuilt or mocked UI shows only features that exist. A mocked page carrying a real company's name shows only what that company actually publishes.
6. A claim about a competitor needs a source the user gave you; comparing on your own product's facts is fine.

If the brief asks for something you cannot source, write a bracketed placeholder ("[N] hours saved") and tell the user in one line. Never resolve it by guessing.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Narration | `pick-voice` then `voiceover` | A caption-led silent cut; many strong UGC ads have no voice at all |
| A presenter | `ai-presenter` | A faceless format: `ugc-screen-demo`, presenter-free `ugc-green-screen`, hands-only `ugc-unboxing` |
| Stills and cut-aways | `save-asset` for the user's own, `generate-image` for the rest; `stock-and-broll` | Typography and rebuilt UI carry a surprising amount |
| Sound | `sfx`, `music` | Per `sound-design`'s ladder; never a silent cut |
| Looking at the result | `capture-frames` | None |

## Checks before you finish

Run `ad-qa` in full; it is the single QA pass for UGC ads. Before handing over to it, confirm:

1. The Direction block in `VIDEO.md` names the look, the placement and the transitions line above, and the Beats table sums to the length.
2. VO words ≤ `2.5 × (seconds − 0.7)` (count them).
3. `capture-frames` at frame 15 shows the hook; the product or its UI is in frame by frame 120 (or the Direction block says why not).
4. Every claim in the script traces to something the user supplied, or is a bracketed placeholder you have told them about.
5. `validate` passes.
