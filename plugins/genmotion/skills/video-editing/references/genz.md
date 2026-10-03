# Gen Z / TikTok-native editing

Read this when the user asks for a fast, native-feeling social edit of their footage ("make it feel like TikTok", "Gen Z style", "CapCut style"). The goal is to feel like a person, not an ad: fast, a little raw, dense with information, and worth a rewatch. Shared caption and zoom specs are `ugc-craft`'s; this file says how a footage edit uses them, what is current, and what has aged.

## When not to use it

- LinkedIn, B2B, finance, health or anything where trust is the product: use the clean talking-head style.
- Long-form YouTube: borrow one or two moves (a jump zoom, a text pop), never the whole kit.
- Sad, serious or apologetic content: the kit reads as mockery.
- When the footage is polished brand film: don't fake rawness on top of it.

## The hook (under 1 s)

- **Frame 0 already has a face, motion and text.** Start mid-action or mid-sentence ("…and that's why I quit").
- Hook text at y 270–450, 5–10 words, 72–90 px (never smaller than the captions): the native text box or bold white with a black stroke. The box takes whichever polarity contrasts with what is behind it: black text on a white box over a dark or busy ground, white text on a black box over a white wall or a bright sky.
- Hook shapes: a contrarian claim, "POV:", "Nobody tells you…", the result first ("I made $X…"), a question, a count ("3 things…"), a visual shock.
- The spoken hook and the text hook say the same thing.
- **No transcript:** write the hook text as a true question or a POV built only from public facts (the video's title, who the speaker is): "How did a first-time founder get her first 100 customers?" when the title is about early sales, or "POV: a pastry chef explains why your bread is flat". Never a bare title label ("<Name>'s story" is a label, not a hook), and never words the speaker may not have said.
- Frame 0 is the cover too: centre the face on the readable column (x ≈ 480) at the hook's framing.

## Density

| Element | Number |
|---|---|
| Hook (first 3 s) | ≥2 visual events, the first by 1.0 s (a step, a pop, a cut); frame 0 already has face, motion and text |
| Cut or step | every 0.7–2 s (21–60 f at 30, 17–48 f at 24) |
| Pattern interrupt | every 2–4 s: a jump zoom, an angle swap, b-roll, a meme-style cutaway, a text pop, a sound |
| Any stretch with no visual change | never over 2.5 s (75 f at 30, 60 f at 24) |
| Variation | intervals vary at least 2× (e.g. 0.6–2.4 s) and use ≥3 kinds of change (size step, crop shift, speed ramp, freeze, text pop, flash); never a metronome |
| Joins and pauses | the Gen Z row of the main skill's pause table (Step 5): in −0.03 s, out +0.05 s, a join gap of about 0.08 s; in a monologue only pauses ≥0.25 s are cut |
| Length | 15–45 s; completion matters more than length |

**Never a metronome.** One move every 2.0 s for 35 s passes the 2.5 s ceiling and still reads as a template: the eye learns the beat and stops looking. Group changes into fast runs (2–3 changes 0.5–1 s apart) around the lines that matter, and let a line that needs reading hold 2–2.5 s. The density check in `ffmpeg-recipes.md` §11 prints the interval spread; it should pass the variation thresholds there, not only the gap ceiling.

**Picture cuts need not be audio cuts.** A tightly delivered source has few pauses (one 114 s talk had ten usable ones), so audio-driven cuts alone give an average shot of 4 s, not 0.7–2. On a continuous take, a hard step mid-sentence on a word onset is the native "camera switch": scale 1.0 ↔ 1.2, or a crop shift of 80–120 px left or right, no ease (on a low-res source the crop shift, alone or with a 1.06–1.08 size change, because base × step ≤ 2.0). Use these whenever the speech map gives fewer cuts than the table. After the paper edit, list every visual change by frame and fill every gap over 2.5 s with a picture-only step, a text pop or a sound (the density check in `ffmpeg-recipes.md` §11). On a single-angle source at 720p or below the crop shift is the workhorse, because it costs no enlargement (`ffmpeg-recipes.md` §6: base × step ≤ 2.0).

**Without words, interrupts are still available:** an icon or emoji pop on a gesture, a freeze + shutter on a look, a speed ramp across a pause, a picture-only step on the loudest syllable onset (the RMS envelope, `podcast.md`'s recipe), a 2-word identity or topic pop built from public facts.

### The no-captions draft (no transcript, the user said go)

The main skill's Step 3 policy applies; this is how the edit itself changes, because a muted viewer gets no captions to read:

- **The hook stays as a persistent header** for the whole film: y 270–450, ≤2 lines, the native box. It is the only line a muted viewer can read, so it never leaves.
- **A wordless cue at least every 6–8 s** between the size steps and crop shifts: a gesture emoji pop, a freeze + shutter, a 3–5× speed ramp across a pause, a second identity or topic pop. A muted viewer must never go 8 s without a new element on top of the picture.
- **No b-roll**: without words nothing can be literal to them, and unrelated stock reads as filler. Use the interrupts above.
- **The peak is provisional**: put it on the loudest onset (the RMS envelope), mark it provisional in `VIDEO.md`, and move it once the words arrive.
- **The layout has no caption band**: `ffmpeg-recipes.md` §6 gives the numbers for a single 720p speaker (plate from y 450, eyes y 600–800, nothing load-bearing below y 1450, the bands under the UI not pure white).

## The moves (numbers at 30 fps; at 24 fps multiply frame counts by 0.8)

- **Jump zoom** on cuts and **punch-in** on stressed words: `ugc-craft`'s numbers (1.0 ↔ 1.2 on the cut frame; 1.0 → 1.12 over 8 f, ≤4 per 30 s). A footage edit may go to 1.3 on a beat drop if the source is 4K.
- **Zoom bump** on a beat: 1.0 → 1.15 → 1.08 over 2 + 4 frames, holding until the next cut: `interpolate(frame, [f, f + 2, f + 6], [1, 1.15, 1.08], Easing.easeOut)` on the plate (`footage-in-scene.md`).
- **Shake** on impacts: 4–8 frames, 10–30 px, decaying, deterministic (a sum of sines with an exponential decay; no randomness).
- **Speed ramps:** 1× → 3–5× → 1× across a boring stretch or into a transition, eased over 6–12 frames. In practice: stepped segments in the conform (§8 of `ffmpeg-recipes.md`), 3–5 steps.
- **Flash frame:** a 1–2 frame flash on the biggest impact, once or twice per video. **It must contrast with the picture**: white on dark footage, black on bright footage (a white wall, daylight: mean luma over ~180). Tested: a white flash on a white-wall plate read as a wash, not a hit. If neither contrasts, use the zoom bump alone. `check` may warn that the flash frame is a single flat colour; that is expected for a declared flash.
- **Freeze frame + camera-shutter sound** for a "wait, look at this" beat: hold one frame 15–30 f with a 1.05 scale.

## Captions and identity

Word pop per `ugc-craft` (1–3 words, ALL CAPS Bold caption allowed up to 110 px, 8 px stroke, one highlight colour, 4 f pop), placed per `captions.md` (centred at y 1160, inside x 120–840). Keyword groups may take an emoji (0–1 per group, 1.2× text size).

**No lower third.** A name-and-role bar reads as LinkedIn. Identity is a text pop in the hook band or the caption band, ≥60 px, in the caption style ("she built <the product>"), for 1–2 s, never overlapping the hook.

**Zoom pivot in 9:16:** scale the plate about a point at the bottom of the caption band (x 540, y ≈ 1150), so a zoom pushes the face *up and away* from the text; scaling about the eyes pushes the mouth down into the captions. Re-centre the face on x ≈ 480 per segment.

## Sound vocabulary

| Sound | Use |
|---|---|
| pop / bubble | a text pop |
| click / keyboard | UI on screen |
| ding / cash register | a number, money |
| record scratch | the twist |
| camera shutter | screenshot or freeze frame |
| riser into a bass drop | the reveal |
| vine boom | ironic shock, rarely, if at all |

3–8 sounds per 30 s at most, each 6–12 dB under the voice peak. Generate them with `sfx` (describe the sound, not the picture); without `sfx`, synthesise the pop, tick and hit you need (`sound-design`'s `references/sfx-cues.md`, tested recipes, labelled placeholders). Zero sounds is not an option for this format. Transitions and b-roll entrances stay silent: never a whoosh (`sound-design`'s ban). Trending audio is licensed per platform and added in the app: export with original audio plus your music bed, and tell the user which moment a trending sound would replace.

**The sound plan decides who cuts** (`sound-design`, sound plan):

- **Over speech** (a talking head, the usual case): the speech decides every cut. The bed is lo-fi, house or phonk at 0.14–0.2, low-passed at 6–8 kHz, so it is heard on a phone but never masks a word (14–20 LU under the voice). It drops to silence under the hook line and the payoff and returns on the next cut.
- **Music-led** (a montage without speech): pick the track first, then cut on its beats or half bars, the big changes on bar 1.

Both master at −14 LUFS / −1 dBTP.

## Loops and endings

- End on a line that completes the opening line, or on a frame that matches frame 0, so the replay is seamless. Rewatches count.
- Or end on the payoff and cut instantly: no outro, no 5 s "follow me" card.
- **An end card closes on the hook's question** (or its answer, once you have the words), so the last frame sends the viewer back to the first: the reason to rewatch. A card that says only "Full story: <channel>" is a credit, not an ending, and a feed card is not clickable.
- **Licence credit**: in the post's description where the licence allows it (most CC BY terms accept credit "reasonable to the medium"); otherwise a small line on the end card under the hook question, never instead of it.
- **Out point of a monologue** (no question → answer units): end on a sentence end, not an answer. With words, the last full stop before the target length; without them, a pause of ≥0.5 s, or if none exists in the last 10 s, the longest pause whose pitch falls there, disclosed as a possible mid-thought ending (`podcast.md`, No transcript).

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
- Library jazz, ukulele or "corporate upbeat" beds: they read as 2010s YouTube. If that is all you have, source a better one per `sound-design` Music (search by genre: phonk, house, lo-fi) before falling back to no bed and more sound design.
- A corporate lower third (name bar + role line).
- The frame laid out around captions that are not there (an empty lower 40%).

## Procedure

1. Find the hook in the transcript: the most surprising or useful sentence. It goes first. No transcript: follow the main skill's Step 3 policy, prefer one continuous excerpt that ends on a falling, sentence-final pause over a splice of sections you have not heard, write a public-facts hook (above), and build the no-captions draft (above).
2. Paper edit to 15–45 s: hook → stakes → 2–3 beats → payoff/loop.
3. Conform with the Gen Z join padding (main skill, Step 5) (§5); stepped speed ramps where the footage drags.
4. Decide the sound plan: over speech (bed under it) or music-led (beat grid first: no track supplied → source one per `sound-design` Music and fit the cuts to its grid with `sound-design`'s `references/beat-sync.md`).
5. Motion layer: hook text, word-pop captions, jump zooms or crop shifts on alternate segments, picture-only steps until no gap exceeds 2.5 s and the rhythm varies, 1–2 punch-ins (only where base × 1.12 ≤ 2.0), one flash at most, contrasting.
6. SFX pass from the vocabulary (synthesised if need be), then the mix per `sound-design` (−14 LUFS).
7. Measure: frame 0 has face + text and the first visual event is by 1.0 s; no pause over 0.25 s left between words (`silencedetect=noise=-45dB:d=0.25` on the dialogue WAV); the density check prints no gap and passes the variation thresholds; count the sounds per 30 s (3–8); the end card repeats or answers the hook.
