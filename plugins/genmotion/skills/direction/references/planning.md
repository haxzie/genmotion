# Planning documents: treatment, beat sheet, shot list, cue sheet

Templates for the four planning documents a director writes before building, each followed by a filled example. The Direction block and the beat table in `VIDEO.md` are required for every video; the treatment, shot list and cue sheet are for pieces over about 20 s, or whenever the user wants to approve a plan before the build. They all live in `VIDEO.md` under their own headings, so one file holds the whole plan.

Contents: 1 Treatment · 2 Beat sheet · 3 Shot list · 4 Cue sheet · Example A: 30 s launch · Example B: 45 s explainer

Frames at 30 fps.

---

## 1. Treatment (one page, present tense)

```markdown
## Treatment
**Title / SMP**: <title> — <one sentence>
**Objective and audience**: <who>, <where it plays>, sound <on|off-first>, the action we want (<CTA>)
**The idea**: We show <X> as <Y>. <2–3 sentences in the present tense: "We open on…">
**Tone**: <3–5 adjectives> — not <1–2>
**Look**: style family <…>; palette <hexes>; type <face, weights, sizes>; texture/lighting <…>
**Motion**: <entrance/exit language>, <camera behaviour>, signature move <…>
**Structure**: <acts with frame ranges> · energy <shape>, breath at <f>, peak at <f>
**Sound**: <led by>, <genre/BPM or VO voice>, density <…>, sonic logo <…>
**Memorable moment**: <frames> — <what happens>
**Mandatories**: <logo file, legal line, URL, CTA, aspect ratios, length>
```

## 2. Beat sheet (the animatic in text)

The `## Beats` table from `direction`. One row per beat; a scene may hold several beats.

| Column | What goes in it |
| --- | --- |
| # | Beat number |
| Frames | `start–end`, absolute. Rows tile the film with no gaps |
| Job | hook · setup · problem · reveal · proof · demo · data moment · bridge · resolve · CTA |
| Focal point | The one thing the eye is on within 15f of the beat starting |
| On screen | The exact words, then `(words → hold f)` from the hold formula |
| VO | The exact words, then `(word count)` |
| Energy | 0–10, following the curve |
| Out | The handoff and its carrier, or `exit-then-cut`, or `hard cut (beat)` |
| Sound cue | What is heard on arrival, peak or handoff, or `none` |

## 3. Shot list (what each beat looks like)

```markdown
## Shots
| # | Frames | Framing / camera | Layers (back → front) | Motion verbs | Notes |
```

- **Framing / camera**: wide, medium, close, macro; locked, push 1→1.6 over 36f, orbit 20° over 120f, drift 4 px.
- **Layers**: at least two: a background treatment (radial glow, texture, ghost type), the content, and accents.
- **Motion verbs**: every element gets a verb (slams, slides, draws, counts up, types on, floods, breathes). If you cannot name one, the element is not designed yet.

## 4. Cue sheet (every sound, placed)

```markdown
## Cues
| Frame | Track | Cue | Level (linear / dB) | Fade in / out (f) | Synced to |
```

- Track lanes: 0 = VO, 1 = music, 2 = effects A, 3 = effects B / ambience (overlapping effects need their own lane).
- **Synced to** names the visual event: "bubble's first visible pixel", "4f before cut", "flood start", "land frame".
- Levels and fades come from `sound-design`; the numbers in the examples below are the house defaults.

---

## Example A: 30 s launch, landing page, VO-led

### Direction

```markdown
## Direction
SMP: Ledgerly chases unpaid invoices for you, politely, so you get paid without writing a single reminder.
Audience / placement / sound: freelancers and small studios · landing page hero · sound on
Feeling: relieved, confident — not corporate, not cute
Idea: We show 47 unpaid invoices as a pile of sticky notes that one click flips into "Paid" stamps.
Style family: B Soft-light SaaS — the material is the app's UI; the audience wants to see it work
Palette: bg #FAFAF7 · ink #141414 · muted #5E5E58 · accent #18A957 (paid green; on stamps and the CTA only)
Type: one grotesque 500/600, hero 150 px at −0.035em; body 38 px; eyebrow 28 px caps +0.16em
Motion: per `motion-language` — enter blurUp 12f outCubic, exit 8f inCubic, word stagger 3f, overshoot none (stamps 1.08), hold breathe 0.6% + camera drift 4 px
Camera: locked with 4 px drift; pushes 36f inOutCubic on the two UI demos; drift dies before every matched cut
Transitions: signature persisting element (the "Auto-chase" button becomes the next scene's toggle) · workhorse exit-then-cut · hard cuts none · travel L→R
Pacing: energy Medium, High in the stamp wave; new info every 30–40f; VO 41/64 at 2.3 w/s
Energy curve: launch; breath 160–180, peak 200–262
Sound: VO-led, density accents (clicks, stamps, logo), sonic logo = two-note chime on the mark
Memorable moment: 200–262 — one click, and 47 sticky notes flip to green "Paid" stamps in a left-to-right wave
Safe zone: 16:9 — 8% sides (154 px), 5% top/bottom
```

### Beats

| # | Frames | Job | Focal point | On screen (words → hold f) | VO (words) | Energy | Out | Sound cue |
| - | - | - | - | - | - | - | - | - |
| 1 | 0–75 | Hook | the sticky-note pile | "47 unpaid invoices" (3 → 42f) | "Forty-seven unpaid invoices." (4) | 6 | exit-then-cut | paper rustle on the pile's arrival |
| 2 | 75–180 | Problem | the blank reminder email, caret blinking | "Every one needs a nudge" (5 → 60f) | "Every one needs a polite nudge." (6) | 4 | breath: 160–180 nothing moves, bed drops | none; bed fades to −24 dB over 160–180 |
| 3 | 180–300 | Reveal (peak) | the "Auto-chase" button, then the wave | "Or one click." (3 → 42f) | "Or one click." (3) | 9 | persisting element: the button becomes the toggle in beat 4 | click on 196; stamps 200–262; bed returns on 200 |
| 4 | 300–420 | Demo 1 | the tone picker | "Reminders in your voice" (4 → 51f) | "Ledgerly writes the reminders, in your voice." (7) | 7 | exit-then-cut | click on the picker |
| 5 | 420–540 | Demo 2 | the pay link on a phone | "Paid in one tap" (4 → 51f) | "Clients pay from a link, in one tap." (8) | 7 | persisting element: the phone's green tick becomes beat 6's status dot | tap on 470, chime on 478 |
| 6 | 540–660 | Proof | the late-payer list | "See who's late, early" (4 → 51f) | "You see who's late before they are." (7) | 6 | exit-then-cut | none |
| 7 | 660–790 | Resolve | the headline | "Get paid. Skip the awkward emails." (6 → 69f) | "Get paid without the awkward emails." (6) | 7 | the green accent floods from the headline's full stop (12f) into the end card | whoosh 3f before the flood |
| 8 | 790–900 | CTA | mark + URL | "ledgerly.app" (1 → 30f; held 100f) | — (VO-free) | 3 | end | sonic logo on the mark's land (800) |

Sum: 900f. VO 41 words; each line also fits its own beat (beat 2: 6 words ≈ 78f, from 81 to 159, before the breath).

### Shots (excerpt)

| # | Frames | Framing / camera | Layers (back → front) | Motion verbs | Notes |
| - | - | - | - | - | - |
| 1 | 0–75 | Wide on the desk; locked, 4 px drift | warm paper ground + soft radial glow · the pile · headline | notes **drop** in 2f apart; headline **rises** | The pile is already landing at frame 0: no fade from black |
| 3 | 180–300 | Medium on the app; push 1 → 1.4 over 36f toward the button | ground · app window at 2.2× · cursor · stamps | cursor **arcs** 20f; button **presses** 4f/6f; notes **flip** 1f apart, each stamp **pops** to 1.08 at 60% | The wave runs left to right, the film's direction of progress |
| 8 | 790–900 | Centred lockup; locked; drift 0 | flooded green → paper · mark · URL | mark **lands** on a gentle spring 18f; URL **types on** 1.5f/char; mark **breathes** 1.2% | Nothing new after 840 |

### Cues (excerpt)

| Frame | Track | Cue | Level (linear / dB) | Fade in / out (f) | Synced to |
| - | - | - | - | - | - |
| 0 | 1 | Music bed | 0.18 / −15 | 15 / 45 | film start; split into two clips at 160 and 200 for the breath |
| 6 | 0 | VO line 1 | 1.0 / 0 | 0 / 0 | 6f after start |
| 196 | 2 | Click | 0.9 / −0.9 | 0 / 2 | press frame |
| 200–262 | 2, 3 | Stamp ×12 (every 4th note), alternating lanes | 0.42 / 0.46 / 0.50 (−7.5 / −6.7 / −6) | 0 / 4 | each stamp's first visible frame |
| 787 | 2 | Whoosh | 0.7 / −3.1 | 0 / 6 | 3f before the flood starts |
| 800 | 2 | Sonic logo | 0.9 / −0.9 | 0 / 10 | mark's land frame |

---

## Example B: 45 s explainer, narrated, whiteboard

### Direction

```markdown
## Direction
SMP: A CDN makes a site fast everywhere by keeping copies of it close to every visitor.
Audience / placement / sound: non-engineers at a SaaS company · internal docs and a blog post · sound on
Feeling: clear, curious — not salesy, not academic
Idea: We show a web request as a paper plane that has to fly from Tokyo to Virginia, until copies of the site are pinned on the map next to every city.
Style family: F Whiteboard explainer — teaching a concept with VO to a general audience
Palette: paper #FFFFFF · ink #1E1E1E · grey #495057 · accent red #E03131 (the plane's route and the one number)
Type: hand font 112 / 96 / 48 / 42 px; mono 34 px for the latency figures; left column at 140 px
Motion: per `motion-language` — strokes draw on 8–20f outCubic, text rises 6 px and floats ±1.2 px, examples 5f apart, board erase 10f
Camera: drift ±4 px x / ±2.5 px y built to return to rest at both ends of every scene
Transitions: signature board erase + 8f blank paper + cut · workhorse the same · hard cuts none · travel L→R (west to east on the map)
Pacing: energy Calm; one idea per 50–70f; VO 80/99 at 2.3 w/s
Energy curve: explainer steps; breath 1185–1200; peak 1000–1080 (the latency bar shrinking from 180 to 20)
Sound: VO-led, density accents (pen scratch on underlines, a soft tick on the number), bed at −13 dB
Memorable moment: 1000–1080 — the long red route snaps to a short one and the bar shrinks 180 ms → 20 ms
Safe zone: 16:9 — left 140 px, others 5%
```

### Beats

| # | Frames | Job | Focal point | On screen (words → hold f) | VO (words) | Energy | Out | Sound cue |
| - | - | - | - | - | - | - | - | - |
| 1 | 0–150 | Hook | the question | "Why is this site fast in Tokyo?" (6 → 69f) | "Why does a website load just as fast in Tokyo?" (10) | 5 | board erase | VO at 6 |
| 2 | 150–360 | Problem | the plane's long route | "One server, far away" (4 → 51f) | "Most sites live on one server. From Tokyo, every request crosses an ocean and back." (15) | 4 | board erase | VO at 156; pen scratch on the route |
| 3 | 360–570 | Idea | pins appearing on the map | "Copies, close to you" (4 → 51f) | "A content delivery network keeps copies of the site in hundreds of cities." (13) | 6 | board erase | pins tick 5f apart, −12 dB |
| 4 | 570–780 | Step 1 | the plane landing at the nearest pin | "Ask the nearest copy" (4 → 51f) | "Now your request goes to the closest copy, not the original." (11) | 5 | board erase | VO at 576 |
| 5 | 780–990 | Step 2 | hit vs miss, side by side | "Hit: instant. Miss: fetch once." (5 → 60f) | "A hit answers at once. A miss fetches once, then keeps it." (12) | 6 | board erase | none |
| 6 | 990–1200 | Payoff (peak) | the latency bar | "180 ms → 20 ms" (4 → 51f) | "That trip drops from a hundred and eighty milliseconds to about twenty." (12) | 8 | board erase | tick on the number landing (1060) |
| 7 | 1200–1350 | Answer | the restated sentence | "Fast everywhere = close to everyone" (5 → 60f) | "Fast everywhere just means close to everyone." (7) | 5 | end, hold 60f | VO ends by 1305 |

Sum: 1350f. VO 80 words (window 6–1305 ≈ 43.3 s × 2.3 = 99), and every line fits inside its own scene: the longest, beat 2 at 15 words, needs about 196f of a 210f scene.

### Per-scene grammar (every scene, local frames)

| Local frames | What |
| - | - |
| 0–2 | Tag and number draw in (10–12f) |
| 6 | Title draws in |
| 16 | Subtitle |
| 24–60 | Diagram strokes |
| 76–124 | Examples, 5f apart; red underline 12f after its phrase |
| end−18 → end−8 | Board erase (every stroke reverses, 10f inOutCubic) |
| end−8 → end | Blank paper; the cut lands on identical paper |
