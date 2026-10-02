# Trailer and teaser from existing footage

Read this when the user has footage (a film, a game capture, an open movie, event or travel footage, a product shoot) and wants a trailer, teaser or promo cutdown. A trailer sells a feeling and a promise, not the plot. Recipe numbers (§) refer to `ffmpeg-recipes.md`.

## Lengths

| Deliverable | Length |
|---|---|
| Teaser | 30–90 s: tone and mystery, one idea, the title at the end, often one sustained musical idea or silence and a single sting |
| Trailer | 1:30–2:30 (theatrical cap 2:30): premise, characters, stakes in three acts |
| Spots / cutdowns | 60, 30, 15 and 6 s, plus 9:16 and 1:1 versions |

## Structure (a 2:00 trailer at 30 fps)

| Time | Beat | Cut rate | Sound |
|---|---|---|---|
| 0:00–0:10 | **Cold open**: one striking moment or line, often in quiet; then a hard cut to black or a logo | 1–3 long shots | near-silence or room tone, one line of dialogue |
| 0:10–0:45 | **Act 1, setup**: the world, the protagonist, normal life; dialogue-driven | ASL 3–5 s (90–150 f) | music sparse, cut on phrase boundaries (every 4–8 bars) |
| ~0:45 | **Turn**: the inciting incident; a sound-design hit and black (the drop) | one hit, 6–15 f of black | music changes section |
| 0:45–1:25 | **Act 2, escalation**: conflict and stakes, with title cards between beats | ASL 1.5–2.5 s (45–75 f), accelerating | music builds in layers; cuts on bars; risers into hits |
| 1:25–1:50 | **Act 3, climax montage**: fastest cutting, impacts on beats | ASL 0.3–1 s (9–30 f) | music at its peak; cuts on beats and half-beats |
| 1:50–1:55 | **Title** after a hard stop and silence | hold 2–4 s (60–120 f) | 0.5–1.5 s of near-silence, then the biggest hit on the title |
| 1:55–2:00 | **Button**: a last short gag, line or scare after the title, then the date/CTA card | 1 shot, then a 2–3 s card | the line, then a tail |

Contrast is the engine: the escalation only lands because of the quiet before it. Equal energy throughout is the most common failure. For a product or game, show the unique thing early, then escalate in complexity.

## Title cards

- 2–5 words per card, large, centred, wide tracking, on black or over a dark plate; 1–2 s (30–60 f) each.
- Cards often build one sentence across the trailer ("THIS FALL" … "ONE CHOICE" … "CHANGES EVERYTHING").
- Every card lands on a hit (an impact, a braam or a downbeat); the final title holds 2–4 s; the date or CTA card 2–3 s.
- Build them as scenes: type per `three-type`, entrances per `motion-language` (a 12 f word entrance is too slow for Act 3; cards there are hard-on, hard-off on the beat). A card is a full scene between footage scenes, or an overlay on a darkened plate.

## Music-driven cutting

1. **Pick the track first.** Trailer music is usually three sections: atmosphere → build → climax/hit. Get it legally (`music` capability, `sound-design`); log the licence.
2. Find the tempo and the first downbeat; build the beat grid in frames (`sound-design`: frames per beat = fps × 60 / BPM, each beat rounded independently).
3. Map acts to music sections. Edit the music only at bar lines (10–50 ms crossfades) to make sections fit; back-time the ending so the track's real ending lands on the title.
4. Cut Act 1 on phrases, Act 2 on bars, Act 3 on beats and half-beats. A cut may land one frame early on a beat, never late.

## Sound design

- Booms and impacts on every title card and on the turn.
- Risers 2–8 s long, ending exactly on the hit frame.
- Whooshes on fast transitions, peak on the cut.
- A reverse cymbal into a cut; braams for the epic moments, sparingly.
- **Designed silence**: 0.5–1.5 s of near-silence before the biggest hit (room tone, not digital zero).
- Dialogue: 6–12 selected lines carry the story (premise → conflict → stakes), laid across cuts as J/L-cuts.
- Levels and the export check per `sound-design`; −14 LUFS online.

## Building it from footage

1. **Log the footage.** Scene detection and one contact sheet per shot change (§2). Tag every shot: hero, emotional, action, world, character, dialogue line. Put the log in `VIDEO.md`.
2. **Pick the 6–12 lines** that tell premise → conflict → stakes. Never reveal the ending.
3. **Lay the dialogue spine** against the music's sections, leaving air in Act 1 and none in Act 3.
4. **Fill picture**: Act 1 long shots; Act 2 shots + title cards on bars; Act 3 the fastest, most kinetic shots on beats. Cut on action; match motion direction across cuts.
5. **Conform** each act's shots into `edit.webm` (§5). Speed changes (a 0.5× moment, a 2× whip) go in the conform as stepped segments (§8). Grade for consistency across sources (§8 colour), dark and slightly contrasty for drama.
6. **Motion layer**: title cards, the final title, the date/CTA card; optional flash-to-white or block-wipe handoffs between acts (`motion-language` handoff catalog; `three-transitions` on Three). A 2-frame white flash on an impact frame is a trailer staple; use it 1–3 times, not on every cut.
7. **Sound pass**, then render, then measure: every title card frame coincides with its hit (±1 frame); the silence before the title measures as silence (`silencedetect` at −45 dB, 0.5 s).
8. **Cutdowns**: 60 s = cold open + compressed Act 2 + climax + title; 30 s = hook + 3 beats + title; 15 s = one hook + climax + title; 6 s = one image + title. Re-cut to the music's shorter sections rather than trimming the 2:00.

## Open movies and public footage

When the user points at an open film (Blender's open movies such as *Sintel*, *Tears of Steel*, *Big Buck Bunny*, *Spring*, *Sprite Fright* are CC BY), credit it exactly as its licence asks in the end card and `VIDEO.md`. Never cut a trailer from footage whose licence you have not read; ask the user for the source and licence when unsure.

## Mistakes

Telling the whole plot; flat energy; Act 3 cuts off the beat; title cards with too many words; the music fades instead of ending on the title; no button; the logo first.
