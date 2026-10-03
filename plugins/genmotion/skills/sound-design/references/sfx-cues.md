# SFX cues: taxonomy, timing, prompts

Read this when you are writing the cue sheet or prompting `sfx`. Frames are at 30 fps; scale by fps/30 for other rates.

## Taxonomy

| Category | What it is | Fits | Placement |
|---|---|---|---|
| Whoosh / swoosh / swish | air movement | **never** (SKILL.md, the whoosh ban) | a move, wipe or cut gets the picture's own sound (a tap, a soft land on the settle, a tonal note on the beat) or nothing |
| Soft land / thud | a low, short, padded contact | a panel, card or device settling after a move | on the settle frame (motion stops), ±1 f |
| Riser / uplifter | rising pitch (tonal, never a noise swell), 1–8 s | into reveals, drops, title cards | **ends exactly on** the reveal; length 1, 2 or 4 bars |
| Downlifter / reverse | falling sweep | after a drop, a scene exit, "power down" | starts on the hit, decays across the next shot |
| Impact / hit / slam | sharp transient + body | landing, text slam, logo lock, cut to black | transient on the contact frame, ±2 f |
| Sub drop / boom | 30–60 Hz falling sine | the felt weight under a hit | on the hit; at most one per 10–20 s; pair with a mid-range hit (phones cannot play sub) |
| Braam | huge low brass or synth blast | trailer act breaks, title card | on the cut, usually after silence |
| UI click / tap / pop | very short, bright | cursor clicks, toggles, items appearing | on the press or appear frame (0 f, at most 1 f early); vary pitch or sample |
| Typing | key clicks | text typed on screen | a loop at matching density, not one per character; ≥ 6 dB under the hits (15–18 dB before a −14 master), first and last key full (SKILL.md, Many sound events) |
| Notification / chime | short tonal | message in, success, counter done | on the appear frame; in the music's key if tonal; from the film's own family, ≥ 0.5 s decay on a success; no casino, cash-register, coin-jangle or game-reward chime for a calm-trust fintech or premium product (SKILL.md, Timbre fits) |
| Glitch / stutter | bit-crush, stutters | glitch transitions, error states | on the glitch frames, short |
| Shimmer / sparkle | high twinkle | logo shine, highlight sweep | spans the shine, quiet |
| Foley | real actions (cloth, paper, tape, steps) | UGC, unboxing, product handling | exactly on the visible action |
| Recorded ambience | the place's own recorded sound (a street, a café) from the user's footage or a credited CC0 field recording, never synthesised noise | only when the picture shows that place | 20–30 dB under VO, fades 0.5–1 s; never a noise generator as "room tone" or "air" (SKILL.md, the noise-bed ban) |
| Meme-style hits | boom, record scratch, airhorn | Gen Z / comedic edits only | on the punchline frame, one per joke; generate a look-alike, never use a rip |

## Timing table from the house templates

| Cue | Offset from the visual | Clip length | `volume` | Fade out |
|---|---|---|---|---|
| Hard cut | nothing (cuts are silent), or the beat it sits on | — | — | — |
| Colour flood | a tap on the press that starts it (0 f), and/or a soft land on the frame the next scene settles | 3–15 f | 0.8 / 0.5–0.7 | 2 f |
| Block / pixel wipe | on the wipe's first frame (18–24 f before the cut) | 20 f | 0.5 | — |
| Iris / orb | a tonal note or chord (never a noise swell) on the iris start (~32 f before the cut) | ~40 f | 0.6 | 20 f, fade in 10 f |
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
- A designed impact or chime's peak is often a few frames into the file. Find it and set `startFrame = eventFrame − peakOffsetFrames`; trim the head with `startFrom` (seconds) rather than moving the peak off the cut.
- If a sound is tied to an element, its visual onset must be a defined frame. A spring-derived fade moves the first visible pixel; drive opacity with a stepped or fixed-length ease instead.
- Repeats of one file alternate tracks 2 and 3 and vary level ±0.04 (0.42 / 0.46 / 0.5).

Find an impact's peak with `ffmpeg` (10 ms RMS rows; the loudest row is the peak):

```
ffmpeg -i assets/impact.wav -af "aresample=48000,asetnsamples=n=480:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/impact-rms.txt" -f null -
```

## Density

| Style | Cues per second | House example |
|---|---|---|
| Literal, every event sounds | ≈ 1.0 (the ceiling) | one-shot camera film: 29 cues in 28 s |
| UI / chat dense | 0.5–0.65 | poll and chat ads |
| Punctuated promo | 0.25–0.5 | fintech 0.40, square chat-UI launch 0.25 + VO |
| VO-carried | a handful in the whole film | 70 s explainer-launch: 1 cue |

Limits: at most 2 SFX sounding at once; none over a VO word that carries meaning (place in the gap or drop it 6–10 dB); hard cuts are silent unless the picture makes a sound on them, and never get a whoosh.

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
| Soft land on a settle | "soft padded thud, a small card set down on felt, low and short, no tail, one-shot, no music" | 0.5 s |
| Tonal build into a hit | "two warm synth notes a fifth apart rising in pitch for one second, ending in a punchy low impact with a short reverb tail" | 1.5 s |
| Riser | "rising synth riser, a sustained chord sweeping up in pitch, tension building, ends abruptly at the peak" | 2 or 4 s (one or two bars at 120) |
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
| Comedic boom (meme-style) | "deep cinematic boom with heavy reverb, comedic punchline sting" | 1.5 s |
| Sonic logo (no music service) | "short bright three-note synth logo jingle, uplifting, ending on a sustained chord" | 2.5 s |

**Bad**: "a sound for when the logo appears" (describes the picture). **Good**: "a soft glassy impact with a bright bell ring-out, 1.5 seconds, one-shot" (describes the sound).

## Fallback without `sfx`

In order: user-supplied files; CC0 / CC BY sounds from Freesound or Openverse found with `web-research` and downloaded with `save-asset` (credit CC BY in `VIDEO.md`); then **synthesise placeholders** with `ffmpeg` (below); then let the music's own transients mark the moment by cutting on them. Never a soundboard rip.

### Synthesised placeholders (tested)

Each command below ran on ffmpeg 6.1 and was measured. They are deterministic (fixed seeds for the two short noise transients, the impact's 30 ms snap and the 40 ms tick; never a noise bed), 48 kHz stereo WAV, and already carry their relative level with headroom, so **place them at `volume` 1.0** (not the ladder values, which assume −3 dBFS-normalised files). Where an owner skill gives its own lower placeholder levels (a sting's 0.55–0.9), expect the export to land near −5 dBTP; scale every clip together (×1.33) to reach the owner's −1 to −3 dBTP window. Over speech or music, pre-master the base layer to −3 dBTP first (SKILL.md). They are placeholders: a sine reads as a test tone next to a designed sound. List them as placeholders in `VIDEO.md`, say so in your reply, and offer `sfx` (`recommend-integration`) to replace them.

| Sound | File peak | Length | Use |
|---|---|---|---|
| riser | −16.4 dBFS, rising monotonically (no 50 ms dip) | 2.0 s (1 bar at 120 BPM) | `startFrame = hit − 60` at 30 fps |
| impact | −4.1 dBFS | 1.2 s | on the contact / lock frame |
| pop | −10.2 dBFS | 0.08 s | text pop, arrival |
| riser (tonal) | −13.2 dBFS, rising monotonically | 1.2 s | calm stings and reveals; `startFrame = hit − 36`; place at **0.7** (its tail is denser than the long riser's: at 1.0 it measured only about 7 dB under the impact) |
| tick | −13.4 dBFS | 0.04 s | counter steps, anticipation |
| chime | −10.1 dBFS | 2.2 s | success, sonic-logo button |

Riser at 1.0 into the impact at 1.0 measured **10.1 dB** of contrast (riser's last 100 ms −22.3 dB RMS, impact's first 10 ms −12.3 dB RMS), and the sum peaks at −4.1 dBFS.

```
# riser: two sines a fifth apart sweeping 220→880 Hz, t² swell, low-passed, ends exactly at d (2 s); tonal only, never a noise swell
ffmpeg -f lavfi -i "aevalsrc='0.15*pow(t/2,2)*(sin(2*PI*(220*t+165*t*t))+0.5*sin(2*PI*(330*t+247*t*t)))':s=48000:d=2" -af "lowpass=f=3000,afade=t=out:st=1.99:d=0.01,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-riser.wav

# impact: 30 ms high-passed noise snap + a 70→50 Hz body with fast decay
ffmpeg -f lavfi -i "aevalsrc='0.45*exp(-6*t)*sin(2*PI*(70*t-10*t*t))':s=48000:d=1.2" -f lavfi -i "anoisesrc=c=white:r=48000:a=0.35:seed=3:d=1.2" -filter_complex "[1:a]highpass=f=1500,volume='exp(-120*t)':eval=frame[s];[0:a][s]amix=inputs=2:normalize=0,afade=t=in:d=0.002,afade=t=out:st=1.1:d=0.1,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-impact.wav

# pop: 900 Hz blip falling in pitch, 2 ms attack
ffmpeg -f lavfi -i "aevalsrc='0.5*min(t/0.002,1)*exp(-60*t)*sin(2*PI*(900*t-2500*t*t))':s=48000:d=0.08" -af "aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-pop.wav

# tick: 40 ms band-limited click (centred near 3.2 kHz; a full-band click up to 18 kHz reads as a test tone)
ffmpeg -f lavfi -i "anoisesrc=c=white:r=48000:a=0.5:seed=11:d=0.04" -af "bandpass=f=3200:width_type=q:w=1.2,volume='exp(-180*t)':eval=frame,afade=t=in:d=0.001,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-tick.wav

# chime: inharmonic bell partials (1 : 2.76 : 5.4), a long natural decay, no echo (an echo on the attack flams)
ffmpeg -f lavfi -i "aevalsrc='0.35*min(t/0.004,1)*(0.75*exp(-2.2*t)*sin(2*PI*880*t)+0.38*exp(-4*t)*sin(2*PI*2428*t)+0.2*exp(-7*t)*sin(2*PI*4752*t))':s=48000:d=2.2" -af "afade=t=out:st=1.9:d=0.3,aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-chime.wav

# tonal riser for calm, precise briefs: two sines a fifth apart sweeping up, low-passed, 1.2 s (the 2 s riser above is for energetic ones)
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

**No gap on the landing frame.** A riser must run into the hit, never stop short of it. Read the 50 ms rows from 0.15 s before the hit to 0.1 s after it; none may fall more than 6 dB below the riser's last rows:

```
ffmpeg -v error -i out.mp4 -map 0:a -af "aresample=48000,asetnsamples=n=2400:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/w.txt" -f null -
awk -F'[:= ]+' -v h=2.0 '/pts_time/{t=$NF} /RMS_level/{if(t>=h-0.15&&t<h+0.1)printf "%.2f %s\n", t, $NF}' assets/w.txt
```

Measured with the placeholder riser and impact, hit at 2.0 s: on the frame, the rows read −21.8, −21.3, −21.6, **−13.4**, −16.8 (the riser climbs straight into the hit); the same impact placed 4 f late reads −21.8, −21.3, −21.6, **−inf, −inf**, a hole on the landing frame that plays as a dropout. Fix by moving the hit (or the riser's `startFrame`), never by stretching a fade over the gap. Delete `w.txt` after.

### Synthesised ambient pad (a product that makes sound, no recording)

For a launch or demo of a product whose output *is* sound (a sleep or meditation app, an ambient generator), the film plays that output for 2–4 s with the score ducked 10–12 dB under it (`launch-playbook`). The real output comes first: a 20–30 s capture from the user, or `music` prompted with the product's own description of its sound. With neither, synthesise a **tonal** placeholder: three slow sine pads (A2, E3, B3, a stacked fifth, slightly detuned left and right so it is wide), each breathing at its own rate (0.03–0.08 Hz, so nothing repeats inside the clip), faded 2 s in and 3 s out. **No noise layer**: synthesised noise reads as wind or hiss on phones (SKILL.md, the noise-bed ban), so a white-noise or rain app needs the user's own recording of its output, never a generated stand-in. Tested: 24.0 s, 48 kHz stereo, −17.1 LUFS integrated, LRA 4.4 LU, peak −8.4 dBFS, nothing above about 1.2 kHz; raise it 1 dB at placement when it plays at speech level in the foreground.

```
# ambient pad: three breathing sine pads, detuned per channel, 24 s, no noise
ffmpeg -f lavfi -i "aevalsrc=exprs='0.10*sin(2*PI*110*t)*(0.6+0.4*sin(2*PI*0.05*t))+0.07*sin(2*PI*164.81*t)*(0.55+0.45*sin(2*PI*0.07*t+1))+0.05*sin(2*PI*246.94*t)*(0.5+0.5*sin(2*PI*0.031*t+2))|0.10*sin(2*PI*110.3*t)*(0.6+0.4*sin(2*PI*0.05*t+0.5))+0.07*sin(2*PI*165.2*t)*(0.55+0.45*sin(2*PI*0.07*t+1.6))+0.05*sin(2*PI*247.4*t)*(0.5+0.5*sin(2*PI*0.031*t+2.7))':s=48000:d=24" -af "lowpass=f=1200,afade=t=in:d=2,afade=t=out:st=21:d=3,loudnorm=I=-16:TP=-3:LRA=7,aresample=48000" -c:a pcm_s16le assets/placeholder-ambient-pad.wav
```

- **Variations, one at a time**: a darker sleep pad drops the pads an octave (55, 82.41, 123.47 Hz); a brighter "focus" pad adds a fourth partial an octave up at half level. Length is `d` (20–30 s) with the out-fade's `st` at `d − 3`. Put the pads in the score's key when they play next to it (A minor here).
- **Drive the picture from it.** One RMS row per film frame (1600 samples at 48 kHz = 1 frame at 30 fps), which you paste into a `components/` array the scene indexes by frame, so the drawn waveform or meter moves with what is heard:

```
ffmpeg -i assets/placeholder-ambient-pad.wav -af "aresample=48000,asetnsamples=n=1600:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=assets/bed-env.txt" -f null -
```

  720 rows for 24 s; map dB to a 0–1 amplitude with `10^(dB/20)` and normalise to the loudest row. Delete the text file after.
- **As a bed under designed cues** (a picture-led film with no music): the same pad, shaped per section (out for the breath, lighter after the peak), placed so every cue's loudest 50 ms sits ≥12 dB above it (`mix-and-loudness.md`, Sparse mixes). Never a noise bed or "air".
- It is a **placeholder** for the product's real output: name it `placeholder-…`, list it in `VIDEO.md` as "synthesised stand-in for <product>'s sound, replace with a real recording", and say so in your reply.

## Many events: one stem from the scene's schedule

For a film whose content is many sound events (dozens of coins into a jar, a counter ticking a hundred times, items landing in a crowd). Placing one clip per event with `place-audio` does not scale, and identical repeats at one level read as a machine gun or a wall. Build one stem from the **same event list the scene animates from**, so picture and sound cannot drift:

1. Keep the land frames in `components/events.json` (an array of film frames, ascending); the scene imports it and poses each item from it in closed form.
2. Build the stem with the five rules (SKILL.md, Many sound events): seeded variation, thinning, phrases, a voice ceiling, density-scaled level. The `node -e` below prints an `ffmpeg` filter graph from the list (type it inline, nothing saved as a script): one branch per voiced event, pitch by `asetrate`, level by `volume`, placed by `adelay`, summed with `amix normalize=0`.
3. Place the stem at 1.0 from frame 0 with `place-audio`, list it in `VIDEO.md` as built from the event schedule (and as a placeholder if its source sound is synthesised).

```
# one source sound: a short bright coin/tick (this is a synthesised placeholder: two decaying partials, -6.6 dBFS peak)
ffmpeg -f lavfi -i "aevalsrc='0.5*min(t/0.002,1)*(exp(-38*t)*sin(2*PI*2093*t)+0.5*exp(-60*t)*sin(2*PI*5650*t))':s=48000:d=0.3" -af "aformat=channel_layouts=stereo" -c:a pcm_s16le assets/sfx-coin.wav

# the stem: run from the project folder
ffmpeg -y -hide_banner -nostats -i assets/sfx-coin.wav -filter_complex "$(node -e '
const F = require("./components/events.json"), fps = 30, tail = 0.25, maxVoices = 4;
const hash1 = (n) => { let t = (Math.imul(n | 0, 0x9e3779b1) + 0x6d2b79f5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const ev = []; let last = -1e9, step = 0, ringing = [];
F.forEach((f, i) => {
  const t = f / fps, hero = i === 0 || i === F.length - 1;
  if (!hero && f - last < 2) return;
  step = f - last >= 8 ? 0 : Math.min(step + 1, SCALE.length - 1);
  ringing = ringing.filter((end) => end > t);
  if (!hero && ringing.length >= maxVoices) return;
  const n = ringing.length + 1;
  const db = hero ? 0 : -2 - 10 * Math.log10(n) + (step === 0 ? 2 : 0) + (hash1(2 * i + 1) - 0.5) * 3;
  const semi = SCALE[step] + (hash1(2 * i) - 0.5);
  ev.push([t, 2 ** (semi / 12), db]); ringing.push(t + tail); last = f;
});
const a = ev.map((e, k) => `[s${k}]asetrate=${(48000 * e[1]).toFixed(1)},aresample=48000,volume=${e[2].toFixed(2)}dB,adelay=${Math.round(e[0] * 1000)}:all=1[a${k}]`);
console.log(`[0:a]asplit=${ev.length}${ev.map((_, k) => `[s${k}]`).join("")};${a.join(";")};${ev.map((_, k) => `[a${k}]`).join("")}amix=inputs=${ev.length}:normalize=0[out]`);
console.error(`${F.length} events -> ${ev.length} voiced`);
')" -map "[out]" -c:a pcm_s16le assets/events-stem.wav
```

What each number does, so you can tune one at a time:

| Rule | In the code | Effect |
|---|---|---|
| Seeded variation | `hash1(2i)` ±0.5 semitone, `hash1(2i+1)` ±1.5 dB | no two neighbours identical; the same on every run (`hash1` is `components/ease.ts`'s) |
| Thinning | events < 2 f apart are one sound | the picture keeps every item; the ear gets a clean onset |
| Phrases | a gap ≥ 8 f resets `step`; inside a phrase the pitch climbs `SCALE` (pentatonic, in semitones) and the phrase's first event gets +2 dB | a run reads as a gesture with a start, not a stream |
| Voice ceiling | at most `maxVoices` (4) ringing within `tail` (0.25 s) | a burst never sums into a wall; extra events are silent, not quieter |
| Density level | −10·log10(n), n = voices ringing | equal-power: four voices together sound like one at full level |
| Heroes | first and last event at 0 dB, never thinned | the start and the land stay readable; add any event the picture isolates the same way |

Tested on ffmpeg 6.1 with 80 events accelerating from 30 f apart to every 1–2 f: 56 voiced, peak −5.1 dBFS, 0.5 s RMS −28 to −24 dB on the sparse opening, a steady −30 to −31 dB through the densest run (a texture under the isolated hits, not a wall), and −25 dB on the final hero event. Pitch tied to state instead of phrase (rising with the jar's fill) is the same code with `semi` from the fill fraction (`12 * i / F.length`). A different source sound (a real coin foley, a `sfx` take) drops straight in: peak-normalise it to −6 dBFS first.

**When the burst is the peak** (the whole set lands on the 10), the thinning above is right for the texture but wrong as the only layer: 57 snaps in 23 f thinned to 12 voiced clacks read thinner than the picture (judged). Keep the density as a gesture: for the burst's frames drop the thinning to 1 f (`f - last < 1`) and raise `maxVoices` to 6–8, so the roll stays dense, ramp its level up into the hit frame (its last 0.3 s about 3 dB over its start), and put one layered hero hit (transient + body + tail, `Layering a hero hit`) on the hit frame as the loudest 50 ms of the film.

## Voices without words (a crowd, a room, a meeting)

When a film needs the *sound* of people talking without words (a café, a meeting behind a product, a crowd reacting): use a **recorded** walla or crowd clip, never a synthesised one. Get it with `sfx`, or find a CC0 / CC BY recording with `web-research` (Freesound, Openverse), download it with `save-asset`, check the licence on its own page and credit it in `VIDEO.md`; or a `voiceover` read of real lines. With none of these, carry the moment with on-screen words and leave the voices out: a noise-and-buzz "murmur" built from a generator reads as wind or voices through a wall, and is banned like any noise bed.

**Never for one intimate voice** (a diary, a voice message to someone, a private recording, one person thinking aloud): a crowd reads as the opposite of private. Instead:

- **With no `voiceover`**: the on-screen words carry the voice (the transcript, set in the speaker's own type), and the recording frames get no stand-in sound under them (never a synthesised breath, room tone or noise): the bed drops 6–10 dB for them, so the quiet itself marks the recording. Flag "the real recording goes here" in `VIDEO.md`.
- **With `voiceover`**: record the actual line, close and dry (no reverb, no room), placed at speech level per the ladder, with the bed out under it (duck 10–12 dB or stop it), because the product's sound is that one voice.

In the foreground (the meeting or recording the product listens to, as a hook) a recorded crowd sits at 0.5–0.7, under the film's hero cues; it never becomes a bed under VO or cues, and it ends on its own 0.2 s fade, never cut off.
