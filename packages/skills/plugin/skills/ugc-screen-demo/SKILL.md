---
name: ugc-screen-demo
description: "The faceless screen-recording ad: an app or website doing one satisfying thing, narrated over the top. The highest-converting UGC format for software, because for software the interface is the ad. Covers the one-satisfying-thing rule, device frame versus full-bleed, cursor choreography, punch-ins on the moment of value, how to get real footage when there is none, on-screen text reading speed, and the result-before-steps ordering. Load with ugc-ad-foundations."
---

# UGC screen demo

An app doing one thing, recorded, narrated flatly, cut tight. No face, no set, no B-roll. For a software product this is the format with the highest ratio of persuasion to production cost, because the thing you are selling is already a picture.

## When to use

Pick this when the product is software and the request names a demo, a walkthrough, a "show it working", a feature clip, or an app ad. It is also the right answer when the user has a screen recording already and no idea what to do with it.

Do not pick it when:

- The interface is not the point and the outcome is. Use `ugc-problem-solution`.
- The pitch rests on a person's credibility. Use `ugc-testimonial`.
- The product is physical. Use `ugc-before-after` or `ugc-unboxing`.
- The user wants a structured feature tour for a landing page rather than a feed. Use `demo-walkthrough`, which is 16:9 and allowed to be slower.

## The one satisfying thing

A screen demo shows **one** action. Not a tour, not a feature list, not an onboarding flow. One action, chosen because watching it is pleasurable: a long form collapsing into one click, a hundred rows sorting, a blank page filling with generated copy, a diff turning green.

Say the action out loud before you build. "I paste a URL and a video comes out." If it takes two sentences, it is two ads.

Everything else in the interface is set dressing. Navigation the viewer never uses, sidebars, account menus: all of it is noise that costs you attention you needed for the one thing.

## Show the result before the steps

The instinct is chronological: open the app, click, wait, result. That ordering loses the viewer at "open the app", because nothing has happened yet and nothing promised it would.

Invert it. Frame 0 is the **finished state**, held for under a second, then the cut back to the start. The viewer now watches the steps knowing where they lead, which is the only reason to watch steps at all.

| Ordering | Retention shape |
| --- | --- |
| Result, then steps, then result again | Strong hook, a dip in the middle, a payoff that closes the loop |
| Steps, then result | Flat, then a cliff at 2s |

The second sight of the result is not a repeat, it is the resolution. Hold it longer than the first.

## Device frame or full-bleed

| Choice | Use when | Cost |
| --- | --- | --- |
| Full-bleed (the UI fills the canvas) | Mobile app, vertical-native UI, or any time the text is small | Reads slightly less like a real recording |
| Phone frame (a bezel drawn around the capture) | You want it to read as "on a phone", or the source is a 9:16 capture | Steals 15 to 20 percent of the height |
| Desktop capture, cropped and punched into a 9:16 canvas | The product is a web app | You will lose the edges, so plan the crop before you record |

Default to full-bleed for a mobile app, and to a punched-in desktop crop for a web app. A laptop mockup floating on a gradient is a 2019 SaaS code and reads as an ad instantly.

Never letterbox a 16:9 recording into a 9:16 frame with bars. Crop into it and use camera moves to reach the parts you lost.

## Cursor choreography

The cursor is the actor. It carries all the performance this format has, and a cursor that teleports is the single most common reason a screen demo feels fake.

- **It hesitates, then moves decisively.** A short pause before a click reads as a decision. A move with no pause reads as a machine.
- **It arcs.** Human pointer movement is never a straight line. Ease the path, and overshoot the target slightly on fast moves.
- **It slows into the target.** Deceleration over the last 60 to 80 pixels.
- **It rests during reading.** When the viewer needs to read something on screen, the cursor stops moving entirely. Motion and reading compete.
- **Clicks land on a beat.** Give every click a visible state change within 100ms, and a click sound. A click with no feedback reads as a broken build.

If the source recording has a jittery real cursor, hide it and animate a synthetic one. A drawn cursor you control beats a real one you cannot.

## Punch-ins

The moment of value gets a punch-in. Use a seek-safe scale-and-translate on the capture layer: roughly 1.0 to 1.25 over 400 to 600ms, eased out, centred on the element that changes.

Three rules:

1. One punch-in per moment, not per shot. Three zooms in fifteen seconds reads as a nervous edit.
2. Punch **in** on the cause, hold, punch **out** on the consequence. The pull-back is what makes the result feel large.
3. Never punch in on something the viewer has not been told to look at yet. The narration names it, then the camera moves.

## On-screen UI text

Interface text is the thing agents most often make unreadable. The viewer reads at roughly 3 words a second when the text is incidental rather than the subject.

| Text | Minimum on screen |
| --- | --- |
| A button label the narration names | 0.8s |
| A short field value being typed | Typing time plus 0.6s |
| A sentence of generated output | 1.2s plus 0.35s per word |
| A row of data you want scanned, not read | 1.5s, with a punch-in on one row |

If a screen needs more than about 2.5 seconds to read, it is the wrong screen. Crop to the part that matters, or replace it with a single line of large type.

## The shot list

Twenty seconds, 1080x1920, web app, no face.

| # | t | shot | on screen | said |
| --- | --- | --- | --- | --- |
| 1 | 0.0 to 0.8 | The finished result, full-bleed, already done | The rendered output, a small "done" state | "This took me nine seconds." |
| 2 | 0.8 to 1.0 | Hard cut to the empty starting state | An empty input, cursor parked off to the side | (silence) |
| 3 | 1.0 to 3.5 | Cursor arcs into the field, hesitates, clicks | Field focuses, caret blinks | "You paste the link in here." |
| 4 | 3.5 to 6.0 | Typing, then the click on the primary action | The URL fills, button goes active | "Hit generate." |
| 5 | 6.0 to 8.0 | Punch in 1.0 to 1.2 on the progress state | A progress indicator, then the first result frame | "It reads the page itself." |
| 6 | 8.0 to 12.0 | The work happening, held, cursor still | Output filling in, one element at a time | "Pulls the copy, the colours, the logo." |
| 7 | 12.0 to 14.5 | Punch out to full frame on completion | The finished composition, whole | "And that is the whole video." |
| 8 | 14.5 to 17.0 | Cursor moves to a secondary control, one click | An edit, a small visible change | "Anything you do not like, you just change." |
| 9 | 17.0 to 20.0 | Static end frame, product name, one line | Name, one-line promise, the handle | "Link's in the bio." |

**Stretching it.** At 30s, extend shot 6 to show a second thing changing, and add a 3-second proof shot before the end frame. At 10s, keep shots 1, 3, 5, 7 and 9 only. At 45s, the format starts to want a second action, which means you are making a `demo-walkthrough` rather than an ad.

## The script scaffold

Write the script before you build anything. Narration runs at about 2.5 words a second, so a 20-second demo is 45 to 50 words total. Count them.

```markdown
# SCRIPT

## Hook (0 to 3s, <= 8 words)
[The result, stated as a fact. "This took nine seconds."]

## Setup (3 to 6s, <= 8 words)
[The single action, named in plain words. No feature names.]

## Demonstration (6 to 14s, <= 20 words)
[What the product is doing, as you would say it to a friend watching over
your shoulder. Present tense. One clause per visible change.]

## Turn (14 to 17s, <= 10 words)
[The objection, pre-empted. Usually "but can I change it".]

## CTA (17 to 20s, <= 8 words)
[Recommendation-shaped. Never "Sign up today".]
```

## What you build

The capture sits as a single timed clip on its own track, with everything else layered above it.

**When there is a real recording.** Bring it in with `save_asset`. Trim, crop and reframe with `ffmpeg` into `assets/`, and place the result as a single timed clip. Do the crop in `ffmpeg` rather than with an on-canvas crop, so the punch-in scale starts from a clean 1.0.

**When you can record it.** The `screen-capture` skill owns driving the interface and capturing it. Use it when the product is reachable on this machine.

**When there is no recording at all.** Rebuild the interface directly in the scene. This is the normal case and it is not a compromise: a rebuilt UI is sharper than any capture, it is already the right aspect, and every element is animatable. Give the screen its own scene, then animate the state changes directly rather than playing back a video. Check your project's own component or asset library before hand-rolling a browser chrome, a code window or a terminal: they may already exist there.

**The cursor.** A small absolutely-positioned SVG arrow with a drop shadow, tweened along a path. Add a scale-down-and-up on the click frame and a soft ring that expands once. Never animate it with a timer.

**Sound.** A click per interaction from `generate_sfx`, a low room tone under everything, and one soft confirmation tone on completion. Silence under a screen demo makes it feel like a bug report.

## Failure modes

**The tour.** Five features in fifteen seconds, none of them landing. Fix: delete four. The one that survives is the ad.

**The unreadable screen.** A full desktop UI scaled into 1080 wide, where nothing can be read. Fix: crop to the working area, or rebuild the screen at 1.6x the real type scale.

**The teleporting cursor.** It appears at the button rather than travelling to it. Fix: tween it in over 500 to 700ms with an ease and a pause before the click.

**The dead middle.** A four-second loading state with nothing happening and nothing said. Fix: cut it, or cover it with a punch-in and one line of narration about what the product is doing behind the scenes.

**The logo opening.** A brand card before the demo. Fix: delete it. The product's own interface is the brand.

**Narration that reads the UI aloud.** "Then you click the Generate button." Fix: say why, not what. The cursor already says what.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Real footage | `save_asset` for the user's recording, or the `screen-capture` skill | Rebuild the interface in HTML. Often better. |
| Trim, crop, reframe | `ffmpeg` on the shell PATH | Do the crop with a keyframed transform on the video layer. |
| Narration | `pick_voice` then `generate_voiceover` | A caption-led silent cut. This format survives mute better than any other. |
| Punch-ins | A seek-safe scale/translate on the capture layer | A static wide shot, which costs you the payoff. |
| Interaction sound | `generate_sfx` | One music bed with no clicks, which reads flatter. |

## Checks before you finish

1. `capture_frames` at t=0. Is the finished result on screen? If it is an empty app or a logo, the hook is gone.
2. Capture the frame of every click. Is there a visible state change within the next 100ms?
3. Capture four frames spread across the piece and read only the UI text. Can you read it at arm's length without squinting?
4. Watch the cursor path frame by frame across one move. Does it arc, decelerate and pause?
5. Mute it. Does the sequence still say what the product does?
6. Check that nothing that matters sits in the top 12 or bottom 20 percent.
7. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).

## Plan skeleton

A scratch outline for the shot list above, in whatever form your project's own planning artifact takes:

```markdown
---
format: 1080x1920
duration: 20s
message: [the one satisfying thing, in one clause]
arc: Result → Empty state → Action → Work → Payoff → CTA
audience: [who]
surface: [web app | mobile app | desktop app]
---

## Frame 1: Result first
- duration: 0.8s
- scene: The finished output, full-bleed, held still
- voiceover: This took me nine seconds.
- punch: none
- source: [capture | rebuilt]

## Frame 2: The empty state
- duration: 2.7s
- scene: Hard cut back to the start, cursor arcs in and clicks the field
- voiceover: You paste the link in here.
- cursor: rest 0.4s, arc 0.6s, click
- source: [capture | rebuilt]

## Frame 3: The action
- duration: 4.5s
- scene: Typing, then the primary click, punch in 1.0 to 1.2 on the progress state
- voiceover: Hit generate. It reads the page itself.
- punch: 1.0 to 1.2 over 500ms, centred on the button
- sfx: click, soft whoosh

## Frame 4: The work
- duration: 6s
- scene: Output filling in, cursor still, then punch out to full frame
- voiceover: Pulls the copy, the colours, the logo. And that is the whole video.
- punch: 1.2 to 1.0 over 600ms

## Frame 5: End card
- duration: 3s
- scene: Static, product name, one-line promise, handle
- voiceover: Link's in the bio.
- cta: [spoken + on-screen + a cursor tap]
```
