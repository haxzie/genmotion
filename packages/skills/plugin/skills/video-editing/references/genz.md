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
- **No transcript:** write the hook text as a true question or a POV built only from public facts (the video's title, who the speaker is): "How did the founder of a free online school get into college?" or "POV: the guy who taught you algebra explains admissions". Never a bare title label ("<Name>'s college admissions story" is a label, not a hook), and never words the speaker may not have said.
- Frame 0 is the cover too: centre the face on the readable column (x ≈ 480) at the hook's framing.

## Density

| Element | Number |
|---|---|
| Cut | every 0.7–2 s (21–60 f) |
| Pattern interrupt | every 2–4 s: a jump zoom, an angle swap, b-roll, a meme-style cutaway, a text pop, a sound |
| Any stretch with no visual change | never over 2.5 s (75 f) |
| Gaps between words | ≤50–100 ms: remove every breath and pause |
| Length | 15–45 s; completion matters more than length |

**Picture cuts need not be audio cuts.** A tightly delivered source has few pauses (one 114 s talk had ten usable ones), so audio-driven cuts alone give an average shot of 4 s, not 0.7–2. On a continuous take, a hard step mid-sentence on a word onset is the native "camera switch": scale 1.0 ↔ 1.2 (or 1.12 on a low-res source), or a crop shift of 80–120 px left or right, no ease. Use these whenever the speech map gives fewer cuts than the table. After the paper edit, list every visual change by frame and fill every gap over 75 f with a picture-only step, a text pop or a sound (the density check in `ffmpeg-recipes.md` §11).

**Without words, interrupts are still available:** an icon or emoji pop on a gesture, a freeze + shutter on a look, a speed ramp across a pause, a picture-only step on the loudest syllable onset (the RMS envelope, `podcast.md`'s recipe), a 2-word identity or topic pop built from public facts.

## The moves (numbers at 30 fps)

- **Jump zoom** on cuts and **punch-in** on stressed words: `ugc-craft`'s numbers (1.0 ↔ 1.2 on the cut frame; 1.0 → 1.12 over 8 f, ≤4 per 30 s). A footage edit may go to 1.3 on a beat drop if the source is 4K.
- **Zoom bump** on a beat: 1.0 → 1.15 → 1.08 over 2 + 4 frames, holding until the next cut: `interpolate(frame, [f, f + 2, f + 6], [1, 1.15, 1.08], Easing.easeOut)` on the plate (`footage-in-scene.md`).
- **Shake** on impacts: 4–8 frames, 10–30 px, decaying, deterministic (a sum of sines with an exponential decay; no randomness).
- **Speed ramps:** 1× → 3–5× → 1× across a boring stretch or into a transition, eased over 6–12 frames. In practice: stepped segments in the conform (§8 of `ffmpeg-recipes.md`), 3–5 steps.
- **Flash frame:** a 1–2 frame flash on the biggest impact, once or twice per video. **It must contrast with the picture**: white on dark footage, black on bright footage (a white wall, daylight: mean luma over ~180). Tested: a white flash on a white-wall plate read as a wash, not a hit. If neither contrasts, use the zoom bump alone. `check` may warn that the flash frame is a single flat colour; that is expected for a declared flash.
- **Freeze frame + camera-shutter sound** for a "wait, look at this" beat: hold one frame 15–30 f with a 1.05 scale.

## Captions and identity

Word pop per `ugc-craft` (1–3 words, ALL CAPS Bold caption allowed up to 110 px, 8 px stroke, one highlight colour, 4 f pop), placed per `captions.md` (centred at y 1160, inside x 120–840). Keyword groups may take an emoji (0–1 per group, 1.2× text size).

**No lower third.** A name-and-role bar reads as LinkedIn. Identity is a text pop in the hook band or the caption band, ≥60 px, in the caption style ("the guy from your algebra videos"), for 1–2 s, never overlapping the hook.

**Zoom pivot in 9:16:** scale the plate about a point at the bottom of the caption band (x 540, y ≈ 1150), so a zoom pushes the face *up and away* from the text; scaling about the eyes pushes the mouth down into the captions. Re-centre the face on x ≈ 480 per segment.

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

3–8 sounds per 30 s at most, each 6–12 dB under the voice peak. Generate them with `sfx` (describe the sound, not the picture); without `sfx`, synthesise the pop, whoosh and hit you need (`sound-design`'s `references/sfx-cues.md`, tested recipes, labelled placeholders). Zero sounds is not an option for this format. Trending audio is licensed per platform and added in the app: export with original audio plus your music bed, and tell the user which moment a trending sound would replace.

**The sound plan decides who cuts** (`sound-design`, sound plan):

- **Over speech** (a talking head, the usual case): the speech decides every cut. The bed is lo-fi, house or phonk at 0.14–0.2, low-passed at 6–8 kHz, so it is heard on a phone but never masks a word (14–20 LU under the voice). It drops to silence under the hook line and the payoff and returns on the next cut.
- **Music-led** (a montage without speech): pick the track first, then cut on its beats or half bars, the big changes on bar 1.

Both master at −14 LUFS / −1 dBTP.

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
- Library jazz, ukulele or "corporate upbeat" beds: they read as 2010s YouTube. If that is all you have, use no bed and more sound design.
- A corporate lower third (name bar + role line).
- The frame laid out around captions that are not there (an empty lower 40%).

## Procedure

1. Find the hook in the transcript: the most surprising or useful sentence. It goes first. No transcript: follow the main skill's Step 3 policy, prefer one continuous excerpt that ends on a falling, sentence-final pause over a splice of sections you have not heard, and write a public-facts hook (above).
2. Paper edit to 15–45 s: hook → stakes → 2–3 beats → payoff/loop.
3. Conform with gaps ≤100 ms (§5); stepped speed ramps where the footage drags.
4. Decide the sound plan: over speech (bed under it) or music-led (beat grid first).
5. Motion layer: hook text, word-pop captions, jump zooms on alternate segments, picture-only steps until no gap exceeds 75 f, 1–2 punch-ins (on 1.0 segments only for low-res sources), one flash at most, contrasting.
6. SFX pass from the vocabulary (synthesised if need be), then the mix per `sound-design` (−14 LUFS).
7. Measure: frame 0 has face + text; no gap over 100 ms between words (`silencedetect=noise=-45dB:d=0.1` on the dialogue WAV); the density check prints no gap; count the sounds per 30 s (3–8).
