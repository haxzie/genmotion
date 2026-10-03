---
name: sound-design
description: "Music, sound effects and the voiceover mix for every kind of video in the pack: the four-decision sound plan, sourcing a track (the user's file, a connected generator, or by default a CC0 / CC BY track fetched from the web and verified), finding its beat grid, sections and button with ffmpeg and fitting the cuts to it, the level ladder in gain and dB, ducking, fades, SFX placement to the frame, silence as a beat, sparse picture-led films, and measuring and re-mastering the export's loudness. Load it whenever a video has sound."
---

# Sound design

Half of what a viewer reads as "polish" is sound arriving on the right frame at the right level. This skill holds the shared numbers for music, SFX and the VO mix; owner skills cite it and only state their deviations, and where an owner's number differs from one here (a sting's anticipation ticks, its first sound on its first motivated frame), the owner wins for that format.

Frame counts are at 30 fps; at 24 fps multiply them by 0.8 (the beat grid has its own 24 fps column). Times in seconds and milliseconds hold at any rate.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, never putting words in a real person's mouth, and the whoosh and noise-bed bans below. The checks at the end are a quality bar to clear, not a template to reproduce.

**Never use a whoosh.** No whoosh, swoosh, swish, swipe, air-sweep or "transition" noise-swell, in any film, generated, downloaded or synthesised: not on cuts, wipes, floods, camera moves, entrances or logo reveals. It is the sound that most marks a film as templated, and this pack bans it outright. A transition gets the sound of what happens in the picture (a click, a tap, a key, a tick, a soft thud or land on the settle, a pop, a tonal note on the beat), or nothing: most cuts are silent. This is a fixed rule like determinism, not a reference: it holds even when another skill, a template or a reference film seems to call for one, and only the user asking for one by name overrides it.

**Never synthesise noise as a bed, room tone, ambience or "air".** No noise generator (white, pink or brown noise, filtered or not) under a film, between cues, under a hold or as an "air" layer: on phones and headphones it reads as wind or hiss. A bed is music (licensed or generated), a tonal pad, or nothing; gaps are handled with natural tails and short fades (below). The only room tone that belongs in a film is the one recorded in the user's own footage, used to fill that footage's own dialogue cuts (`video-editing`). Fixed like the whoosh ban.

## When to use

Load it for any video that will have audio: motion promos, launches, explainers, brand stings, UGC and social ads, and edited footage (podcast clips, talking heads, trailers, Gen Z edits). Load it again when a user says the music is too loud, the voice is buried, the cuts feel off the beat, or the export is quiet or distorted.

Skip it only for a deliberately silent piece (a muted GIF-style loop). Even then, read "Design for muted autoplay" below.

The direction comes first: the `direction` skill decides intent, the energy curve and whether sound is on. This skill turns that into a cue sheet.

## The timeline you are mixing on

Know these units before placing anything, because they differ per field.

| Field | Unit | Note |
|---|---|---|
| `startFrame`, `durationInFrames` | frames | where the clip sits on the film |
| `startFrom` | **seconds** into the source file | trim heads and cue into a section: bar N = `firstDownbeatSec + (N-1) × 4 × 60/BPM` |
| `volume` | linear gain 0–2 | 1 = unity, 2 = +6 dB ceiling; one static value per clip, no keyframes |
| `fadeInFrames`, `fadeOutFrames` | frames | linear ramps from each end; if they overlap both shrink together |
| `track` | 0–3 | lane plan: 0 VO, 1 music, 2 SFX A, 3 SFX B / ambience; overlapping clips need separate lanes |
| scene `audio` + `audioVolume` | file + gain 0–2 | a scene's voiceover, played from the scene's first frame |

Place clips with `place-audio`. On a HyperFrames project the same thing is an `<audio id src data-start data-duration data-volume data-media-start>` element (start, duration and media start in seconds); a volume tween on the timeline (`tl.to("#bgm", { volume: 0.2, duration: 0.2 }, t)`) is honoured by the export, so there you can automate ducking directly.

The export sums every clip with `amix normalize=0` and **no limiter or loudness stage**. Coinciding peaks add, and the AAC encode adds up to ~1 dB of true peak on top, so headroom is your job and the export must be measured (see Headroom and loudness, and Checks).

## The sound plan: four decisions

Make these before generating or fetching any audio, and write the answers into `VIDEO.md` under the Direction's sound plan.

1. **Music or not.** Pick one mode and write it down, because the levels and who decides the cuts follow from it:
   - **Music-led** (no voice: a promo, a text-led explainer, a music-led Gen Z edit): the track at 1.0 is the film. The music decides the cuts. Find its drop or dropout and put it on the film's breath, and its return on the peak frame (`direction`'s energy curve). With a sourced track, the detector's section map gives the drop, the dip and the button (`references/beat-sync.md`).
   - **VO-led** (generated narration): a bed under the voice, per the ladder below. The voice decides the timing.
   - **Over speech** (edited footage: talking head, podcast clip, UGC talk, a Gen Z edit of someone talking): the speech decides the cuts, because a beat-grid cut would land mid-word. The bed sits under the voice per the ladder, and drops to silence under the hook line and the payoff.
   - **Designed sound, picture-led** (no music and no VO: a muted-first launch, a calm hardware or data film carried by a handful of cues, or a film whose content is many sound events): the cues lead, any bed sits far under them, and the loudness target is lower (Sparse, picture-led films, below).
   - **Speech only** (a full podcast episode: no music under talk).
2. **Sync points.** List the 3–7 moments that matter: frame 1, the hook, the reveal, the logo, the CTA. For each pick one treatment: music event (drop, downbeat, button), `sfx`, silence, or nothing.
3. **SFX density.** Literal (≈1 cue per second, every event makes a sound), punctuated (0.25–0.5/s, hero moments plus consistent cut treatment), or minimal (1–3 cues in the whole film, VO carries it).
4. **VO.** Is there narration, whose voice (`pick-voice`, `voiceover`), and does it start +3 to +8 frames after each cut (house median +6) so the eye lands before the ear?

**Order of work: VO → music (source, analyse, choose) → beat table fitted to the track → SFX → mix → measure.** VO timing fixes the music edit, the music grid fixes the cuts, the cuts fix the SFX.

### Design for muted autoplay

Most feeds autoplay muted. Captions and on-screen type must carry the meaning; sound is the reward for unmuting, never the only carrier of a claim. Frame 1 is never silent once the viewer does unmute: start on a transient or a downbeat, never a fade in from nothing.

- **When the peak alignment fixes `startFrom`** (the track's dropout must sit on the breath), frame 1 lands mid-phrase: the alignment wins. Fade the music in over at least fps/2 frames *and* put a transient (a tick, the first reveal's cue) on frames 1–3, so frame 1 is still audible.
- **A sting's first sound may sit on its first motivated frame** (a tick on the first visible motion at frame 6) rather than an arbitrary frame-0 transient, as long as nothing is silent for more than 0.5 s.

## Music

### Choosing

| Format | Feel | BPM | Shape |
|---|---|---|---|
| Launch / hype promo | electronic pop, driving indie, real drums | 110–128 | intro → build → drop on the reveal → button |
| Explainer with VO | light electronic, plucks, lo-fi, sparse | 90–110 | flat and steady, no lead melody |
| Brand sting | a 2–4 s motif or riser into a hit | n/a | one gesture ending on a button |
| UGC / social ad | trend-adjacent pop, hip-hop, house | 95–130 | energy on frame 1, then loop |
| Trailer / teaser | hybrid orchestral, pulses, braams | 60–90 rising to 120–140 | three acts, silence, title hit |
| Gen Z edit, music-led (no speech) | phonk, house, drill | 130–160 (or 65–80 half-time) | cuts on beats or half bars, not every beat for 30 s |
| Gen Z edit over speech | lo-fi, house, phonk under talk | any | speech decides the cuts; the bed sits under it |
| UI demo | minimal tech, soft house | 100–120 | steady, room for clicks |
| Emotional brand film | piano, strings, ambient | 60–90 | one slow swell, long tail |

Rules that hold everywhere: **instrumental under any voice** (lyrics fight speech for intelligibility); prefer tracks with audible section boundaries and a clean ending "button" (final hit plus a short tail), because a track that fades out on its own master cannot end on picture; know the BPM before cutting.

### Getting a track: the decision ladder (`music`)

Go down the ladder and stop at the first rung that works. Libraries, query URLs, licence checks and credit formats are in `references/music-sources.md`; the analysis and the fitting are in `references/beat-sync.md` (read it before writing a beat table for any track you did not generate at a known BPM).

1. **The user's own file.** If the brief or the conversation already has a track or a licence (Epidemic, Artlist, a composer), put it in `assets/` and use it.
2. **A generator that is already connected.** ElevenLabs Music through the `elevenlabs` connector, or Stable Audio / MusicGen / Lyria through `fal` or `replicate`. Prompt with: instrumental, genre and instruments, an exact whole-frame BPM (below), total length (the film plus 2–3 s), section timing, and the ending:
   > "Instrumental, no vocals. Upbeat electronic pop, 120 BPM, 4/4. 30 seconds: 4-bar soft intro, 8-bar build with rising synths, a drop at 0:12, steady groove, ending on a single hard hit with a 2-second tail (a button, no fade out)."

   Generate 2 takes and pick on the hero moment.
3. **Nothing connected: fetch a free, licence-clean track from the web. This is the default; do not stop to ask.**
   1. **Brief.** From the Direction, 1–2 lines in `VIDEO.md`: tempo range, energy and instrumentation, whether it needs a drop (and where the peak falls), how it must end (a button), the length needed, instrumental if there is any voice.
   2. **Search** with `web-research`, best first: Openverse (keyless API, `license=cc0,pdm,by`, `category=music`; results carry the creator, a ready-made attribution and a direct file URL), Incompetech (CC BY 4.0, BPM on every track page), Free Music Archive and ccMixter tracks marked free for commercial use, Mixkit (its own free licence), Pixabay Music (warn about Content ID before YouTube). **Verify each licence on the track's own page**, never a mirror or a list: accept CC0, public domain and CC BY; reject NC, ND, BY-SA (syncing music to picture makes the film an adaptation), and anything unknown or conflicting. Pick 2–3 candidates by description, tags, BPM and duration; download each with `save-asset` into `assets/`.
   3. **Analyse** each candidate with `ffmpeg` and the inline detector in `references/beat-sync.md` (no installs): BPM, first downbeat, grid strength, drop candidates, the section map (intro, build, drop, breakdown) and the last strong hit (the button). Keep the one whose shape matches the film's energy curve; delete the others.
   4. **Fit the picture to the track**, not the track to the picture: scene lengths in whole bars (beats for a montage), the peak on the drop's downbeat, the name reveal on a phrase start, cuts on bar downbeats, the end card on the track's measured button (back-timed: edit at phrase boundaries to reach it), and `startFrom` on a downbeat so frame 0 is a strong moment. Compute every beat from the exact BPM, never by adding rounded beats; put the cuts that carry the film on the measured transient's frame, never after it.
   5. **SFX** go on visible events; where an event also sits on the grid (a tap on a beat), it takes the beat's frame, the hit a frame early rather than late. Sounds the available set lacks come from the same search (Freesound CC0 / CC BY through Openverse, Kenney's CC0 packs), credited the same way.
   6. **Record** the source URL, creator, licence and the exact credit line in `VIDEO.md`, and tell the user where the credit must appear and how to swap the track.
4. **The web is unreachable or nothing fits.** Say which sources failed (a blocked host, no licence-clean match), ask the user for a track, and offer a generator with `recommend-integration` (ElevenLabs first: the same account covers voice and SFX).
5. **Last resort, named to the user as a fallback: no music.** A sparse SFX-led film with natural tails and designed silence (Sparse, picture-led films). Never a synthesised noise bed (the ban above), and never a synthesised beat passed off as music: a placeholder pulse built only to time cuts is labelled a placeholder in `VIDEO.md` and in your reply.

Never use: YouTube Audio Library "YouTube licence" tracks outside YouTube; BBC Sound Effects in anything commercial; any NC licence in a video that promotes something; soundboard rips; commercial songs; unofficial Suno or Udio wrappers. Brand accounts on TikTok add trending audio in-app from the Commercial Music Library.

**Credits.** Write a line into `VIDEO.md` for every audio file not generated by the user's own account: title, creator, source URL, licence, and the exact attribution text the licence demands. Tell the user where it has to appear (description or end card).

## Beat grid

`frames per beat = fps × 60 / BPM`; a 4/4 bar is 4 beats; a phrase is 4 or 8 bars.

| BPM | @24 | @25 | @30 | @60 | bar @30 |
|---|---|---|---|---|---|
| 90 | 16 | 16.67 | **20** | 40 | 80 |
| 100 | 14.4 | **15** | 18 | 36 | 72 |
| 110 | 13.09 | 13.64 | 16.36 | 32.73 | 65.5 |
| 120 | **12** | 12.5 | **15** | 30 | 60 |
| 128 | 11.25 | 11.72 | 14.06 | 28.13 | 56.3 |
| 140 | 10.29 | 10.71 | 12.86 | 25.71 | 51.4 |
| 150 | 9.6 | **10** | **12** | 24 | 48 |

Whole-frame tempos at 30 fps: 60, 72, 90, 100, 120, 150, 180. When you generate music, ask for one of those so the grid sits on frames. Beat k lands at `round(offset + k × fps×60/BPM)`; round each beat from the exact value, never accumulate rounded beats (they drift a frame every few bars). For the cuts that carry the film (the peak, the name reveal, the end card), measure the transient in that beat's window (`references/beat-sync.md`, the grid check) and use `floor(fps × transient)`, so the cut is never after the sound: plain rounding put one tested cut 35 ms late.

Cutting rules:
- **Big changes on beat 1 of a phrase**, ordinary cuts on beat 1 of a bar, montage cuts every beat. A visual hit may be 1 frame early, never late, because late sound reads as lag.
- **Risers end exactly on the drop frame**, 1, 2 or 4 bars long.
- **Edit the track only at phrase boundaries**, downbeat to downbeat, with a 30 ms crossfade **centred on both downbeats** (end A `d/2` after its downbeat and start B `d/2` before its own, or B's downbeat lands `d` early: a frame at 30 ms; longer only for pads and tails); beatless music (orchestral, ambient) has no downbeats, so join it inside a decay, both sides within 3 dB in the full band and above 4 kHz, with a 0.3–0.8 s equal-power crossfade under a picture transition (tested recipe: `references/mix-and-loudness.md`, Beatless music). **Back-time the ending**: put the track's real button on the film's last frame first, then join from an earlier phrase. The button lands on the logo or CTA and the tail rings 1–3 s over the end card.
- **Cue in with `startFrom`** so the first audible frame is a downbeat or a strong section, not the track's quiet intro (one house template starts its track at 17.05 s for exactly this).
- **Peak alignment vs back-timing.** With one unedited stretch of a track you can land its drop on the peak frame *or* its button on the last frame, not both. The peak wins (it is the memorable moment). Then either edit the track (join from the drop's phrase to a phrase that ends on the button: the recipe below), or end on a 30–45 f fade on a bar line while the picture holds. A library track with no obvious drop: take the detector's biggest entry (an UP bar with KICK-IN, or a DOWN bar followed by an UP bar) as the peak's downbeat, and cue the track so it lands on the peak frame.

Edit to length with `ffmpeg` (inline, nothing saved as a script); here bars 5–10 of a 117 BPM track (downbeats 8.235 and 20.543 s) join bar 145 (295.416 s), which carries the button:

```
ffmpeg -i assets/track.mp3 -filter_complex "[0:a]aresample=48000,asplit[x][y];[x]atrim=8.220:20.558,asetpts=PTS-STARTPTS[a];[y]atrim=start=295.401,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.03:c1=tri:c2=tri[out]" -map "[out]" -c:a pcm_s16le assets/track-edit.wav
```

**Find the grid** before cutting to any track you did not generate at a known BPM. Read the file's BPM tag first (`ffprobe -v error -show_entries format_tags=TBPM,TBP,bpm -of default=nw=1 assets/track.mp3`) and the library page's tempo, but treat both as hints: one page listed 121 for a file that measures 120. Then run the two-band envelope and the inline detector in `references/beat-sync.md` (one `ffmpeg` pass, a short `node` snippet, about 1 s of analysis): it reports the BPM (with the ×2 / ÷2 readings and a 3:2 check for swing), the first downbeat, a grid strength, drop candidates, a bar-by-bar section map and the last strong hit (the button). Tested on seven tracks with a published or reference tempo: six within 0.03 BPM (including a swung jazz track that plain autocorrelation read as 86.7 instead of 130); the seventh's page says 121 and the file measures 120. Confirm with the grid check there (median distance from each beat to its strongest transient **≤ 20 ms** on programmed drums; measured 2.5–19 ms on six such tracks, 22–43 ms for wrong grids, and on every track the right grid read lowest). A grid strength under 3.5 (orchestral, ambient, rubato) means no trustworthy grid: cut on phrases and swells and join inside decays, never force a metronome. Delete the envelope files after.

## Mix

### Level ladder

These are the house levels, with each source normalised first (below) so the gains mean the same thing every time. **This is the pack's one level table**: owner skills cite it rather than carry their own bed numbers.

| Layer | `volume` | dB | Why |
|---|---|---|---|
| VO or recorded speech | 1.0 | 0 | the anchor; nothing else wins against it |
| Music alone (no voice): music-led promo, text-led explainer, music-led Gen Z | 1.0 | 0 | the track is the film; drop it on the breath, bring it back on the peak |
| Music under SFX only | 0.5–0.6 | −6 to −4.4 | leaves room for hits |
| **Music bed under any voice** | **0.1–0.2** | **−20 to −14** | default 0.18 (−15) for a sparse bed under generated VO; 0.12 (−18) for a dense track (drums, bright synths) under recorded speech; a dense track low-passed at 6–8 kHz can sit at 0.16–0.2 |
| Podcast clip | none, or 0.1 | −20 | talk carries it |
| UI clicks / taps | 0.8–1.0 | −2 to 0 | short and bright, they cut through |
| Impacts / slams | 0.7–0.85 | −3 to −1.4 | felt, not louder than VO |
| Soft lands / thuds on a settle | 0.5–0.7 | −6 to −3 | felt under the picture, not a hit |
| Risers / swells / rings | 0.55–0.6 | −5 to −4.4 | |
| Pops / ticks | 0.45–0.55 | −7 to −5 | many of them, so each is quiet |

`gain = 10^(dB/20)`; halving is −6 dB, ×0.7 is −3 dB. Full table in `references/mix-and-loudness.md`.

**The bed rule, as a measurement:** the bed sits **14–20 LU under the voice**. More than 20 LU down is inaudible on a phone speaker (a −21 LU bed was judged "no music" in testing); less than 14 starts to mask consonants. With both sources normalised to −16 LUFS the gap is simply `−20·log10(volume)` (0.1 → 20, 0.12 → 18.4, 0.18 → 15, 0.2 → 14); with un-normalised sources it is `voice LUFS − (bed LUFS + 20·log10(volume))`. Low-pass a busy bed under talk (`lowpass=f=7000` when you normalise it) rather than burying it.

**Normalise sources first**, because generated and library files arrive anywhere from −8 to −30 LUFS and a `volume` on an unknown file means nothing. VO and music to −16 LUFS, SFX to a −3 dBFS peak:

```
ffmpeg -i assets/vo-raw.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 assets/vo.wav
```

For an SFX, read `max_volume` from `ffmpeg -i in.wav -af volumedetect -f null -` and apply `volume=<−3 minus that>dB`.

**Pre-master what the SFX sit on.** When effects land on top of speech or music, pre-master that layer to **−15 LUFS / −3 dBTP** (not −14 / −1.5) before placing anything on it: an impact at 0.7–1.0 on a speech peak, plus the AAC encode's ~1 dB, otherwise pushes the export over −1 dBTP (measured: a −1.5 dBTP dialogue with three placeholder impacts exported at −0.8 dBTP; the same dialogue at −3 dBTP exported at −1.5). The export's re-master then brings it to −14 (Headroom and loudness).

| Mix | Pre-master the base layer | Place it at | Others |
|---|---|---|---|
| Speech + SFX (talking head, Gen Z, podcast clip) | dialogue −15 LUFS / −3 dBTP | 1.0 | bed per the ladder; SFX per the ladder, placeholders as `references/sfx-cues.md` says |
| **Music + sparse SFX** (a music-led promo, a text-led explainer, a launch with accents) | the cued music −15 LUFS / −3 dBTP | 1.0 | accents ≤0.7 (placeholders included); then re-master the export |
| Music alone (no other clips) | the cued section −14 LUFS / −1.5 dBTP, two-pass `loudnorm`, linear | 1.0 | none |
| **Music-led trailer or any piece whose loudness range is the design** | no `loudnorm`: automate a volume staircase, then limit peaks only (below) | 1.0 | hits ≤0.85; the staircase must survive |

**`loudnorm` falling back to `dynamic` compresses the loudness range**: on a trailer score it squeezed a 12 dB dropout to 8 dB and lifted Act 1 to the climax's level, the opposite of a staircase (measured: LRA 9.2 → 6.6 LU). For a music-led trailer, shape the build with volume automation (Act 1 0.6, Act 2 0.85, climax 1.0, ramps of 0.5 s), add the makeup gain, and limit the peaks only (`alimiter` with `level=disabled`, so it never rides the gain itself). Tested on a 45 s score cue: −14.9 LUFS, LRA 12.3 LU, sections at −20.5 / −17.8 / −11.8 LUFS, −1.4 dBTP, and −1.2 dBTP after AAC:

```
ffmpeg -i assets/score-cue.wav -af "volume='0.6+0.25*min(max((t-15)/0.5,0),1)+0.15*min(max((t-30)/0.5,0),1)':eval=frame,volume=3.5dB,alimiter=limit=0.79:attack=5:release=50:level=disabled" -ar 48000 -c:a pcm_s16le assets/score-stair.wav
```

`t-15` and `t-30` are the act boundaries in seconds of the cue; the `volume=3.5dB` is the makeup to land near −14 LUFS (adjust by the measured difference); `limit=0.79` is −2 dBFS sample peak, which leaves room for intersample peaks and the encode. Duck under a line by wrapping the staircase in parentheses and multiplying: `volume='(0.6+…)*(1-0.76*between(t,22.1,24.0))'` holds the music at 0.24 of its level under a line at 22.1–24.0 s (tested: 11 dB down). Commands for the other rows in `references/mix-and-loudness.md`.

### Sparse, picture-led films (designed cues, no music, no VO)

A film carried by 5–30 designed cues has no base layer to set the level, so a plain −14 LUFS re-master of the whole mix flattens it into a wall or leaves it quiet. Mix the cues first, master the cue stem itself, and treat any bed (music or a tonal pad, never noise) as a layer you shape, not a floor you raise:

| Rule | Number | Why |
|---|---|---|
| The hierarchy | the hit (the 10's cue) has the film's loudest 50 ms RMS; the sonic logo is second, ≥ 2 dB under it; **only those two get the top two levels**. Action cues (a press, a footstep, a latch, a land) sit 6–9 dB under the hit; transition and pulse pings, card ticks and repeated keys sit **under the action cues they bracket** (≥ 3 dB), never level with the logo | a transition ping as loud as the bell and 8 dB over the first footsteps made the device's own sound the quietest thing in the opening (judged) |
| A bed, if any | music or a tonal pad, never noise; every cue's loudest 50 ms RMS ≥ **12 dB above the bed's RMS** in a cue-free 0.5 s window | at 5–8 dB the cues read as bumps in a drone; measure it (`references/mix-and-loudness.md`, Sparse mixes) |
| A beat bed in the stem | the kick's loudest 50 ms RMS ≥ **6 dB under the hit** and ≥ **3 dB under every UI or action cue it shares a beat with**; automate the bed per section (lighter under the proof, out on the breath, lighter after the peak) | a kick 2–3 dB under the hit and 6–15 dB over the taps made a product-led mix kick-led (judged) |
| Dynamics | **LRA 4–10 LU for a short feed promo**, never above about 12–14 LU for any film meant to be heard | below about 3 LU the breath and the peak stop reading (a steady, unshaped pad measured 2.7–2.8 LU); a wide LRA means too few cues or clipped tails: add the product's own sounds on visible events and let tails ring. With a bed, **shape the bed** (dropouts, a breath, a lighter section) to open the range; never raise it to close one |
| No abrupt cut-offs | every cue decays naturally: fade its tail over the last **80–150 ms**, never truncate it; let the hit and chimes ring into the next beat (a 0.3 s chime on the payoff gets a longer-tailed take, a layered bell or a short `aecho` tail); keep gaps short by placing cues on visible events. A true silence after a decayed tail is fine; in a sound-on film the first 3 s carry audible cues on their visible events | a tail cut into zero reads as a broken file on headphones (judged twice on one wallet film); a gap after a natural decay reads as space |
| Delivery | **feeds (X, LinkedIn, Instagram, TikTok, YouTube Shorts, Kickstarter, Product Hunt): −14 LUFS integrated, ≤ −1 dBTP, LRA about 4–10 LU**; −16 to −18 only for a site hero or autoplay-muted embed, or a long-form player | see the trade-off below |

**The trade-off, stated to the user:** feeds turn loud uploads *down* but never reliably turn quiet ones *up*, so a −18 LUFS post plays 4 dB quieter than its neighbours and its quiet cues drop out on a phone in a noisy feed. A feed post is mastered to −14, and the cues keep their order because the master is built to keep them (below). −16 to −18 is for a film that plays on its own page (a site hero, an embed that autoplays muted, a long-form player), where the silence is part of the design and no neighbour is louder. Write the destination, the target and the measured LRA in `VIDEO.md`.

**Mastering real transient SFX to −14.** Recorded clicks and keys have a 15–27 dB crest factor, so a sparse film of them has a peak-to-loudness ratio of 20–24 dB, and −14 LUFS at −1 dBTP allows 13: the master has to take 10–20 dB off the transients without flattening the hierarchy. The tested order: (1) **trim each cue** whose crest is over 12 dB with a fast limiter, and give its tail an 80–150 ms fade; (2) **build the stem in the final channel layout** (stereo for every feed): a mono stem panned to stereo after measuring reads **+3 LU** louder (two makers hit it); (3) **master the stem itself** with linear gain and a 4× oversampled limiter at **−3.5 dBFS**, measuring the stereo AAC file each pass; the first step adds 1.0× the shortfall, later steps the shortfall × the measured gain-per-LU of the last pass (clamped 1–3, so the loop neither crawls nor overshoots as the limiter eats the gain), **at most 4 passes**; the silence between cues is under the absolute gate, so the reading is stable once the stem itself is mastered; (4) measure on that file. Tested on a 15 s stereo stem of 23 CC0 cues with natural tails and no bed (hit −10, logo −12.5, taps and clicks −15, pops −16, keys −21 dB 50 ms RMS before mastering): stem −24.1 LUFS, passes −17.8 → −15.7 → −14.4 → −14.2; master **−14.2 LUFS, LRA 5.4 LU, −3.0 dBTP after AAC**, the hit 2.0 dB over the logo, taps and clicks 6.5–8.5 dB under it. A fixed 1.0× step on the same stem crawled (−17.8 → −16.4 → −15.7 after three passes) and a fixed 1.5× step went backwards on a sparser one (−15.4 → −15.7). With a shaped tonal pad under it (out for the breath, lighter after the peak): −13.9 LUFS, LRA 4.1 LU, −2.0 dBTP. If four passes leave it more than 1 LU short, the film is too sparse for a feed: add cues on its visible events or let tails ring, rather than limiting harder. Commands in `references/mix-and-loudness.md`, Mastering a sparse film of real transients. The limiter narrows the gaps between transient cues, so read the hierarchy on the **master**, not the pre-master mix.

**Many sound events** (a jar filling with dozens of coins, a counter ticking a hundred times, a crowd of items landing): one sound per event becomes a wall and the identical repeats read as a machine gun. Build it as one stem from the scene's own event schedule, with five rules: seeded pitch and level variation per event (±0.5 semitone, ±1.5 dB, from a hash of the event index, never a random source); thinning (two events closer than 2 f are one sound); phrases (a gap of ≥ 8 f starts a new phrase; within a phrase the pitch walks up a scale, the phrase's first event +2 dB); a ceiling of 4 voices ringing at once; and a per-event level that falls as density rises (−10·log10(n) dB with n the voices sounding, so the summed loudness stays level). The first event, the last and any the picture isolates get full level. Tested recipe in `references/sfx-cues.md`, Many events.

- **Typing is many events.** A typed prompt or amount is 20–70 keystrokes; at full level it is a wall that out-shouts the peak (judged: ~70 keys at −6 dBFS over a −7.5 dBFS hit). Keys sit **at least 6 dB under the hits** (−10·log10 n), thinned (one key per 2 f, every second or third key voiced on a fast run), with the first and last key full; on a −14 master place them 15–18 dB under and confirm on the master that they read ≥ 4 dB under each hit. Typing a setup amount is ≤ 1 s of the film anyway (`launch-taste`).
- **When the burst is the peak** (a whole board re-switched, a jar filling on the 10), thinning to a few voices loses the density the picture is selling (judged: 57 snaps thinned to 12 read thinner than the image). Keep the density as one gesture: a dense chained roll under the voiced hits, rising in level into the hit frame, and **one hero transient on the hit frame** (transient + body + tail, layered) that is the loudest 50 ms in the film.

### Ducking

House default: **no ducking**, a constant bed per the ladder (0.1–0.2) under the voice. Duck only when the bed should come up to about 0.8 between lines (pauses of 1.5 s or more). Duck per sentence, never per word, or it pumps.

- **Split the bed** into clips at VO phrase boundaries on alternating lanes 1 and 3, overlapping 4–8 frames, fading down over 4–8 frames and back up over 10–20.
- **Pre-render a ducked bed** with `ffmpeg` `sidechaincompress` (ratio 4–10, attack 20–80 ms, release 300–1000 ms) keyed by the VO laid out at its timeline positions; place the result at 1.0. Recipes in `references/mix-and-loudness.md`.
- **HyperFrames**: tween the `<audio>` volume down over ~0.2 s and back over ~0.4 s.

### Fades

| Clip | Fade |
|---|---|
| Bed in | ~15 f (house range 4–30); 0–1 f when it starts on a downbeat |
| Bed out, music-only ending | 15 f, or none when it ends on a button (frames at 30 fps; ×0.8 at 24) |
| Bed out under VO | 30–45 f; split a long bed so the fade sits at the true end |
| Any mid-phrase music start or stop | at least fps/2 frames (0.5 s), so it never clicks or lurches |
| SFX transients | no fade in; fade out 2–12 f only if trimmed mid-tail (clicks 2, ticks 4, pings 8, long SFX 10–12) |
| VO | 2–3 f each end, never clipping the first consonant |

### Headroom and loudness

Because the export has no limiter: keep every source peak at or below −3 dBFS, pre-master the base layer per the table above, and never stack a sub drop, a braam and a music drop at full gain on one frame (split the music clip and drop it 3–6 dB on the hit, or let the SFX carry it).

Default delivery: **−14 LUFS integrated, −1 dBTP** for everything online (YouTube, TikTok, Reels, Shorts, X, LinkedIn, Instagram, Kickstarter, Product Hunt), music-led edits and sparse picture-led films included: louder buys nothing once platforms turn it down, and quieter is never turned up. −16 to −18 LUFS only for a site hero, an autoplay-muted embed or a long-form player (above). Podcast feeds −16 LUFS; EBU broadcast −23; US broadcast −24 / −2 dBTP. Measure every export:

```
ffmpeg -hide_banner -nostats -i out.mp4 -map 0:a -af ebur128=peak=true -f null -
```

Pieces under about 6 s (stings, bumpers) are the exception: judge them by true peak (−1 to −3 dBTP) rather than integrated loudness; if a sting lands under −3 dBTP, scale every clip together (×1.33 is typical with the owner's placeholder levels).

**The re-master is the standard last step**, not a rescue: whenever the export's true peak is above −1 dBTP or its loudness is off by more than 1 LU, re-master the exported file (the video stream copied, audio to AAC 192k, always `-ar 48000` or `loudnorm` outputs 192 kHz):

1. Measure the export's integrated loudness `I_measured` (`ebur128`).
2. Peak-limit at a **computed ceiling**, `ceiling_dBFS = target_TP − (target_I − I_measured) − 1` (the 1 dB covers intersample peaks and the encode), with `alimiter=…:level=disabled:latency=1`, so the gain that follows lands on target without pushing a peak over: a linear gain of `target_I − I_measured` dB then puts the loudest peak at `target_TP − 1`. A fixed −4 dBFS limiter is only right for a mix already within ~2 LU of target; a sparse mix that needs +5 to +9 dB falls back to `dynamic` with it (measured).
3. Two-pass `loudnorm` to `I=<target>:TP=<target_TP>:LRA=20` with `linear=true`, the limiter in both passes, feeding pass 1's measurements into pass 2.
4. **Print and record** pass 2's `normalization_type` (the command greps it). `linear`: done. `dynamic` on a speech-led piece: acceptable (light limiting). `dynamic` on a music-led or sparse piece: recompute the ceiling from the measured loudness and run again; on a music-led piece whose build matters, use the staircase + limiter recipe above instead.

Tested with the computed ceiling on three sparse picture-led exports (−21.0, −23.4 and −20.6 LUFS, needing +5 to +9.4 dB): all `linear`, landing at −16.1/−15.9/−15.8 LUFS (or −13.9/−13.8 at a −14 target), true peak −1.4 to −1.9 dBTP after AAC, LRA kept within 0.5 LU of the source; the fixed −4 dBFS limiter on the first of them gave `dynamic`. Commands in `references/mix-and-loudness.md`. Those sources were synthesised tones (low crest). **A film of recorded clicks, keys and taps does not survive this recipe** (measured: `dynamic`, −16.3 and −18.6 LUFS on a 15 s test): master it with the cue-stem recipe in Sparse, picture-led films instead.

## SFX

Placement is frame-exact and comes from the same constants the animation uses (scene start + keyframe), never guessed. If a sound is tied to an element, its visual onset must be a defined frame, not the tail of a spring.

| Cue | Lands | Level |
|---|---|---|
| Hard cut | nothing (cuts are silent); a click if the cut is a UI action; or the music's beat | — |
| Wipe, flood or push | the picture's own event: a tap on the press that starts it, a soft land on its settle frame, or a tonal note on the beat; else nothing | 0.5–0.7 |
| UI click / tap | the press frame, 0 f (up to 1 f early) | 0.8–1.0 |
| Message / bubble | its first visible pixel | 0.75–0.9 |
| Impact / slam / logo lock | the contact frame (motion stops), ±2 f | 0.7–0.85 |
| Pop on arrival | the arrival frame | 0.45–0.55 |
| Ring / chime | on the cut or the success frame | 0.6 |
| Riser | ends on the reveal frame: `startFrame = reveal − length` | 0.55–0.6 |

**Layer hero hits**: a transient (snap, 2–5 kHz, carries on phones) + a body (thump, 100–500 Hz) + a tail (reverb, rumble, sub drop), transients on the same frame. A sub drop alone is inaudible on a phone.

**Timbre fits the product's tone.** Every cue in a film comes from one family (glass, wood, soft plastic, synth tone), chosen for the feeling the brief names. No casino, cash-register, coin-jangle or game-reward chime for a calm, trust-led fintech or a premium product, unless the product is literally about coins or games: those timbres read as gambling or a toy (judged on a wallet film and a design-tool film). A payment success is a clean confirm tone from the film's own family (a glass ping or soft bell a step above the earlier ticks) that decays for ≥ 0.5 s; never truncate a cue's tail: fade it over 80–150 ms.

**A product that makes its own sound** (a keyboard, a switch, a hinge, a magnet catch, a lid, a camera shutter): its actions are the cues and they lead, with no music masking them. One recorded or designed sound per action type (snap in, pull out, key press), pitch direction carrying meaning (rising for in, falling for out), length matching the motion; varied per event per the many-events rules; nothing underneath but the product's own sounds and their tails. This needs no voice or soundscape tool: library clicks, keys and taps, or `ffmpeg` placeholders, are enough.

**A riser resolves on the hit, never into a gap.** Every riser ends in something on its landing frame: a hit, a note (the sonic logo's first note), or the next bed's first transient blooming from that frame. Its last sample sits on that frame (`startFrame = hit − length`) and the resolving sound starts on that same frame; a riser with nothing after it is a bug: a riser that stops 1–3 f early, or a hit placed a few frames late, leaves a hole on the landing frame that reads as a dropout or a broken file, not as tension. Designed silence before a hit is a separate, deliberate beat (riser → hard cut to 0.5–1.5 s of silence after the riser's own decayed tail → hit, the trailer title), never an accident of placement; check it on the waveform (Checks 6).

**A riser into a hit is a level relationship, not two volumes.** The ladder's gains assume peak-normalised files, but a riser's tail is dense and a hit is short, so riser 0.55 + impact 0.8 can leave the hit only 1–4 dB above the riser (measured), and it doesn't punch. Verify it: the impact's first 10 ms RMS is **≥8 dB above the riser's last 100 ms**, and the riser's 50 ms RMS rises with **no dip over 6 dB** before its end (commands in `references/sfx-cues.md`). If the hit is short of 8 dB, lower the riser (usually to 0.3–0.4), never raise the impact past the headroom. Sound-on pieces give the anticipation sound too (ticks, a tonal build, the product's own small sounds): **never open on more than 0.5 s of silence**.

**Density**: about 1 cue per second at most, and only for UI-dense literal films; 0.25–0.5/s for most promos. Exception: a sting's anticipation ticks follow its swing (6 ticks in 1.2 s on a quickening swing is right); the owner's beat sheet wins there. One sound per event that matters, not one per event. Hard cuts are silent by default; a cut gets a sound only when something in the picture makes one (a press, a landing, the beat), and never a whoosh. At most 2 SFX at once, none over a VO word that carries meaning. Repeats of one file alternate lanes and vary level by ±0.04 (0.42 / 0.46 / 0.5) so they never stack identically.

**Getting them (`sfx`)**: describe the sound, not the picture: source, material, size, speed, envelope, tail, length, "one-shot", "no music". Use the model's own words: impact, click, tick, chime, riser (tonal), braam, glitch, drone, ambience, loop. Set a duration (0.5–30 s) for anything timed, and loop mode for ambience. Generate 2–3 takes of hero sounds. Example: "tight punchy impact, a sharp snap layered with a deep thud, very short tail, one-shot, 0.6 seconds". Prompt library in `references/sfx-cues.md`.
Fallback when `sfx` is unavailable, in order: the user's files; CC0 / CC BY sounds from Freesound (through Openverse, keyless) or Kenney's CC0 packs via `web-research` + `save-asset`, licence verified on the sound's own page and credited; **synthesised placeholders** made with `ffmpeg` (riser, impact, pop, tick, chime: tested recipes with safe levels in `references/sfx-cues.md`; voices without words are always a recorded clip, never synthesised), recorded in `VIDEO.md` as placeholders and named as such to the user, because a sine reads as a test tone next to a designed one; or let the music's own transients mark the moment. A sparse set of synthesised cues beats a silent Gen Z edit or sting. A product whose output is sound (a soundscape, a sleep or music app) gets its own 2–4 s in the film with the score ducked 10–12 dB under it; with no recording, `references/sfx-cues.md` has a tested tonal ambient pad (labelled a placeholder; never a noise bed) and the command that turns it into per-frame amplitude for the drawn waveform.

## Silence and endings

- **Dropout before the reveal**: stop or cut the music 1–2 beats (0.25–1 s) before the reveal, then slam back with the hit and the downbeat. The silence is the effect.
- **Trailer title**: riser → hard cut to 0.5–1.5 s of silence → title hit (braam + sub) → tail. The climax before it peaks (loudest, densest in its last 2–3 s), never plateaus and stops.
- **The peak is the loudest event in every film**, not only a trailer: the 10's cue has the loudest 50 ms RMS and momentary reading, and the sonic logo on the end card sits ≥ 2 dB under it, so the film resolves rather than climaxing on the mark.
- **A musical dropout may be longer than the picture's breath**: a library track's only clean dropout is often 2–3 s, while `direction`'s breath is 10–30 f. Keep the picture still for the breath only and keep it moving through the rest of the dropout, or the film stalls.
- **No abrupt cut-offs.** Every cue, clip and bed ends in its own decay or a fade of 80–150 ms (a bed or music: 0.5–1 s), never a truncation; a hit or a chime rings into the next beat, and the gaps stay short because cues sit on the picture's visible events. A short true silence after a decayed tail reads as space; a tail cut into zero reads as a broken file on headphones. When one sound hands to another (a recording stops, the next layer takes over), overlap them 4–6 f, never butt them. Sub-second gaps are fixed with tails and fades, never with noise.
- **Endings land on a button**: the logo or CTA frame is the track's last hit and the tail rings 1–3 s. No button: fade 1–3 s ending on a bar line while the picture holds.
- **Stings end on a sonic logo**: a tonal build or ticks into the lock-up (0.5–1.5 s; a riser only if it is tonal, never a noise swell) → impact on the settle frame → a 2–4 note tonal button → shimmer tail 1–1.5 s. About 3 s total.

## Format recipes

| Format | Music | SFX | VO and mix |
|---|---|---|---|
| Launch film | 110–128 BPM build-and-drop, drop on the reveal (a sourced track: on the detector's drop downbeat) | 5–8 hero moments, a click or tonal note per feature | bed per the ladder (0.18) under VO, 1.0 when music-only |
| Explainer with VO | 90–110 sparse, no melody | UI clicks ≤ 1 per 2–3 s | VO +6 f after cuts, bed 0.18 |
| Explainer, text-led (no VO) | music-led at 1.0, sparse, no lead melody | a cue on each reveal the diagram hinges on | dropout on the breath, return on the peak |
| Brand sting | a 3 s sonic logo or none | riser → impact on settle → tail; sound under the anticipation too | no VO; hit ≥8 dB over the riser tail |
| UGC / social ad | 95–130 trend-adjacent | transient on frame 1, nothing on jump cuts, a pop on caption keywords sparingly | bed 0.12–0.2 under talk |
| Trailer | three acts, accelerating; a volume staircase, peaks limited, never `loudnorm` on the cue | braams on act breaks, riser → silence after its decayed tail → title hit | lines in the gaps, a cold-open line 6–10 LU under Act 1's music |
| Music + sparse accents | music-led at 1.0, pre-mastered −15 LUFS / −3 dBTP | ≤0.7, a few hero moments | re-master the export to −14 |
| Podcast clip | none under talk (or 0.1), optional 1–2 s sting | sparing pops on caption emphasis | dialogue −16 LUFS, deliver −14 for social |
| Talking head | intro, b-roll and section stings; bed 0.12–0.2 if any | a pop or click on graphics, nothing on zoom punches | bed out under the key line |
| Gen Z edit over speech | lo-fi / house / phonk bed, 0.14–0.2, low-passed at 6–8 kHz | 3–6 cues per 30 s on interrupts (pop, ding, hit) | speech decides the cuts; bed out under the hook line and payoff |
| Gen Z edit, music-led | 130–160 phonk or house at 1.0, cuts on beats or half bars | one hit per joke | −14 LUFS like everything else |
| UI demo | none or 100–120 at 0.1 | a varied click per interaction, typing loop, success chime | tails decay; no bed under the gaps |
| Milestone | music-led at 1.0 | a tick per count step (0.45), impact when the number lands | no VO |
| Picture-led designed sound (no music, no VO) | none, or a tonal pad or music 0.05–0.15, shaped per section | the cues lead: ≥12 dB over the bed; many events → one stem with the many-events rules | feeds −14 LUFS / −1 dBTP / LRA 4–10 (site hero or long-form −16 to −18), every tail faded over 80–150 ms, no abrupt cut-off |

Beat sheets, frame budgets and levels per format are in `references/format-recipes.md`.

## Requirements

| Need | Capability | Fallback |
|---|---|---|
| Music | `music` | `web-research` + `save-asset` for a CC0 / CC BY track (the ladder's default); else ask the user or `recommend-integration`; last resort an SFX-led film, said to the user |
| Sound effects | `sfx` | user files or credited CC0 sounds; else `ffmpeg`-synthesised placeholders (`references/sfx-cues.md`); else music transients |
| Narration | `voiceover` (+ `pick-voice`) | the user's recording, or type carries the words |
| Placing clips | `place-audio` | edit `project.json` `audio` or the HyperFrames `<audio>` elements |
| Normalising, editing, measuring, finding the beat grid | `ffmpeg` (+ the detector in `references/beat-sync.md`) | none: an unmeasured export is not finished |
| Checking sync | `capture-frames` | step through the preview at the cue frames |
| Finding licensed audio | `web-research`, `save-asset` (Openverse, Incompetech, FMA, ccMixter, Mixkit, Pixabay; Freesound and Kenney for SFX) | report the blocked sources, ask the user for a file, offer `recommend-integration` |

## Checks before you finish

1. `ebur128` on the exported file reports integrated loudness within ±1 LU of the target (−14 LUFS for every feed, sparse films included; −16 to −18 only for a site hero, muted embed or long-form player, the choice written in `VIDEO.md`) and true peak at or below −1 dBTP; if not, the re-master above ran and its printed `normalization_type` is recorded. Report the numbers and LRA to the user.
2. No clipping: `volumedetect` `max_volume` below 0 dB.
3. Every SFX is on its frame: render `capture-frames` at each cue's frame and the frame before; the visual event (contact, first pixel, press, cut) is visible on the cue frame and not before.
4. The bed sits 14–20 LU under the voice (from the normalised levels, or measured): never louder than 0.2 under a voice line on normalised sources, and never so low it disappears. In the export, the momentary loudness in a ≥1 s speech pause is above −35 LUFS when a bed is meant to be there.
5. Frame 1 is audible (a transient or a downbeat; a sting's first motivated tick within 0.5 s also passes): `silencedetect=noise=-50dB:d=0.5` on the export reports no `silence_start: 0`. The last picture frame lands on the music's button or inside a fade that ends on a bar line.
6. Every riser into a hit: impact's first 10 ms RMS ≥8 dB above the riser's last 100 ms; no dip over 6 dB inside the riser; and **no gap on the landing frame**: the 50 ms RMS rows from 0.1 s before the hit to the hit never fall below the riser's level by more than 6 dB (`references/sfx-cues.md`).
7. Synthesised placeholder sounds are listed as placeholders in `VIDEO.md` and in your reply, including any placeholder pulse; no synthesised beat stands in for music unlabelled.
8. Big cuts sit on downbeats: for each, `(cutFrame − offset) ÷ framesPerBeat` is within 1 frame of a whole number, and the peak, name and end-card cuts sit at or up to 1 frame before the measured transient, never after; on a track with drums the grid check (`references/beat-sync.md`) reads ≤ 20 ms median.
9. No clip runs past the film's end unless it is a deliberate tail, and no long bed ends abruptly.
10. Every non-generated audio file has a credits line in `VIDEO.md` with its licence, verified on the track's own page (not a mirror), and none is NC, ND, BY-SA, BBC RemArc, YouTube-licence-only or a rip. A sourced track's brief, analysis (BPM, first downbeat, drop, button) and the rejected candidates are in `VIDEO.md`, and its section map matches the film's energy curve (peak on an UP / KICK-IN bar, end card on the measured last hit).
11. A sparse, picture-led film: measured on the master, if there is a bed (music or a tonal pad), each designed cue's loudest 50 ms RMS is ≥12 dB above its RMS in a cue-free window and a beat bed's kick is ≥ 6 dB under the hit and ≥ 3 dB under the cues it shares beats with; the LRA is 4–10 LU for a feed promo (never over 12–14 for any film meant to be heard), measured on the final stereo file. No cue ends in an abrupt cut-off: on the waveform every tail decays or fades over 80–150 ms (`references/mix-and-loudness.md`, Sparse mixes, has the commands). The peak cue is the loudest 50 ms in the film and the sonic logo ≥ 2 dB under it. A film of many sound events was built as one stem from the scene's event schedule with the many-events rules, and the cue on its first and last event is audible above the texture.
12. No whoosh, swoosh, swish or air-sweep anywhere in the mix (the ban above): check every SFX file name, every generation prompt and the cue sheet in `VIDEO.md`. No synthesised noise anywhere as a bed, room tone, ambience or air: no noise source in any `ffmpeg` graph or generation prompt for the film's bed.
13. A music-led trailer keeps its build: integrated loudness per section rises act by act and the climax is the loudest; any designed silence follows a decayed tail, never a cue cut off mid-ring. In every film the peak cue is the loudest event and the sonic logo sits ≥ 2 dB under it.
14. Timbre: no casino, cash-register, coin-jangle or game-reward chime in a calm-trust fintech or premium film (unless the product is about coins or games), and no cue's tail is cut off into silence.
