---
name: ugc-scripting
description: "Writing the body and CTA of a short-form ad: the word budget per runtime and per section, six frameworks (PAS, AIDA, BAB, FAB, 4P, star-story-solution) with the audience each fits, the body's rules, CTAs that read as a recommendation, writing for text-to-speech (numbers, acronyms and names as spoken), and narration written as timed, cue-segmented lines the picture can cut against. Load it when writing or fixing the middle and end of an ad; the opening belongs to ugc-hooks."
---

# UGC scripting

A short-form script is not a shorter long-form script. It is one idea, said once, with the product as the turn. The words decide the length, not the reverse.

Frames are at 30 fps. VO pace and placement follow `direction` (→ `references/pacing.md`); this skill applies them to ads.

## When to use

- Writing the body and close of a UGC or social ad, or restructuring a user's script.
- A script does not fit its runtime, or "sounds like an ad".
- Preparing lines for `voiceover` (pronunciation, cue segmentation).

Not for: the first 1.5–3 s (`ugc-hooks`), the edit rhythm (`ugc-craft`), long-form narration for explainers (`explainer`). If the user's own recording already carries the words, `video-editing` cuts it; do not rewrite what someone said on camera.

## The word budget

Narration runs at 2.5 words/s, conversational, with the pauses a real person leaves. The VO starts 5–8f in and ends ≥15f before the last frame, so `words ≤ 2.5 × (seconds − 0.7)`. A script that overruns gets cut, never read faster.

| Runtime | Total words | Hook | Body | CTA |
| --- | --- | --- | --- | --- |
| 15 s (450f) | ≤35 | 6–7 | 20 | 8 |
| 30 s (900f) | ≤73 | 7 | 50 | 14–16 |
| 45 s (1350f) | ≤110 | 8 | 82 | 18–20 |
| 60 s (1800f) | ≤148 | 8 | 115 | 22–25 |

- Subtract for anything that plays without narration: a 3 s silent reveal costs 7–8 words. Silence is a legitimate line and often the strongest one.
- Per line: a line of N words needs about `13 × N` frames and must end inside its own beat, unless it deliberately bridges a cut.
- Write the budget at the top of the script before writing a word of it.

## The six frameworks

| Framework | Shape | Fits | Avoid when |
| --- | --- | --- | --- |
| **PAS** Problem, Agitate, Solve | Name the failure, make it cost something, turn | The default: cold and warm traffic, any category | The problem is not one the viewer already feels |
| **AIDA** Attention, Interest, Desire, Action | Hook, expand, want, act | 45 s and up, B2B, launch-adjacent ads | Under 30 s, where Interest and Desire collapse into one beat |
| **BAB** Before, After, Bridge | Where you are, where you could be, how | Visible transformations, tools, habit products | The after state is abstract or invisible |
| **FAB** Feature, Advantage, Benefit | What it has, what that does, what it means for you | Technical products to a technical audience | Consumer, where the feature is not the reason |
| **4P** Picture, Promise, Prove, Push | Paint it, claim it, back it, ask | When the user gave you real proof: numbers, names, a demo | No proof; without Prove it is a bare claim |
| **Star, story, solution** | The person, what happened to them, what fixed it | A presenter or founder with a true story | Faceless formats with no character |

Default to PAS: it works cold and fails gracefully (a weak PAS is still legible; a weak AIDA is four fragments). Each UGC owner names the framework it wants. `references/worked-scripts.md` has a 30 s script in every framework for the same product, plus where each one breaks; read it when choosing between two.

## The body's rules

- **One benefit.** Pick the one that would stop the scroll if it were the only thing heard.
- **Demonstrate, do not describe.** Every claim has a matching thing on screen in the same beat. If you cannot show it, cut it.
- **The turn is a moment.** One line (under 7 words), one cut, one sound. Agitation stops by 5 s of runtime.
- **Specifics beat adjectives, and are never invented.** "Eleven minutes" beats "fast" only if the user said eleven minutes. Otherwise write the line without a number, or bracket it ("[N] minutes") and tell the user. The claims rules are in `ugc-ad-foundations`.
- **Say it the way a person says it.** Contractions, fragments, one filler at most. Read it aloud; if it sounds written, rewrite it.
- **Narrate only what the picture cannot show.** "Then you click Generate" is the cursor's job; the VO says why.

## The CTA

Everything before the CTA was built to sound like a person; a pitch-shaped close breaks that character.

| Reads as a recommendation | Reads as a pitch |
| --- | --- |
| "Link's in my bio if you want it." | "Click the link below to get started today." |
| "It's free to try, which is why I did." | "Sign up now and save twenty percent." |
| "I'd start with the template, personally." | "Visit our website to learn more." |
| "If you make videos at all, just go look." | "Don't miss out on this limited offer." |
| "This is the one I use now." | "Join thousands of satisfied customers." |

- Shown three ways in the same 2 s: the spoken line, on-screen text (legible ≥60f), and a visual cue (a tap, a cursor moving to a button, a hand pointing).
- It occupies the last 3–5 s, never less than 2. A CTA in the final half second lands after the viewer has gone.
- An offer or price only if the user supplied it; "link in bio" only for organic posts (a paid ad's CTA button is the platform's).

## Writing for text-to-speech

A TTS voice reads exactly what is written. Write the VO as it should be **said**; the picture shows the exact figure.

| Written for the eye | Written for the voice |
| --- | --- |
| $1.9T | nearly two trillion dollars |
| 10x faster | ten times faster |
| 4.9★ (2,104 reviews) | four point nine stars, from about two thousand reviews (only if supplied) |
| API, SDK, URL | A P I, S D K, U R L (spaced letters); acronyms said as words stay words (SaaS → sass) |
| v2.0 | version two |
| 3–5 min | three to five minutes |
| 24/7 | twenty-four seven |
| GenMotion, product names | spelled as they sound if the voice stumbles ("Gen Motion"); test once and listen |

- Punctuation is direction: a full stop is a pause, an em dash a shorter one, an ellipsis a trailing one. A comma in the wrong place is a breath in the wrong place.
- One sentence per line; under 15 words per sentence. Long sentences flatten the read.
- Delivery notes ("flat", "lift on the turn") go to the voice settings and to `VIDEO.md`, never into the spoken text.

## Lines as cues

Write narration as labelled, timed lines, not a paragraph. Each line names its beat, its frame range, a delivery note and the words, and is **segmented on the cues the picture needs**, so each visual can arrive as the voice names it.

```markdown
Voice: warm, conversational, late 20s · Direction: flat through the problem, lift on the turn only
Budget: 30 s, ≤73 words (written: 68)

1 Hook      0–84f    tired, to a friend   "Three hours. For fifteen seconds of video."
2 Problem   84–180f  still flat           "And it's never the part I want to be doing."
3 Turn      180–216f the only lift        "Then I tried describing it instead."
4 Demo      216–420f matter-of-fact       "Typed what I wanted — | it built the scenes — | I changed the headline twice."
```

- The `|` marks are cue points: the scene builds the matching visual on the frame that word starts (from the VO's word timings).
- Generate one VO clip per line (or per beat), so a line can move without re-generating the rest; place each on track 0 with `place-audio` at its beat's start + 3–8f.
- Line numbers match the beat table rows in `VIDEO.md`. A script whose lines do not map to beats cannot be timed.
- If the user gave a script and said "verbatim", use it word for word: no restructuring, no TTS rewrites without asking.

## Good and bad

- **Bad**: "Our AI-powered platform offers 12 features to streamline your workflow." **Good**: "I typed one sentence. It built the whole video."
- **Bad**: a 30 s script of 96 words, read at 3.2 words/s to fit. **Good**: 70 words, with the 3 s reveal left silent.
- **Bad**: VO "It's 10x faster at $9/mo." **Good**: VO "ten times faster, for nine dollars a month", with "10× · $9/mo" on screen (both only if supplied).

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The narration | `pick-voice` once, then `voiceover` | A caption-led silent cut; the script becomes the caption track |
| Word timings for cues | `voiceover` timings, or `transcribe` on the clip | 2.5 words/s, checked on captured frames |
| Placing lines | `place-audio` | Edit the project's audio list by hand |
| Beat timing against picture | `project-overview` | Read the beat table in `VIDEO.md` |

## Checks before you finish

1. Count the words. `words ≤ 2.5 × (seconds − 0.7)`; each line fits its beat at 13 frames per word.
2. Generate the VO and measure each clip's duration (`project-overview` or `ffmpeg`): no line runs past its beat's end frame.
3. Listen once at pace: every number, acronym and name is said correctly; anything misread is rewritten as spoken.
4. Every claim in the body has something on screen in the same beat proving it; every number traces to the user or is bracketed and flagged.
5. The CTA is spoken, written (≥60f) and shown, in the last 3–5 s.
6. Cue markers in the script match the frames where the visuals arrive (`capture-frames` at two cue frames).
7. `validate` passes after the audio is placed; then `ad-qa`.
