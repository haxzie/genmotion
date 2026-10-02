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

In order: user-supplied files; CC0 / CC BY sounds from Freesound or Openverse found with `web-research` and downloaded with `save-asset` (credit CC BY in `VIDEO.md`); then **synthesise placeholders** with `ffmpeg` (below); then let the music's own transients mark the moment by cutting on them. Never a soundboard rip.

### Synthesised placeholders (tested)

Each command below ran on ffmpeg 6.1 and was measured. They are deterministic (fixed noise seeds), 48 kHz stereo WAV, and already carry their relative level with headroom, so **place them at `volume` 1.0** (not the ladder values, which assume −3 dBFS-normalised files). Where an owner skill gives its own lower placeholder levels (a sting's 0.55–0.9), expect the export to land near −5 dBTP; scale every clip together (×1.33) to reach the owner's −1 to −3 dBTP window. Over speech or music, pre-master the base layer to −3 dBTP first (SKILL.md). They are placeholders: a sine and noise read as test tones next to a designed sound. List them as placeholders in `VIDEO.md`, say so in your reply, and offer `sfx` (`recommend-integration`) to replace them.

| Sound | File peak | Length | Use |
|---|---|---|---|
| riser | −14.9 dBFS, rising monotonically (no 50 ms dip) | 2.0 s (1 bar at 120 BPM) | `startFrame = hit − 60` at 30 fps |
| impact | −4.1 dBFS | 1.2 s | on the contact / lock frame |
| whoosh | −13.0 dBFS, loudest at 0.17–0.22 s | 0.4 s | `startFrame = cut − 6` |
| pop | −10.2 dBFS | 0.08 s | text pop, arrival |
| riser (tonal) | −13.2 dBFS, rising monotonically | 1.2 s | calm stings and reveals; `startFrame = hit − 36`; place at **0.7** (its tail is denser than the noise riser's: at 1.0 it measured only about 7 dB under the impact) |
| tick | −13.4 dBFS | 0.04 s | counter steps, anticipation |
| chime | −10.1 dBFS | 2.2 s | success, sonic-logo button |

Riser at 1.0 into the impact at 1.0 measured **9.2 dB** of contrast (riser's last 100 ms −21.5 dB RMS, impact's first 10 ms −12.3 dB RMS), and the sum peaks at −4.1 dBFS.

```
# riser: 220→880 Hz sine sweep + high-passed pink noise, t² / t³ swell, ends exactly at d (2 s)
ffmpeg -f lavfi -i "aevalsrc='0.18*pow(t/2,2)*sin(2*PI*(220*t+165*t*t))':s=48000:d=2" -f lavfi -i "anoisesrc=c=pink:r=48000:a=0.25:seed=7:d=2" -filter_complex "[1:a]highpass=f=500,volume='pow(t/2,3)':eval=frame[n];[0:a][n]amix=inputs=2:normalize=0,afade=t=out:st=1.99:d=0.01,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-riser.wav

# impact: 30 ms high-passed noise snap + a 70→50 Hz body with fast decay
ffmpeg -f lavfi -i "aevalsrc='0.45*exp(-6*t)*sin(2*PI*(70*t-10*t*t))':s=48000:d=1.2" -f lavfi -i "anoisesrc=c=white:r=48000:a=0.35:seed=3:d=1.2" -filter_complex "[1:a]highpass=f=1500,volume='exp(-120*t)':eval=frame[s];[0:a][s]amix=inputs=2:normalize=0,afade=t=in:d=0.002,afade=t=out:st=1.1:d=0.1,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-impact.wav

# whoosh: pink noise band-passed 400–3000 Hz, sin² swell
ffmpeg -f lavfi -i "anoisesrc=c=pink:r=48000:a=0.9:seed=5:d=0.4" -af "highpass=f=400,lowpass=f=3000,volume='pow(sin(PI*t/0.4),2)':eval=frame,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-whoosh.wav

# pop: 900 Hz blip falling in pitch, 2 ms attack
ffmpeg -f lavfi -i "aevalsrc='0.5*min(t/0.002,1)*exp(-60*t)*sin(2*PI*(900*t-2500*t*t))':s=48000:d=0.08" -af "aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-pop.wav

# tick: 40 ms band-limited click (centred near 3.2 kHz; a full-band click up to 18 kHz reads as a test tone)
ffmpeg -f lavfi -i "anoisesrc=c=white:r=48000:a=0.5:seed=11:d=0.04" -af "bandpass=f=3200:width_type=q:w=1.2,volume='exp(-180*t)':eval=frame,afade=t=in:d=0.001,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-tick.wav

# chime: inharmonic bell partials (1 : 2.76 : 5.4), a long natural decay, no echo (an echo on the attack flams)
ffmpeg -f lavfi -i "aevalsrc='0.35*min(t/0.004,1)*(0.75*exp(-2.2*t)*sin(2*PI*880*t)+0.38*exp(-4*t)*sin(2*PI*2428*t)+0.2*exp(-7*t)*sin(2*PI*4752*t))':s=48000:d=2.2" -af "afade=t=out:st=1.9:d=0.3,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-chime.wav

# tonal riser for calm, precise briefs: two sines a fifth apart sweeping up, low-passed, 1.2 s (the noise riser above is for energetic ones)
ffmpeg -f lavfi -i "aevalsrc='0.22*pow(t/1.2,2)*(sin(2*PI*(196*t+122*t*t))+0.5*sin(2*PI*(294*t+183*t*t)))':s=48000:d=1.2" -af "lowpass=f=2500,afade=t=out:st=1.19:d=0.01,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-riser-tonal.wav
```

Variations stay safe if you change one thing at a time: the riser's length (`d`, and the `t/2` terms to `t/d`), the chime's base pitch (keep the 2.76 and 5.4 ratios; put it in the music's key when there is music), the pop's start frequency. Any new layer summed with `amix normalize=0` adds level: re-measure `max_volume` and keep it at or below −3 dBFS. A three-note sonic logo is three chimes at different pitches, 6–10 f apart, mixed down the same way.

### Measuring a riser into a hit

```
# the riser's 50 ms RMS rows: they should only rise (no step down over 6 dB)
ffmpeg -hide_banner -i assets/sfx-riser.wav -af "asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1 | grep -o "RMS_level=.*"
# on the export, with the hit at H seconds: riser's last 100 ms vs impact's first 10 ms (≥8 dB apart)
ffmpeg -hide_banner -i out.mp4 -vn -af "atrim=start=H-0.1:end=H,astats" -f null - 2>&1 | grep "RMS level" | tail -1
ffmpeg -hide_banner -i out.mp4 -vn -af "atrim=start=H:end=H+0.01,astats" -f null - 2>&1 | grep "RMS level" | tail -1
# no silent opening: this must not print silence_start: 0
ffmpeg -hide_banner -nostats -i out.mp4 -af silencedetect=noise=-50dB:d=0.5 -f null - 2>&1 | grep -m1 silence_start
```

Replace `H` with the number (for a hit on frame 72 at 30 fps, `start=2.3:end=2.4` and `start=2.4:end=2.41`).
