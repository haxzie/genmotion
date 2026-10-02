# Format recipes

Read this when you write the cue sheet for a specific kind of video. Frames at 30 fps. Levels assume normalised sources (VO and music at −16 LUFS, SFX peaks at −3 dBFS). Master: −14 LUFS / −1 dBTP unless noted. The owner skill sets the beats; this file sets the sound on them.

## Launch film (20–90 s)

- **Music**: instrumental build-and-drop, 110–128 BPM (ask for 120: 15 f per beat). Drop on the product reveal.
- **Shape**: frame 1 transient → problem section sparse and low → riser 2–4 s (one or two bars) into the **drop on the reveal** → feature montage, a cut every 1–2 beats, each feature landing with a light swish or click → breakdown under the key line → logo on the last hit, 1–3 s tail.
- **SFX**: 5–8 hero moments. Whoosh 0.7 three frames before each flood, impact 0.7–0.85 on slams and the logo, click 0.9 on taps.
- **Levels**: music-only films at 1.0; with SFX 0.5–0.6; VO-led: bed 0.18 (the ladder's 0.1–0.2) with VO at 1.0, +3 to +8 f after each cut.
- House examples: a fintech launch at music 0.55 with whooshes and impacts; a voice-AI launch with a sparse bed under VO, block-wipe SFX on wipe starts and rings on cuts.
- **No drop in the track?** Search the onset dump (SKILL.md, Beat grid) for a natural dropout followed by a hit and cue the track with `startFrom` so the hit lands on the reveal frame.

## Explainer with VO (40–120 s)

- **Order**: write and place the VO first; music and SFX fit around it.
- **Music**: 90–110 BPM, sparse, no lead melody. Bed 0.18 per the ladder (fade in 30, split near the end and fade out 45). Optional duck up to ≈ 0.7 in pauses ≥ 1.5 s.
- **Cuts**: each section starts on a downbeat right after a VO pause; VO +6 f after each cut (house: 8 of 8).
- **SFX**: light UI sounds, at most one per 2–3 s; room tone 0.03–0.05 if the bed drops out.
- **Ending**: music button under the CTA.

## Text-led film with no VO (explainer, product story)

- **Music-led at 1.0**: the track is the film. Sparse, no lead melody, so on-screen text stays the focus.
- **Drop it on the breath, bring it back on the peak**: cue the track (`startFrom`) or edit it so a natural dropout sits on `direction`'s breath and the return lands on the peak frame. That alignment usually beats back-timing the ending (SKILL.md, Beat grid); end on a 30–45 f fade on a bar line under the held last card.
- Sparse cues on the reveals the film hinges on (a tick as a packet crosses, a click on the key moment), never under every text line.

## Brand sting (2–8 s)

- **Sequence**: whoosh or riser into the lock-up (0.5–1.5 s) → **impact on the settle frame** → tonal button (2–4 notes or a chord) → shimmer tail 1–1.5 s. About 3 s of sound.
- **Source**: a music generator with a 3–5 s length, or `sfx` ("short bright three-note synth logo jingle, ending on a sustained chord, 2.5 seconds").
- **Levels**: logo hit 0.9; no bed. No sub drop if the sting will precede speech.
- **The anticipation has sound too** (ticks, an air bed, a swing whoosh): a sound-on sting never opens on more than 0.5 s of silence.
- **Contrast**: the impact's first 10 ms RMS is ≥8 dB above the riser's last 100 ms, and the riser has no dip over 6 dB; lower the riser until it passes (`sfx-cues.md` has the measurement).
- **Loop variant**: the last frame's sound must decay to silence before the loop point.

## UGC / social ad (6–60 s, vertical)

- **Frame 1**: a transient, never a fade-in.
- **Music**: trend-adjacent 95–130 BPM, cut on beats; bed 0.12–0.2 under talk (the ladder). Brand TikTok accounts use the Commercial Music Library in-app; never export a trending sound into the file.
- **SFX**: a swish on every jump cut or none; a hit on the product shot; a pop (0.45) on caption keywords, sparingly; foley on product handling.
- **Muted**: captions carry every claim.

## Trailer / teaser (30–150 s)

- **Act 1**: quiet, emotional, 60–80 BPM, sparse hits.
- **Act 2**: pulses and percussion, rhythm accelerating, a braam on each act break, each break a dropout.
- **Act 3**: everything firing, hits on every cut, pulse 120–140.
- **Title**: riser → **hard cut to 0.5–1.5 s of silence** → title hit (braam + sub drop) → optional button (one last hit or joke).
- VO lines sit in the gaps between hits. LRA is wider than a promo's; −14 LUFS still.

## Podcast clip (15–90 s, vertical)

- Dialogue rules everything: speech at −16 LUFS (deliver −14 for social, −16 for podcast feeds).
- No music under talk by default; if the user wants one, 0.1 (−20 dB), low-passed. Optional 1–2 s intro sting and outro tail.
- A pop or click on caption emphasis is optional and rare. VO fades 2–3 f to remove breath clicks.

## Talking head (YouTube, 1–15 min)

- Speech at −16 to −14 LUFS short-term. Music only on the intro, b-roll stretches and section stings (1–2 bars); bed 0.12–0.2 under speech when present (the ladder), out under the key line.
- Light swishes on graphics and zoom punches; a boom on a rare emphasis joke.
- Room tone continuous under cuts so jump cuts do not drop to digital zero.

## Gen Z edit (7–45 s): two different films

Decide which one it is first, because the cutting authority flips.

**Over speech** (a talking head cut TikTok-style, the common case):
- The speech decides every cut; a beat grid would cut mid-word.
- Bed: lo-fi, house or phonk at 0.14–0.2, low-passed at 6–8 kHz so it is heard on a phone without masking the voice (14–20 LU under it). Drop it to silence under the hook line and the payoff, and bring it back on the next cut.
- SFX: 3–6 per 30 s on the interrupts (pop on a text pop, whoosh on an angle change, hit on the reveal), each 6–12 dB under the voice peak. No `sfx`? Synthesise them (`sfx-cues.md`).
- Dated: a library jazz or ukulele bed reads as 2010s YouTube. If that is the only bed available, prefer no bed and more sound design.

**Music-led** (a montage, no speech):
- Phonk, drill or house at 130–160 BPM (or half-time). Cuts on beats or half bars, with the big changes on bar 1; not on every beat for 30 s straight, which reads as a template.
- A speed-ramp hit on the drop; a low-shelf boost (+3 to +6 dB for one bar) on the drop if pre-rendering the track.
- Meme-style hits, one per joke, generated look-alikes only.

Both: master −14 LUFS / −1 dBTP.

## UI demo / screen walkthrough (15–90 s)

- No music, or minimal tech / lo-fi at 100–120 BPM at 0.1 under VO (0.5 with no VO).
- **A click per interaction** on the press frame (0.8–1.0), varied in level ±0.04 and alternating tracks; soft whooshes on screen transitions; a typing loop under text entry; a success chime on completion; room tone throughout.
- Strip the recording's own audio before placing it.

## Milestone / stat announcement (6–20 s)

- House templates in this family ship silent; this is the obvious upgrade.
- **Music**: music-led at 1.0, 120 BPM so the count can step on beats.
- **SFX**: a tick (0.45, 4 f fade) per count step or per digit roll, accelerating with the count; an **impact on the frame the final number lands** (0.8) with a short shimmer; confetti or burst with a soft pop at 0.5.
- Hold the number through the music's button.

## Chat / message ad (10–30 s)

- One sound per bubble **on its first visible pixel**: received 0.85–0.9, sent 0.75–0.9; trim each file's leading silence with `startFrom`.
- Bed 0.136 (−17 dB) under bubbles, fade in 18, out 45; or music at 1.0 with no VO.
- Tap pop 1.0 on the press frame.
