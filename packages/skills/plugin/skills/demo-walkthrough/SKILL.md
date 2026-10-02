---
name: demo-walkthrough
description: "The longer product tour, 60 to 180 seconds, for a viewer who chose to watch: one real workflow done end to end instead of a feature tour, chapter shares and chapter cards, narration at 2.2 to 2.5 words a second that may orient ahead of a step, UI magnified 2 to 2.5 times, cursor and click timing, focus pushes, cutting dead waits, beat sheets for 60, 90, 120 and 180 seconds, the quiet sound plan, and when to split into a series. Load it for onboarding videos, sales or investor demos, and product tours too long for a launch film."
---

# Demo walkthrough

The one format in the pack aimed at a viewer who already opted in: they clicked play to learn how the product works. That changes the rules. The hook matters less than orientation; pacing follows the task, not a retention curve; narration may say what is about to happen. What does not change: one thing at a time, magnified until it reads, every step shown. Frames at 30 fps. Read `direction` first; moves come from `motion-language`, the mix from `sound-design`.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- Onboarding videos, a help-centre "how to", a sales-enablement or investor demo, a product tour of 60–180 s.
- A "walkthrough video of our workflow", "full product demo", "show how to set up X".

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| Winning a cold or scrolling audience in 15–60 s | `launch-playbook` |
| One new feature for existing users | `announce-feature` |
| A short vertical demo ad | `ugc-screen-demo` |
| A concept rather than the product's own UI | `explainer` |
| Editing the user's own long screen recording with their voice | `video-editing` (this skill still gives the chapter structure) |

## Ask first

1. **Which workflow, start to finish?** The one job that best shows why someone uses the product. Offer your guess.
2. **Is there a screen recording, or should it be rebuilt from screenshots?** Rebuilt UI is sharper and can be magnified; a recording is faster and more literal.
3. **Who watches it: a new user, a buyer, an investor?** It decides the depth and the next-step line.

## The one-workflow rule

The most common failure is a feature tour: eight capabilities in ninety seconds, none of them landing. Show **one real job, done completely**, with real-looking data. A viewer who watches one task done well understands the product. If there are three equally important workflows, make three videos (see the series rule).

## Direction defaults

- **Style family**: B (soft-light SaaS): the real UI rebuilt on a light stage, magnified, a cursor driving it, shared elements across cuts. D (one-shot camera) when the workflow lives on one canvas the camera can travel (a whiteboard app, a map, an editor).
- **Energy curve**: a medium plateau with small steps at each chapter turn; the peak is **the result** (the thing the workflow produced) at about 80–90%. No hype peak.
- **Pacing**: Medium, new information every 35–50f (the house UI demos measure 35–50f); a step is as long as it needs to be read, then not a frame longer.
- **Transitions**: signature **persisting element**: the app window and the cursor carry through the whole film; the camera moves between regions instead of cutting. Workhorse: a focus push in (24–48f) and pull back (45–52f). Chapter turns: a chapter card or a colour-field push (8–23f). Hard cuts only to remove a wait.
- **Sound**: VO-led. VO at 1.0; no music under narration, or a minimal 100–120 BPM bed at 0.1 (−20 dB); a varied click 0.8–1.0 on every press, a soft typing texture, a success chime 0.6 on the result; room tone 0.03–0.05 throughout so gaps never drop to digital silence.
- **Memorable moment**: the result: the finished report, the deployed site, the paid invoice, held on screen with the one line that names what was saved.

## Chapters

| Chapter | Share | Job |
| --- | --- | --- |
| Orientation | 10–15% (≤8 s of VO) | What we are about to do and why, in one sentence, over the starting screen |
| The workflow | 65–75% | The one job, every step, no skipped steps |
| The result | 10–15% | What came out of it, held; the payoff |
| Next step | 5–10% | One specific action: "Connect your first repo from Settings → Integrations" |

- **Chapter card**: 45–75f (1.5–2.5 s), the chapter's name in 2–4 words at 72–96 px, entering blurUp 12f and leaving 6–9f. This is one format where a title card is allowed, because an opted-in viewer benefits from knowing the shape.
- **Progress indicator**: a persistent label in a corner (`three-type`'s eyebrow role: 28 px caps at +0.14em, ≥5:1 contrast), "2 / 4 · Invite your team", updating with a word-slot flip (10–14f) at each turn.

## Beat sheets

VO at 2.3 words/s (2.5 ceiling; opted-in tours tolerate 2.5 comfortably), starting 6f in and 3–8f after each cut, the last 45–60f VO-free.

| Length | Orientation | Workflow | Result | Next step | VO |
| --- | --- | --- | --- | --- | --- |
| **60 s** (1800f) | 0–210 | 210–1470 (4–5 steps of 230–300f) | 1470–1680 | 1680–1800 | ≤134 words |
| **90 s** (2700f) | 0–330 | 330–2160 (2 chapters, 6–8 steps) | 2160–2490 | 2490–2700 | ≤200 |
| **120 s** (3600f) | 0–420 | 420–2880 (3 chapters, a 45–75f card between) | 2880–3330 | 3330–3600 | ≤268 |
| **180 s** (5400f) | 0–600 | 600–4230 (3–4 chapters) | 4230–4950 | 4950–5400 | ≤405 |

Each **step** is a run on the same surface: orient (the camera pushes to the region, VO says what we are doing, 30–45f) → act (cursor travels, clicks or types) → response (the UI changes; hold until it reads) → confirm (one line or a check). Reveal each step's UI change when the narration names it.

### Directed example: 60 s onboarding, "send your first invoice"

| # | Frames | Job | On screen | VO (words) | Sound |
| - | - | - | - | - | - |
| 1 | 0–210 | Orientation | Empty dashboard, label "1 / 3 · Set up" | "Let's send your first invoice, start to finish, in about a minute." (12) | Room tone; VO at 6 |
| 2 | 210–480 | Step: new client | Push 36f to the client form at 2.3×; the name types at 2f/char | "Add the client. Name and email are all it needs." (10) | Clicks, typing |
| 3 | 480–750 | Step: line items | Pull back 48f, push to the items table; two rows grow 11f each | "Add what you did, with a rate." (7) | Clicks |
| 4 | 750–1020 | Step: schedule | Chapter label flips to "2 / 3 · Send"; the reminder toggle switches | "Turn on reminders, so you never chase it yourself." (9) | Toggle click |
| 5 | 1020–1470 | Step: send | Cursor rests 8f on Send; press, ring, the preview card slides out | "Review, then send." (3) | Click 0.9 on the press |
| 6 | 1470–1680 | **Result** | Cut to "Paid" landing on the same card, held 120f | "Three days later: paid. Automatically." (5) | Chime 0.6 on the land |
| 7 | 1680–1800 | Next step | "Import your clients → Settings → Import" (6 → 69f) | — | Room tone |

## Narration

- Narration may **orient ahead**: "Next, we'll connect this to your data" is useful here, unlike in an ad.
- One step per sentence; name the UI element exactly as it is labelled on screen, in the same words.
- Say why a step matters only when it is not obvious; never narrate the cursor's path ("now I move the mouse to…").
- Measured, explanatory voice; 2.2–2.5 words/s; pauses of 15–30f between steps let the UI change be seen.

## UI craft

- **Legibility floor**: every label the viewer must read renders ≥24 px tall on a 1080p frame. Rebuilt UI is magnified 2–2.5× (the house range is 2.2–2.5×) on the active region; a recording gets a focus push until its text clears the floor.
- **Focus push**: 24–48f inOutCubic to 1.3–2.5× on the region of the next step, drift stopped; pull back 45–52f when moving to a distant region, so the viewer keeps the map. Creep +1.5–3% over a long held step. Never two camera moves at once.
- **Cursor**: travels 16–26f on an arc (x outCubic, y inOutCubic), 9f for short hops, up to 50f when the camera leads; rests 6–10f on the target before the click; never moves during a camera push. When the camera pans, the cursor shares its easing so its screen path stays monotonic.
- **Click**: press 4f in, 6f out at −8 to −15% scale, ring 8–14f outCubic; the UI responds within 3f of the release.
- **Typing**: 2–3 frames per character with a solid caret, the field's final width reserved; long values (a URL, an API key) type their first 6–8 characters and then complete in 4f.
- **Dead waits**: any loading over 15f is cut or compressed to 15–20f; a long real process gets a "2 minutes later" label (2–3 words, 45f) rather than a spinner.
- **Layout changes** morph over 24f on `bezier(0.65, 0, 0.35, 1)`, at most one every ~50f.
- **Real data**: realistic names, numbers and content; no lorem ipsum, no "Test User", nothing the user has not approved.

## The series rule

If "the one workflow" honestly has three answers, build three walkthroughs of 60–90 s, each with its own orientation and result, numbered "Part 1 of 3" in the progress label and sharing the same opening chapter card design. Three tight parts beat one nine-minute video where nothing gets room.

## Building it

- **Three.js (default)**: the app window as planes with canvas-drawn UI (`three-assets`' `references/drawn-ui.md`) or a video texture from the recording (`three-assets`), an orthographic or fixed-distance camera so pixels stay exact, focus pushes and pull-backs from `three-camera`, labels and chapter cards from `three-type`, chapter-turn pushes from `three-transitions`; the cursor is a small textured plane whose pose module the next scene imports.
- **HyperFrames**: one sub-composition per chapter; the recording as a `<video>` element; pushes as transforms on a wrapper; clicks as `<audio>` elements at the press time.
- **React**: one scene per chapter; `@genmotion/motion` eases; the recording through the project's video component.
- Recording prep (crop to the app window, scale, frame-accurate trims, removing the OS cursor): `screen-capture`.

## Good and bad

- Bad: "Here's our dashboard. Here's reports. Here's settings. Here's integrations." Good: "Let's send your first invoice", then every step to the paid notification.
- Bad: a 1440p recording shown at 1:1 where the form labels are 11 px. Good: the active form magnified 2.3×, the cursor resting before "Send".
- Bad: a 9-second spinner while the import runs. Good: a hard cut to the finished import with "A minute later" for 45f.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| The real workflow | `save-asset` for the recording or screenshots; `screen-capture` for crop, scale and cursor recipes | Rebuild the UI from screenshots; never skip a step |
| Narration | `pick-voice`, then `voiceover` | Chapter cards and on-screen step lines carry the structure |
| Clicks, typing, chime | `sfx` | Credited CC0 UI sounds, or VO and room tone only |
| A minimal bed | `music` | None; room tone |
| Chapter-share check | `project-overview` | Add up the scene lengths from `project.json` |
| Seeing it | `capture-frames` | None |
| Loudness | `ffmpeg` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `project-overview` against the chapter table: the workflow chapter is 65–75% of the runtime and orientation ≤15%.
2. Every step of the workflow is on screen: list the steps in `VIDEO.md` and capture one frame per step showing it.
3. `capture-frames` at the focus-push end of every step: the label being acted on measures ≥24 px tall.
4. Capture the press frame and press +3 for three clicks: ring visible on the press, UI changed by +3; each click sound sits on its press frame.
5. No held wait longer than 20f: scan the contact sheet (an `ffmpeg` tile of one frame per second) for identical consecutive seconds that are not deliberate holds.
6. VO words ≤ the budget; VO starts 3–8f after each cut; every UI change happens within ±6f of the narration naming it.
7. Chapter cards hold 45–75f; the progress label updates at every chapter turn.
8. The next step names a specific place in the product, not a generic CTA.
9. `ebur128`: −14 LUFS ±1 (−16 is acceptable for a help-centre embed, say which you chose), true peak ≤ −1 dBTP.
10. Watch it end to end once; note every moment you wanted to skip and fix the pacing there. The `direction` self-critique passes; `validate` passes.
