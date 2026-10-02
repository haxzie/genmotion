# SFX cues: taxonomy, timing, prompts

Read this when you are writing the cue sheet or prompting `sfx`. Frames are at 30 fps; scale by fps/30 for other rates.

## Taxonomy

| Category | What it is | Fits | Placement |
|---|---|---|---|
| Whoosh / swoosh / swish | air movement; swish short and bright, whoosh fuller | elements flying across, camera moves, slides and wipes | its **peak** on the cut or the moment of max velocity; house: start 4 f before a cut, or on the first frame of a wipe |
| Riser / uplifter | rising pitch or noise, 1–8 s | into reveals, drops, title cards | **ends exactly on** the reveal; length 1, 2 or 4 bars |
| Downlifter / reverse | falling sweep | after a drop, a scene exit, "power down" | starts on the hit, decays across the next shot |
| Impact / hit / slam | sharp transient + body | landing, text slam, logo lock, cut to black | transient on the contact frame, ±2 f |
| Sub drop / boom | 30–60 Hz falling sine | the felt weight under a hit | on the hit; at most one per 10–20 s; pair with a mid-range hit (phones cannot play sub) |
| Braam | huge low brass or synth blast | trailer act breaks, title card | on the cut, usually after silence |
| UI click / tap / pop | very short, bright | cursor clicks, toggles, items appearing | on the press or appear frame (0 f, at most 1 f early); vary pitch or sample |
| Typing | key clicks | text typed on screen | a loop at matching density, not one per character |
| Notification / chime | short tonal | message in, success, counter done | on the appear frame; in the music's key if tonal |
| Glitch / stutter | bit-crush, stutters | glitch transitions, error states | on the glitch frames, short |
| Shimmer / sparkle | high twinkle | logo shine, highlight sweep | spans the shine, quiet |
| Foley | real actions (cloth, paper, tape, steps) | UGC, unboxing, product handling | exactly on the visible action |
| Ambience / room tone | continuous bed | under VO-only or "silent" stretches, screen demos | whole scene, 20–30 dB under VO, seamless loop, fades 15–30 f |
| Meme-style hits | boom, record scratch, airhorn | Gen Z / comedic edits only | on the punchline frame, one per joke; generate a look-alike, never use a rip |

## Timing table from the house templates

| Cue | Offset from the visual | Clip length | `volume` | Fade out |
|---|---|---|---|---|
| Whoosh into a hard cut | −4 f | 21–24 f | 0.5–0.7 | — |
| Whoosh into a colour flood | −3 f from the flood start (18–22 f before the cut) | ~20 f | 0.7 | — |
| Block / pixel wipe | on the wipe's first frame (18–24 f before the cut) | 20 f | 0.5 | — |
| Iris / orb swell | on the iris start (~32 f before the cut) | ~40 f | 0.6 | 20 f, fade in 10 f |
| Ring on a cut | 0 f | short | 0.6 | 4 f |
| Click on a press | 0 f | 3–15 f | 0.8–1.0 | 2 f |
| Message sent / received | the bubble's first visible pixel | short | 0.75–0.9 | — |
| Pop on arrival | 0 f | 6–20 f | 0.45–0.55 | 4 f |
| Ticks on a checklist or counter | every step (e.g. every 9 f) | short | 0.5 | 4 f |
| Impact on a slam | 0 to −2 f of the peak | short | 0.7–0.85 | — |
| Logo hit on the final lockup | the frame the lockup lands | 1–2 s | 0.9 | 10–12 f |
| Riser | `reveal − length` | 1–4 bars | 0.55–0.6 | — |

Rules behind the numbers:
- Audio early is noticed less than audio late (broadcast tolerance is roughly 40 ms early / 60 ms late), so at 30 fps hits sit on the frame or 1 f early, never late.
- A whoosh's peak is usually 30–70% into the file. Find it and set `startFrame = cutFrame − peakOffsetFrames`; trim the head with `startFrom` (seconds) rather than moving the peak off the cut.
- If a sound is tied to an element, its visual onset must be a defined frame. A spring-derived fade moves the first visible pixel; drive opacity with a stepped or fixed-length ease instead.
- Repeats of one file alternate tracks 2 and 3 and vary level ±0.04 (0.42 / 0.46 / 0.5).

Find a whoosh's peak with `ffmpeg` (10 ms RMS rows; the loudest row is the peak):

```
ffmpeg -i assets/whoosh.wav -af "aresample=48000,asetnsamples=n=480:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/whoosh-rms.txt" -f null -
```

## Density

| Style | Cues per second | House example |
|---|---|---|
| Literal, every event sounds | ≈ 1.0 (the ceiling) | one-shot camera film: 29 cues in 28 s |
| UI / chat dense | 0.5–0.65 | poll and chat ads |
| Punctuated promo | 0.25–0.5 | fintech 0.40, square chat-UI launch 0.25 + VO |
| VO-carried | a handful in the whole film | 70 s explainer-launch: 1 cue |

Limits: at most 2 SFX sounding at once; none over a VO word that carries meaning (place in the gap or drop it 6–10 dB); hard cuts all get the same treatment or none.

## Layering a hero hit

| Layer | Frequency | Role |
|---|---|---|
| Transient (snap, crack, click) | 2–5 kHz | the attack; the part a phone speaker plays |
| Body (thump, punch) | 100–500 Hz | weight |
| Tail (reverb, debris, rumble, sub drop) | wide / below 60 Hz | size and space |

All transients on the same frame. Carve if they clash: `highpass=f=2000` on the transient layer, `lowpass=f=300` on the body. Either prompt the layered result in one go or generate the layers separately and stack them on tracks 2 and 3.

## Prompt library for `sfx`

Pattern: what makes it + character + envelope + length + "one-shot" / "no music". Set a duration (0.5–30 s) whenever timing matters; turn loop on for ambience. Generate 2–3 takes of hero sounds and peak-normalise the chosen one to −3 dBFS before placing it.

| Need | Prompt | Duration |
|---|---|---|
| Transition swish | "short airy whoosh, fast left-to-right pass, bright, clean one-shot, no music" | 0.6 s |
| Big whoosh into a hit | "deep cinematic whoosh building for one second, ending in a punchy low impact with a short reverb tail" | 1.5 s |
| Riser | "rising white-noise riser with a pitch sweep up, tension building, ends abruptly at the peak" | 2 or 4 s (one or two bars at 120) |
| Text slam | "tight punchy impact, a sharp snap layered with a deep thud, very short tail, one-shot" | 0.6 s |
| Sub drop | "sub bass drop, deep sine falling in pitch, clean, no other sounds" | 1.5 s |
| Braam | "massive cinematic braam, distorted low brass blast with a long dark tail, trailer style" | 3 s |
| UI click | "soft modern UI click, a single short plastic tap, subtle, high quality" | 0.5 s (trim) |
| Pop | "small cartoon bubble pop, light and playful, one-shot" | 0.5 s |
| Message received | "soft two-tone message notification, rounded, friendly, short" | 0.5 s |
| Success chime | "gentle two-note ascending notification chime, warm, clean, short" | 1 s |
| Tick | "single crisp wooden tick, very short, dry, one-shot" | 0.5 s (trim) |
| Typing | "fast typing on a quiet mechanical laptop keyboard, steady, close mic" | 3 s, loop |
| Glitch | "short digital glitch stutter, bit-crushed buzz with a data-error crackle" | 0.5 s |
| Shimmer | "soft magical shimmer sparkle, high twinkling bells sweeping upward" | 1.5 s |
| Paper / tape (UGC foley) | "packing tape ripped off a cardboard box, close, dry, one-shot" | 1 s |
| Room tone | "quiet modern office room tone, faint air conditioning hum, no voices" | 10 s, loop |
| Ambience | "light rain on a window, steady, no thunder" | 10 s, loop |
| Comedic boom (meme-style) | "deep cinematic boom with heavy reverb, comedic punchline sting" | 1.5 s |
| Sonic logo (no music service) | "short bright three-note synth logo jingle, uplifting, ending on a sustained chord" | 2.5 s |

**Bad**: "a sound for when the logo appears" (describes the picture). **Good**: "a soft glassy impact with a bright bell ring-out, 1.5 seconds, one-shot" (describes the sound).

## Fallback without `sfx`

User-supplied files first; then CC0 / CC BY sounds from Freesound or Openverse found with `web-research` and downloaded with `save-asset` (credit CC BY in `VIDEO.md`); then let the music's own transients mark the moment by cutting on them. Never a soundboard rip.
