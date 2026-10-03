# Sound to picture

How sound makes a launch film feel caused rather than decorated. `sound-design` owns levels, sources, the beat grid and loudness; this file is about *meaning*: which sound, how long, which way, and what to take away. Frames at 30 fps unless noted.

Evidence: only ten of the twenty study films had real audio, so several rules here rest on one precisely measured film; they agree with the house templates and the general research, and are marked **[one]**, **[two]** or **[several]**.

Contents: Who leads · Cue placement · Cue shape · Making room · Payoff and endings · Music and the cut · Muted placements · Checks

---

## Who leads

Decide one lead per film and let the others serve it:

| Lead | Use when | What the others do |
| --- | --- | --- |
| Music | Hype, stings, recaps, kinetic type | SFX only on hero events; the music decides the cuts |
| The product's own sound | The product clicks, plays, speaks, renders sound | Music leaves when the product speaks and stays out; the sonic logo is built from the product's sounds |
| Voice | A product that needs a sentence of explanation | A bed under it; cuts in the breaths; sparse SFX |
| Picture | Muted feeds, landing heroes | Sound is a reward for unmuting, never the only carrier of a claim |

A film with no lead (a dry voice with no bed, or a wall of music with every cue buried in it) reads as a screen recording or a reel. Both showed up in weak films: an LRA (loudness range) near 2 LU is the measurable symptom. [two]

## Cue placement

- **Never early.** UI cues in the best-measured film landed 20–45 ms after the first changed pixel (1.4–2.5 frames at 60 fps; about 1 frame at 30). Slightly late reads as caused, like a click following a finger; early reads as a glitch. [one] The house table in `sound-design` puts a click on the press frame and tolerates up to 1 frame early, which is usually masked in a busy film; when the sound is what the film sells, or the cue is exposed in near-silence, lean late, never early.
- **On the event, not the beat.** Interaction sounds go on the state change, even in a music-led film. Arrivals can sit on the beat; labels need not. [two]
- **Park the cursor before the event** so the press is the only change on screen and the sound has one thing to belong to. [one]
- **Space repeated demonstrations on a fixed grid** (one film used exactly 1.335 s between interactions) so the viewer anticipates and then hears each one; break the grid once for the resolve. [one]
- **Cut in the voice's breaths**: hard cuts inside the 0.3–0.6 s pauses between phrases feel motivated. [two]
- **Two sync points can be enough** for a sting: the entrance and the lock, then a decay. [two]

## Cue shape

- **Length = motion length.** Instant changes (a fill, a press) get 50–70 ms; a sliding knob that travels for about 100 ms gets a glide of about 125 ms. The ear and the eye then agree on the shape of the event. [one]
- **Pitch direction = meaning.** Rising for confirm, on, add, send, success; falling for cancel, off, remove, error. Every cue in an affirmative demo rose 8–17 semitones. [one]
- **Register = weight.** The primary action lowest and roundest; light navigation highest and brightest; a state change with travel gets the widest sweep. [one]
- **Tonal cues in the music's register** sit in the film's world; broadband sample-pack clicks sit on top of it. Choose by tone: a calm film wants round, nearly pure tones; an instrument film can take clicks and ticks. [one]
- **Timbre = the product's tone.** One family of cues per film (glass, wood, soft plastic, a synth tone). A calm-trust fintech or premium product never gets a casino, cash-register, coin-jangle or game-reward chime unless the product is about coins or games: a payment success is a clean confirm tone a step above the film's earlier ticks, decaying ≥ 0.5 s. [two, as a fault]
- **Visualise a sound as an echo of its source's shape** (a ripple the shape of the button that made it) so muted viewers "hear" it. [one]

## Making room

- **Remove the bed to feature a sound.** The film that sold a sound let the music stop at the moment interaction began, and only its tail rang out: the floor under each successive cue fell (about −33, −39, −49, −55, then −88 dB) while the cues stayed at a constant level. Clarity came from the floor dropping, not from the cue rising. [one] The house version: duck the score 10–12 dB under the product's own sound (`launch-playbook`).
- **Let the picture calm where the sound leads.** Motion was lowest exactly where the cues were clearest. [one]
- **The reverse also works**: let the picture simplify while the music climbs to the finale, so the lockup feels inevitable. [one]
- **Never more than about two sounds at once**, and none over a VO word that carries meaning (`sound-design`).

## Payoff and endings

- **Cut the music on the payoff.** A beat-locked track that stopped within a frame or two of the hero number landing, followed by a low pad with its high end closing, made the silence the exclamation mark. [one] Use it for numbers, reveals and "it's done" moments; do not use it on every chapter.
- **Anchor the lift.** A filter opening, a +5 dB lift or a drop means something only on the strongest picture change; placed mid-beat it is noise. [one, as a fault]
- **The peak is the loudest event, the sonic logo sits under it.** In every film, not only a trailer, the 10's cue has the loudest 50 ms and momentary reading, and the end card's sonic logo sits ≥ 2 dB under it, so the film resolves on the mark instead of climaxing there. A judged wallet film had its logo bell about 3 LU over the payoff cue, and the end card became the climax; a design-tool film had its typing louder than its hit. [two]
- **Give the product name the sound, not the parent brand.** The best end sting was the product's own cue vocabulary turned into a rising four-note figure, landing on the product name; the org prefix arrived silently. [one]
- **Tails, not hard stops.** Every film whose music was still at full level on the last frame felt cut off; every one with a 0.5–3 s decay or a button on the lock felt resolved. [several] (`sound-design` §Silence and endings has the recipes.)
- **No silence by accident.** A silent head (4 s of typing with no ticks), a silent end card after the VO ends, or a sound feature announced with no sound, each read as unfinished. [several] The short version counts too: two 0.8–0.9 s holes of digital zero right after a payoff cue read as a broken file [one]. The fix is tails, never noise: every cue decays or fades over 80–150 ms, the payoff rings into the next beat, and cues sit on the visible events so gaps stay short. Never synthesise noise as a bed, room tone, ambience or "air" (no noise generators under a film): on phones and headphones it reads as wind or hiss. [the user, on a film with a −32 LUFS synthesised room tone]
- **No long silent end card.** 8–10 s of silence under a held card felt dead; hold the CTA 2–4 s with a tail, then stop. [two]

## Music and the cut

- A track at 120 BPM puts a beat every 15 frames and a bar every 60; arrivals on beats and big changes on bar lines lock picture to sound. The best music-led film cut within 1–5 frames of the grid but did not cut on every bar. [one]
- No track supplied → source one per `sound-design` Music and fit the beat table to its grid with `sound-design`'s `references/beat-sync.md` (peak on its drop, end card on its measured button).
- A flat library track has no peak; give it one (`launch-playbook` §Sound) rather than accepting a flat wall.
- An opening filter (dark and muffled, then full band) is a strong reveal arc if the full band arrives on the reveal. [one]
- **A title-card interleave** (the social launch cut): cards land on beats (a card's first legible frame on the beat, not its first pixel), product beats carry the effects (a click on the press frame, pop clusters on a burst, coins only when the product is about coins, a soft hit when a swarm settles), and the URL card sits on the track's button or a decaying hit. Keep the cards themselves quiet (a soft tick at most) so the product's sounds read as the events. [several, from the social study]

## Muted placements

- Every claim must be readable in picture and type. The sound plan still exists for click-to-play viewers.
- Visualise the sounds that matter (a ripple, a meter driven by the real audio amplitude, a waveform), and give them the same timing as the sound would have.
- A film whose subject is sound should not ship muted: make a sound-on master and a muted cut, or show the product making the sound in picture.

## Checks

1. Pick three cue frames: on a 4 fps strip (or frame-by-frame capture) around each, the first changed pixel is on or up to 2 frames before the cue's onset, never after it.
2. A sustained motion (a slide, a glide, a camera move under a tonal swell) has a sound of about the same length.
3. Where the product or payoff leads, the bed's 0.5 s RMS sits ≥10 dB below its level either side (`ffmpeg` `astats` on the music stem).
4. The last 1.5 s: the music is decaying or has hit its button; it is not at full level on the last frame.
5. The export's LRA is above about 3 LU (a living mix) and, for a short feed promo, at most about 10 LU, measured with `ffmpeg` `ebur128` on a −14 LUFS master.
6. The peak cue's loudest 50 ms RMS is the film's highest and the sonic logo's is ≥ 2 dB under it; no cue's tail is cut off (the 50 ms rows before each silence fall over 100–150 ms), and no synthesised noise bed, room tone or air layer is anywhere in the mix.
