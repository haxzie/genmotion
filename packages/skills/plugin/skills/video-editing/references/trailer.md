# Trailer and teaser from existing footage

Read this when the user has footage (a film, a game capture, an open movie, event or travel footage, a product shoot) and wants a trailer, teaser or promo cutdown. A trailer sells a feeling and a promise, not the plot. Recipe numbers (§) refer to `ffmpeg-recipes.md`. Film footage is usually 24 fps and the project stays at 24 (main skill, Step 1), so the tables below give frames at **24 fps**; at 30 fps multiply by 1.25.

Edited footage has no style family (`direction`): the footage is the look, and the cards follow the rules below.

## Lengths

| Deliverable | Length |
|---|---|
| Teaser | 30–90 s: tone and mystery, one idea, the title at the end, often one sustained musical idea or silence and a single sting |
| Trailer | 1:30–2:30 (theatrical cap 2:30): premise, characters, stakes in three acts |
| Spots / cutdowns | 60, 30, 15 and 6 s, plus 9:16 and 1:1 versions |

## Structure by length

Pick the table for the deliverable's length. **A 60 s or shorter cut has no full Act 1**: the world is shown inside the escalation, a shot or two at a time. Copying the 2:00 table's 35 s of setup into a 60 s teaser leaves 6 s for the climax, the most common structural failure.

### 60 s teaser (24 fps)

| Time | Frames | Beat | Average shot | Sound |
|---|---|---|---|---|
| 0–5 s | 0–120 | **Cold open**: the single most striking shot, one line in near-silence | 1–2 shots | the footage's own room tone, the line 6–10 LU under Act 1's music |
| 5–15 s | 120–360 | **Light setup**: the world and the protagonist, one line, a first card | 2–2.5 s (48–60 f) | music enters sparse |
| ~15 s | ~360 | **Turn**: a hit and 6–15 f of black (the drop) | one hit | music changes section |
| 15–40 s | 360–960 | **Escalation**: conflict and stakes, cards between beats, 1–2 lines | 1.2–1.8 s (29–43 f), accelerating | layers build, risers into hits |
| 40–50 s | 960–1200 | **Climax montage**: the fastest cutting, the best spectacle | 0.33–0.6 s (8–14 f) | music at its peak and still rising, hits on cuts; ends on a riser into a hard stop |
| 50–51 s | 1200–1224 | **Designed silence**: 0.5–1 s of the footage's own recorded room tone, never digital zero | black or the last frame | room tone only |
| 51–54 s | 1224–1296 | **Title** on the biggest hit | hold 2–3 s | braam + sub, tail |
| 54–58 s | 1296–1392 | **Button**: one last line, gag or scare | 1 shot | the line, then a tail |
| 58–60 s | 1392–1440 | **End title / CTA**: the title with the date, platform, URL or "watch the full film" under it; a licence credit may sit on it. The title alone is not a CTA | 2 s card | tail rings out |

### 30 s spot (24 fps)

| Time | Frames | Beat | Average shot |
|---|---|---|---|
| 0–3 s | 0–72 | Cold open: one shot, one line or one sound | 1 shot |
| 3–17 s | 72–408 | Escalation with 1–2 cards; the premise line | 1.2–1.8 s |
| 17–23 s | 408–552 | Climax montage | 8–14 f |
| 23–23.5 s | 552–564 | Room-tone silence | |
| 23.5–27 s | 564–648 | Title on the hit | hold 2–3 s |
| 27–30 s | 648–720 | Button, then the end title or date card (≥1.5 s) | |

15 s = one hook shot + a 5 s climax + title; 6 s = one image + title.

### 2:00 trailer (24 fps)

| Time | Beat | Average shot | Sound |
|---|---|---|---|
| 0:00–0:10 | **Cold open**: one striking moment or line, often in quiet; then a hard cut to black or a logo | 1–3 long shots | near-silence or room tone, one line of dialogue |
| 0:10–0:45 | **Act 1, setup**: the world, the protagonist, normal life; dialogue-driven | 3–5 s (72–120 f) | music sparse, cut on phrase boundaries |
| ~0:45 | **Turn**: the inciting incident; a sound-design hit and black (the drop) | one hit, 6–15 f of black | music changes section |
| 0:45–1:25 | **Act 2, escalation**: conflict and stakes, with title cards between beats | 1.5–2.5 s (36–60 f), accelerating | music builds in layers; cuts on bars; risers into hits |
| 1:25–1:50 | **Act 3, climax montage**: fastest cutting, impacts on beats | 0.3–1 s (8–24 f) | music at its peak; cuts on beats and half-beats |
| 1:50–1:55 | **Title** after a hard stop and silence | hold 2–4 s (48–96 f) | 0.5–1.5 s of room tone, then the biggest hit on the title |
| 1:55–2:00 | **Button**, then the end title or date/CTA card | 1 shot, then a 2–3 s card | the line, then a tail |

Contrast is the engine: the escalation only lands because of the quiet before it. Equal energy throughout is the most common failure. **The climax must peak, not plateau**: its last 2–3 s are the loudest and fastest of the film, and a riser carries it into the hard stop. Measure it: the climax section's integrated loudness is the highest of any section (`ebur128` per section, §11 of `ffmpeg-recipes.md` or `sound-design`), and its last 3 s are louder than its first 3 s. For a product or game, show the unique thing early, then escalate in complexity.

## Selecting shots and lines

- **Rank the logged shots by spectacle** (scale, motion, VFX, a face at its most intense, the image nobody else has). The top 3 take the cold open and the longest climax slots. Static shots go to transitions and short inserts, never to a 4 s hold.
- **Murky shots do not become inserts either.** An 8–14 f insert has to be named at a glance on a phone; a dark one reads as a smear. Every climax insert passes the 150 px read test after the phone grade (`ffmpeg-recipes.md` §8); one that fails is swapped for a brighter shot of the same action (the source usually has one: a lit close-up, a weapon against fire, an eye in the light), not kept for its idea. On an impact the source cannot light, a 1-frame white flash (a 2-frame one at most) carries the hit.
- **Cap any secondary character at 15% of a teaser's runtime.** The protagonist and the conflict carry it.
- **Lines tell premise → conflict → stakes** (6–12 lines in a 2:00 trailer, 2–4 in a teaser). Never reveal the ending. A line works when it is understandable without the scene around it: an unexplained "her" or "it" in the cold open confuses rather than intrigues.
- **Under a "couple of lines" cap**, spend them on the premise and the stakes, then the button. A line that pays off a card (the card sets up a promise, the next line raises the stakes against it) beats an oblique one.
- Read the whole subtitle file or transcript for the window before choosing: the strongest stakes line is often in a scene you did not log as a hero shot.

## Title cards

- **Trailer cards override the house sentence-case rule**: caps or small caps with +0.1 to +0.2em tracking, or a condensed or serif display face (`three-type` notes the exception). Sentence-case product-deck type reads as a launch film, not a trailer.
- 2–5 words per card, large, centred, on black or over a dark plate; 1–2 s (24–48 f) each. Large means numbers: in 16:9, cap height 70–100 px at 1080p; in 9:16, **90–110 px caps at weight 600–700** (a thin 500 serif at 60 px disappears on a phone). If the safe column (600–720 px wide) forces it, re-break into 3 lines rather than shrinking. Cards often build one sentence across the trailer ("THIS FALL" … "ONE CHOICE" … "CHANGES EVERYTHING").
- **Every card is fully legible on its hit frame.** Pre-roll the entrance so it completes on the hit, or put the card on hard (`motion-language`: a card that lands on a hit is the exception to offsetting the first entrance). A blur still clearing on the hit frame misses the hit.
- **Vary the entrances**: never the same entrance three times. A typical set: card 1 rises through a mask, card 2 tracks in, the Act 3 cards are hard-on, hard-off on the beat. The final title gets its own behaviour (a wipe, a light sweep, tracking settling).
- The final title holds 2–3 s (60 s cut) or 2–4 s (2:00); the end card 2–3 s.
- Build them as scenes: type per `three-type`, entrances per `motion-language`. A card is a full scene between footage scenes, or an overlay on a darkened plate.
- **The final frame is the title or the date/CTA card**, never a bare URL card. A URL, platform or licence credit sits under the title on the end card.

## Subtitles

**Feed placements (9:16, 1:1, any autoplay-muted feed): burn a subtitle for every line of dialogue**, asked for or not; a muted viewer otherwise gets the cards and nothing else. Elsewhere, subtitle when the brief asks or the dialogue is in another language. Use the film-subtitle style in `captions.md` (16:9: 44–52 px in the lower letterbox bar of a scope picture; 9:16: 60–64 px in the lower part of the picture, the row there has the positions and the halo). A supplied subtitle file (TTML, SRT, VTT) is re-timed through the cut list there (`captions.md`, Subtitle files); check each cue's start against the waveform, because shipped files can start a cue a few hundred ms late or early.

## Music-driven cutting

1. **Pick the track first.** Trailer music is usually three sections: atmosphere → build → climax/hit. Get it legally (`music` capability, `sound-design`); log the licence. No track supplied → source one per `sound-design` Music and find its grid, sections and hits with `sound-design`'s `references/beat-sync.md`.
2. **A steady pulse**: find the tempo and the first downbeat; build the beat grid in frames (`sound-design`: frames per beat = fps × 60 / BPM, each beat rounded independently). Cut Act 1 on phrases, Act 2 on bars, Act 3 on beats and half-beats. A cut may land one frame early on a beat, never late.
3. **No steady pulse** (orchestral, ambient, an end-credits score): there is no grid to trust. Cut on phrases and swells (`sound-design`, Find the grid: the detector flags such a track WEAK), find the hits in the detector's drop candidates and section map, and **take hits from elsewhere in the track as separate clips** (an isolated hit at 1:15 of the score can be the title hit at 0:51 of the trailer). A score that fades out on its own master cannot end on picture: place one continuous stretch so its dropout falls on the turn, hard-stop it after the climax swell, then place the separate hit clips.
4. Map acts to music sections. Edit the music only at bar lines or phrase ends (10–50 ms crossfades) to make sections fit; with a track that has a real ending, back-time it so the ending lands on the title.
5. **End the montage on a riser into a hard stop**, never on a plateau that just stops. If the track has no riser there, add one (`sfx`, or the synthesised riser in `sound-design`'s `references/sfx-cues.md`) ending on the stop frame.
6. **Shape the loudness as a staircase** with volume automation and peak limiting, not `loudnorm` on the whole cue (it flattens the build): `sound-design`, Headroom and loudness.

## Sound design

- Booms and impacts on every title card and on the turn.
- Risers 2–8 s long, ending exactly on the hit frame.
- Fast transitions get the hit on the cut or nothing; never a whoosh (`sound-design`'s ban).
- Braams for the epic moments, sparingly.
- **Designed silence**: 0.5–1 s of room tone before the biggest hit, never digital zero (it sounds like a dropout on headphones). Harvest it from the source footage's own quietest stretch (never synthesise it: generated noise reads as wind or hiss) and drop it to −45 to −60 dBFS RMS (`ffmpeg-recipes.md` §7, room tone).
- Dialogue: lines laid across cuts as J/L-cuts. When the footage is a finished film mix, the dialogue is not clean: lift lines per the main skill's Step 9 (finished mix, no stems), and keep a cold-open **line** 6–10 LU under Act 1's music, not above it. A cold open built on a **sound** (an impact, a roar, a feed hook's sync sound) is not a line: it sits at Act 1's level or above, or the hook plays near-silent.
- **Pre-mix the trailer to one WAV.** The timeline has 4 lanes and one static volume per clip (`sound-design`), and a trailer has a dozen overlapping pieces with automated levels (bed staircase, lines, ducks, hits, sync sound, room tone). Build them in one ffmpeg graph (`-filter_complex_script`: per piece `atrim`, `asetpts=PTS-STARTPTS`, 10–50 ms `afade`s, `adelay=ms|ms` to its trailer time, levels as `volume='…':eval=frame` expressions; then `amix=inputs=N:normalize=0`, which sums without dividing, and `aresample=48000`; tested), master that, and place the one file at 1.0 on lane 0. Set the climax ramp before the limiter and measure after it: at least 1 LU of the staircase must survive the limiting.
- Levels and the export check per `sound-design`; −14 LUFS online.

## Building it from footage

1. **Log the footage.** Scene detection and one contact sheet per shot change (§2). Tag every shot: hero, emotional, action, world, character, dialogue line, and a spectacle rank 1–5. Put the log in `VIDEO.md`.
2. **Pick the lines** (above).
3. **Lay the dialogue spine** against the music's sections, leaving air early and none in the climax.
4. **Fill picture** per the length's table: the top-ranked shots in the cold open and the climax's longest slots; cut on action; match motion direction across cuts.
5. **Conform** each act's shots into `edit.webm` (§5; for more than ~10 segments from one long source, the one-input-per-segment variant). Speed changes go in the conform as stepped segments (§8). Grade for consistency across sources (§8 colour), then **for the phone**: lift the darks until every insert reads at 150 px wide (§8, dark footage), contrast on the subject, not crushed shadows. Keep a scope (2.39–2.40:1) picture letterboxed 1:1 in 16:9; never enlarge it to fill. For 9:16 fetch the tallest rendition first and reframe per the main skill's Step 7 (full-height where the rows allow, keyed per shot). After any retime, re-run the per-segment check that no segment crosses a source cut (§11, Segments inside one shot).
6. **Motion layer**: title cards, the final title, the end card; optional flash or block-wipe handoffs between acts (`motion-language` handoff catalog; `three-transitions` on Three). A 1–2 frame flash on an impact is a trailer staple, 1–3 times a film; flash rules (contrast, letterbox, never into a bright plate) are `direction`'s.
7. **Sound pass**, then render, then measure:
   - every title card frame coincides with its hit (±1 frame), and the card is legible on that frame (`capture-frames` at the hit frame);
   - the designed silence reads −45 to −60 dBFS RMS, not `-inf` (`astats` over the silence: `ffmpeg -ss 50.0 -t 1.0 -i out.mp4 -vn -af astats -f null - 2>&1 | grep "RMS level" | tail -1`);
   - section loudness rises act by act and the climax is the loudest section;
   - the last frame is the title or the date/CTA card.
8. **Cutdowns** follow the length's table above. Re-cut to the music's shorter sections rather than trimming the 2:00.

## 9:16 feed cutdowns

A vertical cutdown is not the 16:9 trailer in a box. The rules that change:

- **Picture fills the frame.** Tallest rendition, full-height crop where the rows allow, keyed per shot, subject checked every 4th frame (main skill, Step 7). A window inside black bands only for the wides of a low-resolution scope source, and then the bands carry the cards and subtitles.
- **Cards over picture, not on black.** Put a card over the shot darkened to 35–50% (or under a 60% black scrim behind the text block), or in the band above a window. At most **1 s of full black per card**, and **no more than 15% of the runtime on black** in total (the designed silence included; the title hold is counted separately). A 30 s cutdown with a third of its frames black reads as dead air in a feed.
- **The title once.** One title card on the hit; the end card is title + where to watch ("watch the full film free", the platform, a date) + the licence credit. Two bare title cards within 6 s waste the end.
- **Type:** card caps 90–110 px at weight 600–700 inside x 120–840; subtitles 60–64 px (Subtitles, above); nothing load-bearing below y 1210 or above y 270.
- **Density:** the feed density rule (main skill, Step 11) applies to the cards; shorten them or lay them over moving picture. The title hold (2–3 s) and the end card are exempt.
- **Grade and inserts for the phone** (Selecting shots, above): every climax insert reads at 150 px wide; single-frame flashes on impacts.
- **Measure:** `ffmpeg -i out.mp4 -an -vf blackdetect=d=0.1:pix_th=0.1 -f null - 2>&1 | grep -o "black_duration:[0-9.]*"`. A card of text on black counts as black at these settings (it is ≥98% black pixels), which is what you want: tested on a 30 s cutdown with black cards, it reported 2.25 + 1.75 + 2.75 + 3.29 s, 33% of the runtime. Pass: the total excluding the title's run ≤15% of the duration, and no run around a card over 1 s.

## Open movies and public footage

When the user points at an open film (Blender's open movies are CC BY, for example), credit it exactly as its licence asks, on the end card and in `VIDEO.md`. Never cut a trailer from footage whose licence you have not read; ask the user for the source and licence when unsure.

## Mistakes

Telling the whole plot; a 9:16 cutdown that is a letterboxed window with black cards; murky climax inserts that read as smears on a phone; flat energy; a 60 s teaser with a 2:00 trailer's Act 1; the best shots in short slots and murky ones held long; Act 3 cuts off the beat; a climax that plateaus and stops; digital-zero silence; title cards with too many words, in sentence case, or still blurred on their hit; the same card entrance every time; the music fades instead of ending on the title; no button; the film ending on a bare URL; the logo first.
