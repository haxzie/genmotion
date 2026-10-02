---
name: direction
description: "Creative direction for any new video, read before choosing or building: turns a request into one proposition, an audience and placement (sound on or off, feed or site), an idea (we show X as Y), a style family, an energy curve, a pacing budget in frames, a transition grammar, a sound plan and one memorable moment, then writes the Direction block and a timed beat table into VIDEO.md. Ends with a scene-by-scene directing loop and a self-critique on captured frames. Read it first for every new video, and whenever a video feels generic, flat or rushed."
---

# Direction: decide what the film is before you build it

An agent that goes straight from request to scenes makes the median video: everything fades up, everything floats, every cut is a different trick, and nothing peaks. A director makes a short chain of decisions first, each one narrowing the next, and writes them down so the build (and the next session) can check itself against them. This skill is that chain. The owner skill then supplies the format's structure; `motion-language` supplies the moves; `sound-design` supplies the mix.

All frame numbers are at 30 fps. At 60 fps double them; at 24 fps multiply by 0.8 and round (`references/pacing.md` has the hold table at 24, 30 and 60 fps).

## When to use

- Every new video, right after the router's Step 0 (`VIDEO.md` check) and before picking an owner skill.
- A video that "feels generic", "feels flat", "is too fast", "has no idea": re-run Steps 2–9 against what is built.
- Before export: the self-critique pass at the end of this skill.

Skip it for a small edit to an existing video ("make the logo bigger"). Do the edit and leave the direction alone.

## Existing videos: respect VIDEO.md

- If `VIDEO.md` has a `## Direction` block, it is the brief. Build to it. Change a decision only when the user asks for that change, then edit the line in place and add `(changed: <reason>)` so the next session knows it was deliberate.
- If `VIDEO.md` exists without a Direction block (an older video), run `project-overview` and `capture-frames` on each scene, then write the Direction block that describes **what is already there**. Do not restyle a video the user did not ask you to restyle.
- A revision is not a confirmation. After the user corrects the direction, show the updated block before building on it.

## Part A: before you pick the owner

### Step 1: formed or unformed?

A request is **formed** when three things are readable: the message (what the viewer should take away), the material (product, footage, data, logo, script) and the occasion (where it plays and why now). "A 30s launch film for our invoicing app, landing page, here are the screenshots" is formed. "Make a video about our company" is unformed about the telling, even if the facts are all on a URL.

- **Formed**: do not ask anything that the request answers. Choose the rest and state it.
- **Unformed**: ask at most **three** questions, all in one message, and only ones whose answer changes the direction. In order of how much they change it:
  1. Where does it play, and with sound or without? (feed, site, keynote, store page)
  2. The one thing a viewer must remember. Offer your best guess as the default answer.
  3. How it should feel, or what it must not feel like. Offer two options with a recommendation.
- "Just make it", or no answer: choose, and say what you chose in one message with two visibly separate groups, **You told me** and **I assumed**, so a wrong assumption is one word to fix.

Questions you never need to ask: length and aspect (the placement implies them; see the decision tree), fps, fonts, easing.

### Step 2: the proposition, the audience, the placement

- **Single-minded proposition (SMP)**: one sentence, the one thing the viewer takes away. Outcome language ("Invoices that chase themselves"), not inventory ("12 new features"). If you cannot write it in one sentence, that is the question to ask.
- **Audience**: who, and what they already know. A developer audience lets you show code; a buyer audience needs the outcome first.
- **Placement and sound**: feed (autoplay, sound off by default, 9:16 or 4:5, platform UI over the frame) · landing-page hero (muted autoplay loop: browsers block sound on autoplay, so sound is a bonus for the click-to-play version; 16:9, small file, loop-safe last frame) · YouTube, keynote or a click-to-play page video (sound on, full attention, 16:9) · store page (muted autoplay, device-framed) · in-app or docs (sound optional, loopable). Sound-off placements must carry the whole message in picture and type.
- **What it is**: when the subject is a product, a stranger watching muted must be able to say what kind of product it is (an app, a web tool, a device, a service) from the frames. An app film shows its UI; if no screens were supplied, the owner skill says how to build a representative one.
- **Feeling**: two adjectives and one "not": "confident, warm, not corporate". The "not" is what stops the median choice.

### Step 3: the idea

Write it as **"We show X as Y."** X is the subject; Y is the device that makes it visual. "We show a cluttered inbox as a desk buried in paper that one assistant clears." "We show 10,000 stars as a night sky filling up." A feature list is not an idea.

For an unformed request, sketch three concepts down different paths before choosing: the subject's own visual world, the feeling, and an unexpected format (a countdown, a letter, a front page, a chat thread, a map). Pick the least obvious one that still serves the SMP. If two concepts have the same layout silhouette (centred headline, product underneath), replace one. Tell the user which typical version you left behind and why.

**Swap test, now**: put a competitor's name on the idea. If it still works unchanged, it is not an idea yet. Add the subject's own nouns, numbers or UI.

Now go back to the router and pick the owner. Then come back for Part B.

## Part B: after you have read the owner skill

### Step 4: style family

Pick exactly one. The families are measured from GenMotion's own house style; `references/style-families.md` has each one's palette, type, motion, transition and sound signature with numbers. Read it before writing the Palette, Type and Motion lines of the Direction block.

| Family | Pick it when | Signature |
| --- | --- | --- |
| A. Beat-cut kinetic type | Logo + copy only, music-led, hype | One word per card, black/white, hard cuts on an eighth-note grid, 8f per card |
| B. Soft-light SaaS | App or SaaS UI, launch or demo | White/creme stage, real UI magnified 2–2.5×, a cursor drives it, shared elements cross cuts |
| C. 3D product hero | A physical-feeling product, fintech, consumer | Glossy 3D objects, one electric brand colour as fills, slams out of the lens, colour floods carry cuts |
| D. One-shot camera film | A desktop or world to travel through | No cuts: one keyed camera, 1.5–3 s moves, log-space zoom, circle reveals |
| E. Chat-UI social | A conversation is the story; vertical feed | Pixel-faithful chat app, bubbles spring from the tail, one sound per bubble |
| F. Whiteboard explainer | Teaching a concept with VO | Hand-drawn strokes on white, one left column, board erases between ideas |
| G. Textured tactile | Retro-tech, crypto, editorial collage | Paper, dither or HUD texture, pixel-block wipes, pulse ambience |
| H. Music video | The user's track is the brief | A music clock drives everything, scenes on bar lines, flash-to-white on cuts |
| I. Brand guide / identity loop | The brand system is the content | Mark, palette, type specimen and lockup shown as content; visible grid |
| J. Milestone / stat | One number to celebrate | Big tabular number tallies, punches 1.06 on landing, confetti within 2f, then breathes |

The owner skill usually names a default family; follow it unless the assets or the audience say otherwise, and write why. Brand colours override a family's stage: on a brand ground keep the family's UI, motion and type, and let the brand hex replace the stage (style-families.md). Edited user footage has no family: the footage is the look.

**Family versus owner**: the owner's pacing and beat sheet win; the family supplies the look (palette, type, texture, transition style, sound colour). A technical explainer in family G keeps the explainer's calm scene lengths and borrows G's HUD panels and wipes, not G's 25–30f beat rate. Type sizes and weights in every family follow `three-type`'s size table (the house design standards: hero 72–130 px, headline weight ≤ 500, nothing under 28 px).

### Step 5: energy curve

Energy is 0–10 per beat. Draw the shape for the format, put exactly **one peak** at the moment of greatest contrast (biggest scale jump, fastest cuts, most saturated colour, biggest camera move), and put a **breath** of 10–30f (stillness, black, or silence) right before it. The picture's breath stays 10–30f even when the music's natural dropout under it is longer: keep the last line or the held diagram on screen through the rest of the dropout, never a textless, near-still frame for 2 s. Contrast is what makes the peak feel big: if every beat is an 8, none of them is.

The peak is a picture event first: it gets the film's **biggest scale change or camera move** (a push into the device, a part growing to hero size, a punch-in), not just a colour change on the same layout. Calm formats too: an explainer's "click" is quiet in tempo but is still the biggest scale change in the film. Sound reinforces the peak; it cannot make one on its own.

| Format | Shape | Where the peak goes |
| --- | --- | --- |
| Launch / reveal (20–60 s) | Quiet tease (3) → build (5) → **reveal (9)** → feature cascade (6–8, micro-peaks) → hero + name (8) → end card (3) | Reveal at 25–30% of length |
| Explainer (30–180 s) | Low plateau in steps: problem (4) → solution (7) → steps (5–6) → payoff (8) → answer restated (5) | Payoff at 75–90% |
| Sting / ident (2–10 s) | Anticipation (3) → **hit (10)** → settle and hold (4) | Hit at 40–60% |
| Social ad, feed (6–30 s) | Front-loaded: hook at 8 by frame 15, a micro-peak every 1–3 s, CTA last 3–4 s | The hook itself; a second smaller peak on the proof |

**Hook, every format with an audience to win** (feeds, YouTube, click-to-play): frame 0 is already in motion, and the **tension** (the problem, the danger happening, the question, the thing half-way through changing) is on screen by 1 s (30f). An empty stage, two idle boxes or a headline typing over nothing is setup, not a hook; open on the moment the setup was going to lead to.
| Trailer / hype (30–150 s) | Staircase: each act ends higher, a 0.5–1 s drop, then the crescendo, title, button | Crescendo at 80–90% |
| Milestone / data (8–30 s) | Steps to one hero number | The number landing |
| Music video | Follows the track's own energy | The track's drop |

### Step 6: pacing budget

These are budgets, not suggestions. Do the arithmetic before building any scene; the words decide the length, not the reverse.

| Energy | New information every | Typical scene | Families |
| --- | --- | --- | --- |
| Hyper | **8–14f** (0.27–0.47 s) | 70–160f | A, montage passages, H lyrics |
| High | **18–30f** (0.6–1.0 s) | 33–180f | C, I, fast social |
| Medium | **30–50f** (1.0–1.7 s) | 90–300f | B demos, VO-led launches |
| Calm | **45–70f** (1.5–2.3 s) | 200–240f | E, F, J |

House average across all templates is about 30f between new pieces of information, and the median scene is 4.3 s. Within a scene, something meaningful still changes every 1–3 s in feed formats.

- **Voiceover**: 2.5 words/s by default, 2.3 for breathing room, 2.0 for a soft premium read. Budgets: 15 s ≈ 35 words, 30 s ≈ 70, 45 s ≈ 105, 60 s ≈ 140. VO enters 5–8f after the film starts and 3–8f after each cut (house median +6f); leave the last 45–60f (1.5–2 s) VO-free for the logo. Over budget: cut words, never speed up the read. Check per beat too: a line of N words needs about 13 × N frames, and must end inside its own beat unless it deliberately bridges the cut.
- **On-screen text hold**, counted from the frame it is legible (the entrance does not count): `hold_frames = max(30, 9 × words + 15)`, and never more than 15 characters per second. A line in a fast sequence may drop to 18f only if it is 1–3 words. Anything shorter than that is texture, not a message.
- **Words on screen at once**: ≤7 for feed, ≤12 for explainers, counting message lines only (headlines, captions, the line being said); a diagram's labels are capped by the owner (`explainer`: ≤5 labelled parts, each label on its part). One idea per text beat.
- **Cut rate** by platform, safe zones per aspect, and type minimums: `references/pacing.md`. Read it for any 9:16 deliverable; platform UI covers up to 35–37% of the bottom of the frame.

### Step 7: transition grammar

Decide the grammar once for the whole film; never pick a transition per cut. GenMotion's templates handle 64% of scene changes with a motivated handoff, 31% with exit-then-cut, and 5% with a hard cut (almost all of those in the beat-cut style). Not one boundary is a plain crossfade.

Write three lines:

1. **Signature**: one motivated handoff family that carries the chapter turns and the peak (a colour flood that becomes the next object, a persisting element, an iris from the clicked button, a match-push). Something in the frame must cause it.
2. **Workhorse**: what every other cut does. Usually exit-then-cut (elements leave 6–9f with an ease-in and clear 4–8f before the cut) or a persisting element.
3. **Hard cuts**: where they are allowed (on a musical beat, a deliberate smash from calm to loud, beat-cut families) and nowhere else.

Keep one direction of travel for "progress" (left to right, or bottom to top) and reverse it only to mean "reversal". Durations, build recipes and sound pairings for every handoff are in `motion-language`.

**Flashes**: a flash used as a transition appears once or twice in a film. A flash the product itself makes (a camera shutter on a phone screen, a notification) may repeat on that action at 0.25–0.4 of the reveal flash's peak opacity, over its own area only. Every flash must contrast: at least 50% difference in mean luma from the frames either side, **measured within the flashing area** (crop to it), additive toward white or the accent, ≤ 4f. A flash that composites to grey is a dip, not a flash. Never flash *into* an already bright plate (it reads as a bloom): flash out of it onto a darker shot, flash dark, or skip it. On a letterboxed picture the flash covers the picture area only; white over the black bars composites to grey bars.

### Step 8: sound plan

Decide the shape here; `sound-design` decides levels, sources and the mix.

- **Led by**: music (launch, sting, hype, music video: pick the track before the cut and cut to its grid) · VO (explainer, VO launch: write and generate the VO first, time picture to it) · sound-off first (feed: text carries it, music and effects reward sound-on viewers).
- **Density**: none, accents only (the peak, the logo), or literal (every on-screen event sounds; about one cue per second at most). An owner's own cue rules win over this general density: a sting's anticipation ticks may run several a second.
- **Sonic logo**: what sounds when the mark lands (a hit, a chime, the track's button).
- **Silence**: where the breath before the peak goes quiet.
- **A flat library track** (no build, no drop, the same phrase gaps every few bars) has no peak of its own: shape it (the recipe is in `launch-playbook`'s Sound section, levels per `sound-design`): search the onsets for a natural dropout and hit to cue onto the peak, automate a breath before the peak that no other bar has, duck the bed 3–4 dB under the cascade, end on a phrase ending or a ≥45f tail after the mark. Or pick another track.

### Step 9: the one memorable moment

Name the single frame or second the viewer will describe to someone else, and put it at the energy peak. It must come from the idea (Step 3), not from an effect: the camera pushing through a phone screen into the app, a send button flooding the frame and becoming the next scene, a count landing with poppers on the same frame, a mark that the whole film turns out to have been building. Give it the most contrast in the film, a breath before it, and its own sound cue. If you cannot name it, the swap test in Step 3 failed.

## Decision tree: defaults when nobody said

```
PLACEMENT ── feed (TikTok/Reels/Shorts) → 9:16, 6–30 s, sound off first, hook by frame 15, Hyper/High
          ├─ feed (LinkedIn/X)          → 1:1 or 4:5, 15–45 s, sound off first, High/Medium
          ├─ landing-page hero          → 16:9, 20–45 s, muted autoplay loop (sound a bonus), ≤ 5 Mb/s, curve: launch
          ├─ launch film (YouTube, post)→ 16:9, 20–45 s, sound on, music- or VO-led, curve: launch
          ├─ keynote / event screen     → 16:9, 30–90 s, sound on, slower, premium holds
          └─ store page                 → owner's spec, muted autoplay
INTENT ──── wow (launch, hype) → B or C (A if only copy + logo) · curve: launch or trailer
          ├─ understanding     → F, or B for a product's own flow · curve: explainer · VO-led
          ├─ conversion (ad)   → E or B, vertical · curve: social ad · captions carry it
          ├─ brand mood        → I, A or C · curve: sting or slow swell · music-led
          └─ proof / number    → J · curve: data
ASSETS ──── UI screenshots → B (rebuild the UI, magnify 2–2.5×) · 3D/product shots → C
          ├─ only logo + copy → A or I · data → J · a track → H · a conversation → E
          └─ user footage → the `video-editing` owner; direction still applies
AUDIENCE ── enterprise, finance, health, luxury → no overshoot, Medium/Calm, slower holds
          ├─ consumer tech → long ease-outs, silence before the reveal, cuts on the beat
          └─ creator, youth, gaming → Hyper/High, overshoot 6–10%, bold colour, smash cuts
LENGTH ──── ≤6 s → one idea, one hit · 10–15 s → hook, 1–2 proofs, CTA (3–5 beats)
          ├─ 30 s → hook, setup, reveal, 3 features, CTA (6–10 beats, ≤70 VO words)
          └─ 60 s → full arc, 10–20 beats, ≤140 VO words · 90 s+ → chapters with a breath
```

Run one **integration check** on the combined answers: some combinations break even when each answer is fine (9:16 × 90 s × chart-dense; Hyper pacing × 12-word lines; sound-off × VO-only message). Fix it before writing the block.

## Write it down: VIDEO.md

Add this block under the router's front matter, before building anything. `references/planning.md` has filled examples (a 30 s launch and a 45 s explainer), plus treatment, shot list and cue sheet templates for longer pieces.

```markdown
## Direction
SMP: <one sentence>
Audience / placement / sound: <who> · <where> · sound <on|off-first>
Feeling: <adj>, <adj> — not <adj>
Idea: We show <X> as <Y>.
Style family: <letter + name> — because <assets/audience reason>
Palette: bg #… · ink #… · muted #… · accent #… (accent on the focal element and CTA only)
Type: <display face> <weights>, hero <px> at <tracking>; body <px>; ≤2 families
Motion: per `motion-language` — enter <ease> <f>, exit <ease> <f>, stagger <f>, overshoot <none|1.06>, hold <breathe/float/drift>
Camera: <behaviour, e.g. locked + 4px drift; pushes 24–48f on reveals>
Transitions: signature <…> · workhorse <…> · hard cuts <where> · travel <L→R>
Pacing: energy <Hyper|High|Medium|Calm>, new info every <n>f, VO <words>/<budget> at <w/s>
Energy curve: <shape>, breath at <f>, peak at <f>
Sound: <music|VO|sound-off>-led, density <none|accents|literal>, sonic logo <…>
Memorable moment: <frame range> — <what happens>
Safe zone: <aspect> — <margins>

## Beats
| # | Frames | Job | Focal point | On screen (words → hold f) | VO (words) | Energy | Out | Sound cue |
| - | - | - | - | - | - | - | - | - |
| 1 | 0–75 | Hook | … | "…" (3 → 45f) | … (6) | 7 | exit-then-cut | … |
```

The beat table's frame ranges must add up to the length in the front matter. Every row's text hold must satisfy Step 6. Every non-cut "Out" must name what causes it.

## Directing each scene

Build the peak scene first: it is the riskiest, and it sets the bar the others are measured against. Then, for every beat, decide six things before writing code:

1. **Job**: hook, setup, reveal, proof, demo, data moment, bridge, resolve. One per scene. If a scene has two, split it.
2. **Focal point**: the one thing the eye should be on within 0.5 s (15f) of the cut. Only it moves on arrival; everything else is already settled or still.
3. **Entry**: how the focal point arrives, from `motion-language` (rise + blur, pop, persisting from the last scene, a slam). Order of arrival is order of importance.
4. **Hold**: what keeps the frame alive while it is read: one ambient behaviour (breathe, float or camera drift), never several. Phases: build 0–30% of the scene, breathe 30–70%, resolve 70–100%. Reveal later pieces when the VO names them, not all in the first quarter.
5. **Exit or handoff**: from the grammar in Step 7. Name the carrier, or the frame by which everything has left.
6. **Sound cue**: what is heard on the arrival, the peak and the handoff, or "none" on purpose.

Then build, `validate`, and `capture-frames` on the scene's first frame, its fully built frame and its last frame before moving on.

## Self-critique before you finish

Run this on captured frames, not on the code; code that looks right often renders wrong. Capture frame 0, frame 15 (0.5 s), the middle and last frame of every scene, the first frame of every next scene, the peak, and the final frame. A contact sheet made with `ffmpeg` from those stills makes the rhythm visible at a glance; `references/critique.md` §1 has the command, plus the dead-hold (`freezedetect`) and delivery (bitrate, faststart) measurements to run on the export.

1. **Anti-slop pass**. Fix any that are true:
   - Everything enters the same way (the same fade-up on every element in every scene).
   - Several things move at once with no focal point, or everything floats on its own phase.
   - A different transition on every cut, or a plain crossfade between scenes.
   - Text that cannot be read twice in its hold, or a paragraph on screen.
   - A flat energy curve: no breath, no peak, the end card as loud as the hook.
   - Decoration with no job: gradient blobs, glass cards, particles, lens flares "because premium".
   - More than one accent colour in a frame, more than two type families, small text in a low-contrast accent (< 4.5:1). (One semantic state colour, an error or threat red, may sit beside the accent if it is always paired with a shape or label and never colours a message line.)
   - A logo that arrives in the last second with no build, or holds under 1.5 s (outside the beat-cut style).
   - A dead hold: more than 1.5 s (feed) or 2.5 s (elsewhere) where nothing changes, or a line held over 2× its formula with nothing else moving.
   - A product film where nobody could tell what kind of product it is.
   - Text in a 9:16 platform-UI zone.
   - Bounce on everything; overshoot is for one playful moment, not the default.
2. **Swap test**: cover the logo on the frames. Could this be any company's video? If yes, the idea is missing from the picture; put the subject's own UI, numbers or nouns into the memorable moment.
3. **Score it** with the rubric in `references/critique.md` (eight axes, 1–5). Ship at no axis below 3 and an average of 4 or more. Fix the lowest axis first, re-capture, re-score.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Seeing the result | `capture-frames` | None; do not report quality you have not seen |
| Reading an existing video | `project-overview` | Read `project.json` and the scene files |
| Contact sheet, timing checks | `ffmpeg` | Look at the captured stills one by one |
| Moves and handoffs | `motion-language` | — |
| Levels, sources, mix | `sound-design` | — |

## Checks before you finish

1. `VIDEO.md` has a complete `## Direction` block and a `## Beats` table whose frame ranges sum to the video's length.
2. The SMP is one sentence and the idea is written as "We show X as Y".
3. Every on-screen line's hold meets `max(30, 9 × words + 15)` frames from the frame it is legible (check two lines with `capture-frames` at the start and end of their hold).
4. VO word count ≤ length × 2.5, with the last 1.5 s of the film VO-free.
5. The frame at 0.5 s already shows the hook (feed placements: no fade from black), and the tension is on screen by 1 s in feeds, YouTube and click-to-play. Stings, intros and end cards: motion has started by frame 15.
6. The memorable moment is at the frame the block says, and the 10–30f before it are calmer.
7. Every non-cut transition has a carrier you can point to in the frames either side of the cut.
8. For 9:16, nothing that must be read sits in the platform-UI zones from `references/pacing.md`.
9. The self-critique passed: no anti-slop item true, the swap test fails for a competitor, rubric average ≥4 with no axis below 3, and no Blocker open ("left as deliberate" never clears a Blocker). Every `freezedetect` flag was confirmed on a crop or a 4 fps strip before it was counted or dismissed (`references/critique.md` §1).
10. The export fits its destination (critique's Delivery blocker: a landing-page hero is ≤ 5 Mb/s at 1080p with faststart, and a loop's last frame and frame 0 measure PSNR ≥ 30 dB at 320 px).
11. `validate` passes.
