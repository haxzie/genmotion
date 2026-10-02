# Gen Z / TikTok-native editing

Read this when the user asks for a fast, native-feeling social edit of their footage ("make it feel like TikTok", "Gen Z style", "CapCut style"). The goal is to feel like a person, not an ad: fast, a little raw, dense with information, and worth a rewatch. Shared caption and zoom specs are `ugc-craft`'s; this file says how a footage edit uses them, what is current, and what has aged.

## When not to use it

- LinkedIn, B2B, finance, health or anything where trust is the product: use the clean talking-head style.
- Long-form YouTube: borrow one or two moves (a jump zoom, a text pop), never the whole kit.
- Sad, serious or apologetic content: the kit reads as mockery.
- When the footage is polished brand film: don't fake rawness on top of it.

## The hook (under 1 s)

- **Frame 0 already has a face, motion and text.** Start mid-action or mid-sentence ("…and that's why I quit").
- Hook text at y 270–450, 5–10 words, large: a white box with black text (the native text style) or bold white with a black stroke.
- Hook shapes: a contrarian claim, "POV:", "Nobody tells you…", the result first ("I made $X…"), a question, a count ("3 things…"), a visual shock.
- The spoken hook and the text hook say the same thing.

## Density

| Element | Number |
|---|---|
| Cut | every 0.7–2 s (21–60 f) |
| Pattern interrupt | every 2–4 s: a jump zoom, an angle swap, b-roll, a meme-style cutaway, a text pop, a sound |
| Gaps between words | ≤50–100 ms: remove every breath and pause |
| Length | 15–45 s; completion matters more than length |

## The moves (numbers at 30 fps)

- **Jump zoom** on cuts and **punch-in** on stressed words: `ugc-craft`'s numbers (1.0 ↔ 1.2 on the cut frame; 1.0 → 1.12 over 8 f, ≤4 per 30 s). A footage edit may go to 1.3 on a beat drop if the source is 4K.
- **Zoom bump** on a beat: 1.0 → 1.15 → 1.08 over 2 + 4 frames, holding until the next cut: `interpolate(frame, [f, f + 2, f + 6], [1, 1.15, 1.08], Easing.easeOut)` on the plate (`footage-in-scene.md`).
- **Shake** on impacts: 4–8 frames, 10–30 px, decaying, deterministic (a sum of sines with an exponential decay; no randomness).
- **Speed ramps:** 1× → 3–5× → 1× across a boring stretch or into a transition, eased over 6–12 frames. In practice: stepped segments in the conform (§8 of `ffmpeg-recipes.md`), 3–5 steps.
- **Flash frame:** a 1–2 frame white flash on the biggest impact, once or twice per video.
- **Freeze frame + camera-shutter sound** for a "wait, look at this" beat: hold one frame 15–30 f with a 1.05 scale.

## Captions

Word pop per `ugc-craft` (1–3 words, ALL CAPS Bold caption allowed up to 110 px, 8 px stroke, one highlight colour, 4 f pop), placed per `captions.md` (centred at y 1160, inside x 120–840). Keyword groups may take an emoji (0–1 per group, 1.2× text size).

## Sound vocabulary

| Sound | Use |
|---|---|
| whoosh | transitions, b-roll in |
| pop / bubble | a text pop |
| click / keyboard | UI on screen |
| ding / cash register | a number, money |
| record scratch | the twist |
| camera shutter | screenshot or freeze frame |
| riser into a bass drop | the reveal |
| vine boom | ironic shock, rarely, if at all |

3–8 sounds per 30 s at most, each 6–12 dB under the voice peak. Generate them with `sfx` (describe the sound, not the picture). Trending audio is licensed per platform and added in the app: export with original audio plus your music bed, and tell the user which moment a trending sound would replace.

## Loops and endings

- End on a line that completes the opening line, or on a frame that matches frame 0, so the replay is seamless. Rewatches count.
- Or end on the payoff and cut instantly: no outro, no 5 s "follow me" card.

## What is current (2025–2026)

Restraint plus craft: clean captions with one highlight colour; fewer, purposeful sounds; real faces and lo-fi honesty (phone-shot, natural light is fine); fast but legible pacing; original audio; text-forward hooks; a documentary, vlog energy.

## What has aged (avoid)

- A vine boom or "bruh" on every beat.
- Glitch, RGB-split, spin or 3D-flip transitions on everything.
- Emoji showers; rainbow karaoke captions with three colours.
- Zooming on every single word.
- Stale trending sounds; "wait for it" bait that doesn't pay off.
- Heavy beat-sync template feel (every cut on every beat for 30 s).
- Unrelated split-screen filler (gameplay under a talking head) to hold attention: platforms down-rank unoriginal content and viewers read it as low effort.
- An AI voice over stock footage pretending to be a person.

## Procedure

1. Find the hook in the transcript: the most surprising or useful sentence. It goes first.
2. Paper edit to 15–45 s: hook → stakes → 2–3 beats → payoff/loop.
3. Conform with gaps ≤100 ms (§5); stepped speed ramps where the footage drags.
4. Pick the music (if any) and build the beat grid; land cuts and zoom bumps on beats.
5. Motion layer: hook text, word-pop captions, jump zooms on alternate segments, 1–2 punch-ins, one flash at most.
6. SFX pass from the vocabulary, then the mix per `sound-design` (−14 LUFS).
7. Measure: frame 0 has face + text; no gap over 100 ms between words (`silencedetect=noise=-45dB:d=0.1` on the dialogue WAV); count the sounds per 30 s.
