# Critique: the checklist and the rubric

How to judge a video the way an art director would, from captured frames and the exported file. Use it for the self-critique pass at the end of `direction`, and whenever a user asks "is this good?" or a reviewer (you, another agent, a person) needs to score a cut. Judge the pixels, never the code.

Contents: 1 What to capture · 2 The checklist · 3 The rubric (8 axes × 1–5) · 4 Turning scores into fixes · 5 Report format

---

## 1. What to capture

`capture-frames` at:

- frame 0 and frame 15 (the first half second decides a feed video);
- the fully built frame and the last frame of every scene;
- the first frame of every following scene (each cut is judged as a pair);
- the 10–30f breath and the peak frame named in the Direction block;
- for a loop (a landing-page hero, an event screen): the last frame and frame 0, side by side;
- the moment each on-screen line becomes legible and the last frame before it starts to leave (to measure the hold);
- the final frame.

Assemble a contact sheet with `ffmpeg`, so rhythm, palette drift and repeated layouts are visible at a glance:

```sh
# one tile per second of the export, 30 tiles per sheet (sheet-01.png, sheet-02.png, ...)
ffmpeg -v error -i export.mp4 -vf "fps=1,scale=384:-2,tile=6x5:padding=4" sheet-%02d.png
# or from a folder of captured stills, in name order
ffmpeg -v error -pattern_type glob -i 'stills/*.png' -vf "scale=384:-2,tile=6x5:padding=4" stills-%02d.png
```

Use `fps=2` for a feed piece under 20 s. For sound, measure the export with `ffmpeg` (loudness and peaks, per `sound-design`) and listen to the cuts against the picture if you can.

Two measurements on the export, every time:

```sh
# dead holds (a screen, not a verdict: it misses small moving parts; see below)
ffmpeg -i export.mp4 -vf "scale=320:-2,gblur=sigma=2,freezedetect=n=0.003:d=1.0" -map 0:v -f null - 2>&1 | grep -o "freeze_[a-z]*: [0-9.]*"
# delivery: bitrate (bit/s) and size; then faststart (moov must be listed before mdat)
ffprobe -v error -show_entries format=bit_rate,size -of default=nw=1 export.mp4
ffprobe -v trace export.mp4 2>&1 | grep -o "type:'\(moov\|mdat\)'" | head -2
```

**Every flagged range must be confirmed before it counts**, in any format (a sting, a diagram explainer, a UI demo, a launch hero): at 320 px wide a 150 × 60 px chip crossing the frame, a counter ticking or a thin stroke moving changes too few pixels to clear the threshold, so the meter reports "frozen" while the picture moves. Confirm each range in this order:

1. Re-run `freezedetect` on a **crop around the part that should be moving** (`crop=w:h:x:y,` before `scale`), or compare neighbour PSNR on that crop.
2. If the shot has a camera drift or creep, the crop never reads frozen (a ±4 px drift alone defeats it), so the crop proves nothing either way: confirm on a **4 fps strip** of the range instead (`fps=4,scale=480:-2,tile=8x1`) and look for the moving part.
3. A range is a dead hold only if the strip shows nothing visible changing. Small but real motion clears the meter's flag; it does not clear the viewer's sense of a stall, so a strip of 1.5–2 s where only a 60 px chip moves is still worth a larger move (Motion).

**The strip is mandatory, for every flagged range, and you look at it.** A 1 fps contact sheet cannot show a 1.5 s stall (it has one or two tiles in it), so it neither confirms nor dismisses a flag. Save each strip and list them in the report:

```sh
# one strip per flagged range A..B seconds: 4 tiles per second, 8 per row (add a row per 2 s)
mkdir -p strips
ffmpeg -v error -ss 10.4 -to 14.8 -i export.mp4 -vf "fps=4,scale=480:-2,tile=8x3:padding=4" -frames:v 1 strips/hold-10.4.png
# thin parts (a stroke, a dot, a ticking digit): the same strip on a full-resolution crop around them
ffmpeg -v error -ss 10.4 -to 14.8 -i export.mp4 -vf "crop=640:360:400:300,fps=4,tile=8x3:padding=4" -frames:v 1 strips/hold-10.4-crop.png
```

Freezes that touch (one's end is the next one's start) are one hold: add them up. Adding a creep only to quiet the meter is not a fix; adding a move the viewer can see is.

> **A confirmed dead hold is never "left as deliberate".** A freeze over the limit (1.5 s feed, 2.5 s elsewhere) outside the final end-card hold, or a hold whose only motion is a creep you cannot see on the 4 fps strip (a 3–6% scale over 2 s is invisible), is a Fix that must be fixed: shorten the hold, overlap the next beat's first motion into it, or add a move the viewer can see. Writing it under "Left as deliberate" does not clear it.

**Loop seam** (anything that plays as a loop): the last frame and frame 0 must be no more different than two consecutive frames inside a hold. Measure on a 320 px scale: PSNR ≥ 30 dB between them, or the cut is one of the film's designed matched cuts (the owner skill says how to build the seam):

```sh
ffmpeg -v error -sseof -0.04 -i export.mp4 -frames:v 1 -vf scale=320:-2 last.png
ffmpeg -v error -i export.mp4 -frames:v 1 -vf scale=320:-2 first.png
ffmpeg -i last.png -i first.png -lavfi psnr -f null - 2>&1 | grep -o "average:[0-9.inf]*"
```

## 2. The checklist

**Feed** in this checklist means any autoplaying, scrolling placement: TikTok, Reels, Shorts, Instagram, X, LinkedIn, Product Hunt's gallery, landing-page heroes and store autoplay. Each gets the feed limits (the 1.5 s dead-hold limit, brand by 3–4 s), including a 16:9 master posted there.

Severity: **Blocker** = do not ship. **Fix** = fix unless the Direction block says it is deliberate. **Polish** = fix if time allows. "Left as deliberate" clears a Fix or a Polish item, **never a Blocker, and never a dead hold or an imperceptible creep** (§1): a deliberate Blocker is still a Blocker, and a stall the viewer feels is still a stall. If the brief itself forces one (a loop that must also end on an end card), change the build (the owner's recipe), not the label.

### Idea and story
- [Blocker] The SMP is visible: someone who watches muted (feed) or listens without looking (VO explainer) can say it back.
- [Blocker] Swap test: with the logo covered, the film could not belong to a competitor.
- [Fix] **Covered-logo test, per beat**: cover the mark and the name on one frame from every beat, the proof beats included. Any beat that could close a competitor's film (a generic dashboard, a tile wall, a stock object such as a shield or a rocket on its own, a line on a flat colour) is rebuilt from the device; it usually means the device was dropped after the reveal.
- [Fix] Every beat traces to the SMP. A beat whose job you cannot name is cut, not decorated.
- [Fix] **Copy read**: each problem or tension line, read alone and muted, reads as the pain. If it could be the product's tagline (a promise, a boast), rewrite it.
- [Fix] The value claim lands by the second beat; everything after is evidence.
- [Fix] The memorable moment exists at the frame the block says, and it comes from the idea, not from an effect.

### Hook and first frame
- [Blocker] Feed placements: the frame at 0.5 s already shows the hook. No fade from black, no empty frame, no logo-first card.
- [Fix] YouTube, click-to-play and feeds: the **tension** (the problem, the danger, the question, the thing half-way through changing) is on screen by 1 s, and frame 0 is already in motion. An empty diagram, an empty stage or a headline typing over two idle boxes is setup, not a hook.
- Stings, channel intros and end cards are logo-first by definition: judge their hook on whether motion has started by frame 15 (not an empty field with a speck in it) and the mark or name is legible by the lock frame.
- [Fix] Brand is present by 3–4 s in feed placements (feed ads, and any film that also plays in a feed or as store autoplay): the product in context (a product shot, the UI, the icon) or the mark in a corner or header counts, so a problem-first film or a later name reveal still passes; the name alone at the end does not.

### Frame
- [Blocker] Every word, logo and face that must be read is inside the safe zone for each aspect it ships in (9:16: inside x 120–840, y 270–1210 when the placement is unknown or multi-platform; for one named platform use its own row in `pacing.md`, e.g. Reels-only keeps 65 px sides, so a centred lockup is not capped at 600 px).
- [Fix] One focal point per frame; the eye knows where to go within 15f of each cut.
- [Fix] Palette discipline: background, ink, muted, one accent; the accent only on the focal element and the CTA; one punch colour per frame. One **semantic state colour** (error or threat red, for an attacker, a failure, a warning) may share frames with the accent if it is always paired with a shape or a label and never colours a message line.
- [Fix] Hero and end-card frames leave negative space (content fills 40–60% of the frame). Measure the content group (the object, the lockup); a frame-edge element (a border, a ground line, a boundary drawn around the frame) is not content.
- [Polish] Radial glows and lifts sit on the subject, not the canvas centre; the end card is the flat brand hex, or a lift that keeps its dither (no stepped rings in the export).
- [Polish] At least two depth layers (background treatment, content, accents); no empty flat background unless the style is deliberately minimal or it is brand identity (a sting or end card on the exact brand hex).

### Type
- [Blocker] Every message line holds for `max(30, 9 × words + 15)` frames after it is legible (30 fps; at 24 fps use `pacing.md`'s 24 fps column, `max(24, 7.2 × words + 12)`), and never more than 15 characters per second.
- [Blocker] Contrast ≥ 4.5:1 for read text under 60 px (≥ 3:1 at 60 px and above), measured against what is actually behind it. A low-contrast accent (< 4.5:1 on its ground) never carries text under 60 px; a high-contrast accent eyebrow (yellow on near-black, about 13:1) passes.
- [Fix] ≤ 2 type families; a size ratio ≥ 1.5× between levels; display tracking tightened (−0.02 to −0.045em).
- [Fix] ≤ 7 words on screen at once in feed, ≤ 12 in explainers; the end-card lockup (name + tagline + platform or URL line) may carry up to 9 if it holds ≥ 90f and its line is ≥ 40 px in a feed. The count is of message lines (headlines, captions, the line being said); a diagram's labels are capped separately (≤ 5 labelled parts, each label on its part, `explainer`).
- [Polish] No widows (a single word alone on the last line of a headline).

### Motion
- [Fix] Entrances decelerate, exits accelerate and are about 0.6× as long; nothing eases out into a cut.
- [Fix] Not everything enters the same way: at least two entrance behaviours across the film, chosen by role.
- [Fix] Staggers exist where siblings arrive (no lockstep), and stay under about 15f total for a group.
- [Fix] Multi-key moves do not stop at each key (watch camera paths frame by frame for a stall).
- [Fix] One ambient behaviour per held frame; holds share phase across words on a line.
- [Fix] Overshoot is used for one role (a button, a badge, a stamp), not on everything; enterprise and luxury tones have none.
- [Fix] Nothing passes through read type: a moving element never crosses a word that is on screen, and a lockup (mark + name) moves as one group. During a camera or world move (a pull-back, a truck), the world is routed out of the headline band or fades under a feathered knockout (≥ 40 px soft edge); a hard-edged patch, where a line stops dead beside the words, is the same fault. Labels in the moving world land after the move settles.
- [Fix] A camera move that carries the peak is visibly under way on the hit frame (its ease-in started 10–14f before), and a push ends with its subject in the centre third at ≥ 40% of frame height.
- [Polish] Anticipation before big moves; settle after them.

### Transitions
- [Blocker] No plain crossfade between scenes.
- [Fix] Every non-cut transition has a carrier visible in the frames either side of the cut, at matching position, size and colour.
- [Fix] One signature family, one workhorse, hard cuts only where the block allows them.
- [Fix] Camera drift has died before a matched cut (the two frames match, not "almost").
- [Polish] One direction of travel for progress across the whole film.

### Pacing and energy
- [Blocker] The beat table's frame ranges sum to the video's length, and the export's duration matches.
- [Fix] There is a breath before the peak (10–30f of picture, even when the music's dropout under it runs longer) and the peak is the most contrasting moment in the film. Its placement follows the owner (launch-type films: `launch-taste` step 7's band for the kind of film, which may be a name reveal early plus a later completion as the one peak).
- [Fix] The peak reads with the sound off: the biggest picture change lands on the hit frame and the words change with it. No peak (name reveal or payoff line) is a line on a flat colour flood; the device completes on screen and holds ≥ 30f before any flood.
- [Fix] Opening pace: the idea's device (or its first unit) is on screen and acting by frame 60; a run of repeated units reaches its first few in ≤ 2.5–3 s, and between two units nothing visible stops for more than 1 s. A duration claim ("ready in 30 seconds") is shown compressed (≤ 75f, in steps or a time-skip), not waited out. A name reveal on an empty ground mid-film (a mark and name with nothing of the device in frame) is a mid-film logo card: the film gets one logo card, at the end.
- [Fix] The beat interval matches the energy chosen (Hyper 8–14f, High 18–30f, Medium 30–50f, Calm 45–70f) and varies along the curve.
- [Fix, never deliberate] No dead holds: on the `freezedetect` pass above, any confirmed freeze longer than 1.5 s in a feed piece, or 2.5 s elsewhere, is a Fix (the final logo or end-card hold, 75–120f with its one ambient behaviour, or a standalone sting's ≥45f hold, is exempt; a mid-film logo card is not). **A line held at its formula is not a dead hold only if something visible changes during it** (the device acting, the next beat's first motion overlapping in, an ambient you can see on the 4 fps strip); in feeds, where a 4+ word line's formula runs past the 1.5 s limit, the line holds and another element acts, or the line is split. A line held more than 2× its formula is the same fault whatever else moves. A creep you cannot see on the strip is not change, and this item cannot be "left as deliberate".
- [Fix] The logo holds 75–120f (10–30f only in beat-cut styles; a standalone sting follows `brand-sting`'s budget table, ≥45f), with nothing new after the CTA (a designed loop seam's last 15–25f, which grow frame 0 back, are exempt). Its one ambient behaviour is visible: if consecutive held frames measure as identical on a crop, the creep is too small (use 1%, or a flicker or light that fits the idea).

### Delivery
- [Blocker] The file fits its destination. Landing-page hero: H.264, ≤ 5 Mb/s at 1080p (≤ 3 Mb/s at 720p), ≤ 15 MB, `+faststart` (moov at the front), plays muted and loops cleanly (last frame cuts back to frame 0 without a jump). Platform uploads (YouTube, feeds) re-encode, so anything under about 20 Mb/s is fine; store previews follow `app-store-preview`'s specs. A loop's seam passes the loop-seam measurement in §1. A file over budget is re-encoded (`-c:v libx264 -crf 23 -maxrate 5M -bufsize 10M -movflags +faststart`); if it still is, the grain or noise in the picture is the cause (`three-look`).

### Sound (when the film has any)
- [Blocker] VO is intelligible over the bed; no clipping in the export.
- [Fix] Effects sit on their visual events (UI sounds on the first visible pixel or press frame; soft lands on the settle frame; impacts on the impact frame ±2f).
- [Blocker] A whoosh, swoosh, swish or air-sweep anywhere fails (`sound-design`'s ban): transitions get the picture's own sound or none.
- [Fix] Music starts and ends with the picture; a sonic resolve on the logo.
- [Fix] Cuts sit on the music's beats where the film is music-led.
- [Fix] A film meant to be heard has a loudness range of about 4–14 LU, and outside its named silence the momentary loudness never sits under −40 LUFS for more than 2 s (`sound-design`, Sparse, picture-led films); the first 3 s of a sound-on film are audible. A declared bed is heard: it sits around −32 LUFS momentary under the effects, not at −50, or the film plays as clicks over silence.
- [Fix] Feed delivery (X, Kickstarter, Reels) is mastered to about −14 LUFS integrated, −1 dBTP; platforms never turn a quiet file up.
- [Fix] One intimate voice (a diary, a voice note, a private recording) is never stood in for by a crowd murmur: on-screen words plus a close breath or room tone, or the real line recorded close and dry with the bed out.

## 3. The rubric

Score each axis 1–5 from the frames and the export. Write one sentence of evidence per score ("frame 412: headline overlaps the TikTok right column").

| Axis | 1 | 3 | 5 |
| --- | --- | --- | --- |
| **Idea** | A feature list; passes the swap test for any brand | One clear SMP, but shown generically, or the device holds for the first third and the proof beats could be any competitor's | "We show X as Y" is visible in the frames; a memorable moment only this film could have |

Idea, covered-logo test: cover the mark and name on one frame per beat and ask "could this beat close a competitor's film?" Score Idea no higher than 3 when any proof beat or the peak fails it, however strong the opening.
| **Hook** | Fade from black or a logo card; nothing at 0.5 s | A clear opening line by 1 s, but static | Motion and the core tension on screen by frame 15; you want to see the next second |

Hook for stings, channel intros and end cards: 1 = an empty or near-empty field for the first 0.5 s (a thin line on a dark field counts as near-empty: judge visual mass, not span); 3 = motion by frame 15 but small in a large dead field; 5 = something already moving and filling a deliberate part of the frame at frame 0, building straight into the mark.
| **Frame** | Several competing focal points; text in unsafe zones | Clean, safe, but centred-stack layouts in every scene | One focal point per frame, deliberate negative space, layouts vary by job, a disciplined palette |
| **Type** | Unreadable holds or contrast; 3+ families | Readable and consistent, but flat hierarchy | Every line reads twice; strong hierarchy; type moves only where meaning needs it |
| **Motion** | Linear or bouncy everywhere; the same fade-up on everything | Consistent easing, but uniform; some stalls or eases into cuts | One physics; entrances by role; staggers, settles and holds that breathe; no stalls |
| **Transitions** | Crossfades or a new trick per cut | A consistent workhorse, but no signature or unmotivated wipes | A motivated signature at the turns; carriers match exactly across cuts |
| **Pacing / energy** | Flat tempo; too fast to read or dead holds | A shape is visible, but the peak doesn't stand out | A clear curve: a breath, a peak at the planned frame, a calm resolve; intervals match the energy |
| **Sound** | Missing where it was planned, clipping or mistimed | Levels fine, cues roughly placed | Cues land on their frames, the bed supports the VO, a sonic resolve on the logo |

Mark Transitions "n/a" for a single-scene piece with no cuts (a sting, a one-shot loop), and Sound "n/a" for a deliberately silent film and average the axes that remain.

**Ship bar**: no axis below 3, and an average of 4 or more. Any Blocker in the checklist overrides the score.

## 4. Turning scores into fixes

Fix the lowest axis first; an Idea of 2 is not rescued by Motion of 5.

| Low axis | Usual cause | First fix |
| --- | --- | --- |
| Idea | The film describes features | Rewrite the memorable moment around the subject's own noun, number or UI; restate "We show X as Y" and rebuild the peak scene |
| Hook | The film starts with setup | Move the strongest image to frame 0 and start it mid-motion; cut the first beat |
| Frame | Everything centred; too many elements | Cut one element per frame; anchor to a grid edge; push secondary items to muted |
| Type | Holds computed from the entrance, not legibility | Recompute holds with the formula; split long lines; raise contrast |
| Motion | One entrance for everything; segmented multi-key moves | Assign entrances by role from `motion-language`; run multi-key paths through a monotone spline |
| Transitions | A transition chosen per cut | Re-pick one signature and one workhorse; convert the rest to exit-then-cut |
| Pacing | One interval end to end | Re-draw the curve; add the breath; tighten the cascade to the High interval |
| Sound | Cues placed by eye | Re-place cues against frame numbers from the beat table; follow `sound-design` levels |

Re-capture the same frames after fixing and re-score. Never report a score for frames you did not look at.

**A fault you found is fixed before delivery, even when a full render is slow.** Knowing the fix and shipping without it is the most common way a film lands below the bar. Re-render only what changed and splice it in:

```sh
# re-render the changed range (frames are inclusive) with audio off, then swap it into the full export
npx @genmotion/cli render fix.mp4 --frames 150-239 --no-audio --json
ffmpeg -i full.mp4 -i fix.mp4 -filter_complex "[0:v]trim=end_frame=150,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[0:v]trim=start_frame=240,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1[v]" -map "[v]" -map 0:a -c:a copy -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart spliced.mp4
```

If the fix moves timing (a beat starts earlier), the audio cues move with it: re-render in full instead. A partial render uses the same renderer and settings, so the seams are invisible; check the two frames either side of each seam. Then re-measure the exact file you deliver (freezes, loudness, cue onsets): a fix that never reached the delivered file did not happen.

## 5. Report format

```markdown
## Critique (<date>)
Scores: Idea 4 · Hook 5 · Frame 4 · Type 3 · Motion 4 · Transitions 4 · Pacing 4 · Sound 4 → avg 4.0
Blockers: none
Fixed this pass: beat 5 headline held 36f → 60f; drift stopped before the 540 cut
Left as deliberate: hard cut at 660 (on the drop)   ← Fix or Polish items only; never a Blocker, a dead hold or an invisible creep
Frames checked: 0, 15, 75, 76, 180, 200, 262, 300, …, 899
Strips (4 fps) checked: strips/hold-10.4.png (first run of units: moving), strips/hold-18.3.png (fixed: next run overlaps in)
```

Append it to `VIDEO.md` so the next session sees what was judged and why.
