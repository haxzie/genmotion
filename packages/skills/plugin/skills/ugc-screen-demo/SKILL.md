---
name: ugc-screen-demo
description: "The faceless screen-recording ad for software: an app or website doing one satisfying thing, result first, a cursor that acts, narrated flatly and cut tight for a vertical feed. Covers the one-thing rule, direction defaults, beat sheets with frame budgets at 15, 30 and 45 seconds, hook options, full-bleed versus device frame and how far to magnify the UI, cursor choreography in frames, focus pushes on the moment of value, UI reading times, the sound plan, and how to build it on Three.js from a recording or a rebuilt UI."
---

# UGC screen demo

An app doing one thing, shown result-first, narrated like a friend looking over your shoulder, cut tight. No face, no set. For software this is the cheapest persuasion there is, because the thing being sold is already a picture.

Read `direction` first, then this, with `ugc-ad-foundations` (shared numbers), `ugc-craft` (moves, captions) and `screen-capture` (getting footage in). Frames at 30 fps; positions on 1080×1920.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- The product is software and the request is an ad, a "show it working" clip, a feature clip for TikTok, Reels or Shorts, or "make something from this screen recording".
- The user has a screen recording and no idea what to do with it.
- There is no recording at all: the UI is rebuilt in the scene, which is the normal case.

Not this when:

- The outcome matters more than the interface, or there is a felt pain to open on: `ugc-problem-solution`.
- The claim lives in someone else's page (a competitor's pricing, a review) the presenter reacts to: `ugc-green-screen`.
- A 16:9, slower, multi-step tour for a landing page or docs: `demo-walkthrough`. A store-page preview: `app-store-preview`. A shipped-feature announcement film: `announce-feature`.
- The user brings their own **camera footage** to be cut (a founder talking, a vlog, a podcast): `video-editing`. A screen recording is still this skill.

## Ask first (only what the request does not answer)

1. What is the app's one-sentence payoff? (Offer your guess: "you paste a link and a finished video comes out".)
2. Do you have a screen recording of the moment it pays off? If not, I will rebuild the screen.

## The one satisfying thing

A screen demo shows **one** action, chosen because watching it is pleasurable: a long form collapsing into one click, a hundred rows sorting, a blank page filling with generated copy, a diff turning green. Say it out loud before building: "I paste a URL and a video comes out." If it takes two sentences, it is two ads (make two).

Everything else in the interface is set dressing. Navigation the viewer never uses costs attention the one thing needs: crop it out or leave it unanimated.

**Result before steps.** Frame 0 is the finished state, held 30–36f, then a hard cut back to the empty start. The viewer now watches the steps knowing where they lead. The second sight of the result is the resolution, held at least twice as long as the first.

## Direction defaults

| Line | Default |
| --- | --- |
| Style family | B, Soft-light SaaS, in 9:16: real UI magnified 2–2.5×, a cursor drives it. Look: Clean demo (Native for a phone app recorded on the phone) |
| Energy curve | Social ad, front-loaded: result-hook at 8 by frame 15; micro-peaks on each state change; the **peak** where the output completes; calm CTA |
| Pacing | High in the hook (18–30f per change), Medium through the work (30–50f) |
| Transitions | Workhorse: hard cut on a click or a word. Signature: the focus push into the element that changes, and the cursor persisting at the same screen position across a cut |
| Sound | VO-led (bed 0.12) or sound-off-first with SFX carrying it (bed 0.5); one click per interaction; a success tone on the peak |
| Memorable moment | The frame the result appears, at the end of a focus push |

## Beat sheets

Each row is a beat in the `VIDEO.md` Beats table. VO budgets per `ugc-scripting`; a screen demo usually runs 15–20% under budget because the UI talks.

**30 s (900f), web app, no face**

| # | Frames | Job | On screen | VO (words) |
| --- | --- | --- | --- | --- |
| 1 | 0–75 | Hook | 0–36: the finished output, creep running; hook line in the hook band. 36: hard cut to the empty start, cursor parked | "This took nine seconds." (4) |
| 2 | 75–180 | Setup | Cursor travels 22f, hesitates 8f, clicks the field; the URL types at 2f/char | "You paste the link in here." (6) |
| 3 | 180–270 | Action | Click the primary button (press 4f/6f, ring 12f); focus push 30f onto the progress state | "Hit generate. It reads the page itself." (7) |
| 4 | 270–480 | Demo | Output fills one element every 30–45f; cursor still; push holds | "Pulls the copy, the colours, the logo." (7) |
| 5 | 480–600 | Payoff (peak) | Push releases over 24f to the whole result; success tone on 480; held ≥90f | "And that's the whole video." (5) |
| 6 | 600–750 | Objection | Cursor to one control, one edit, visible change within 3f of the press | "Don't like a line? Change it." (6) |
| 7 | 750–900 | CTA | Name, one-line promise, a tap on the button; CTA text legible ≥60f | "It's free to try. Link's in my bio." (8) |

**15 s (450f)**: 0–60 hook (result 0–30, cut) · 60–180 action (cursor, click, focus push) · 180–360 work → payoff (result completes at about 300, push releases) · 360–450 CTA. ≤35 words.

**45 s (1350f)**: 0–75 hook · 75–195 setup · 195–300 action · 300–570 work · 570–690 payoff · 690–930 a second change on the same result (still one action, shown flexing) · 930–1170 proof (a real number the user supplied, or the result in use where it ships) · 1170–1350 CTA. ≤110 words. Past 45 s the format wants a second action: that is `demo-walkthrough`.

## Hook options

Prefer, in order: **Result** (the finished output at frame 0, "This took nine seconds"), **Curiosity gap** (a half-built output, "Nobody told me you could do this in a browser"), **Pattern interrupt** (a cursor dragging the old way into the trash, "Stop."), **Direct callout** for retargeting. `ugc-hooks` has the frame-0 builds; give the hook its own scene so variants can swap it.

## The screen: full-bleed or device frame

| Choice | Use when | Cost |
| --- | --- | --- |
| Full-bleed crop of the UI | Mobile app, vertical-native UI, or any time text is small. **Default** | Reads slightly less like "a recording" |
| Phone frame around the capture | The source is a 9:16 phone capture and "on a phone" matters | Costs 15–20% of the height |
| Desktop UI cropped and magnified into 9:16 | A web app | You lose the edges, so plan the crop around the one thing |

Magnify until the smallest text that matters is **≥34 px** at 1080 wide: a desktop UI's 14 px body needs about 2.5×; a phone UI captured at @3x is already about 1×. Never letterbox a 16:9 recording into 9:16 with bars; crop and use focus pushes to reach what the crop lost. A laptop mockup floating on a gradient reads as a stock SaaS ad.

## Cursor choreography

The cursor is the only actor in a faceless demo. A cursor that teleports is the most common reason a screen demo feels fake. Numbers from `motion-language`:

- **Travel**: 16–26f; x on outCubic and y on inOutCubic, which gives a natural arc that decelerates into the target. Up to 9f for a quick hop between neighbours.
- **Hesitate**: 6–10f still before every click. A pause reads as a decision.
- **Click**: press 4f in (scale 0.88), 6f out; a ring from 0 to 48 px radius over 12f outCubic, fading. The UI's state change lands on the press frame or within 3f; the click SFX on the press frame.
- **Rest while reading**: the cursor does not move while the viewer reads, and never during a focus push.
- **Typing**: 2–3f per character, finishing 4f before the next press; caret solid while typing, blinking 8f on/off only when idle.
- **Size**: 40–48 px tall at 1080 wide, with a soft shadow, so it survives the feed's compression.

A jittery real cursor in a recording: hide it (crop or cover) and animate a synthetic one along the recorded path's key points.

## Focus pushes and reading time

The moment of value gets a **focus push** (`ugc-craft`): 30f inOutCubic, centred on the element that changes, to the zoom where its text is ≥34 px; hold while it is read; release over 24f on the consequence, or cut. Push in on the cause, hold, pull out on the result: the pull-back is what makes the result feel large. Never push onto something the VO has not named yet. One push per beat.

UI text on screen holds by `direction`'s formula, `max(30, 9 × words + 15)` frames from the frame it is legible. A typed value holds its typing time + 18f. A row of data meant to be scanned, not read: 45f with a push onto the one row that matters. A screen that needs more than 90f to read is the wrong screen: crop to the part that matters or replace it with one line of large type.

Dead time: any load or wait longer than 15f is cut (hard cut to the loaded state) or covered by a push plus one VO line about what is happening.

## Sound plan

Per `sound-design` and `ugc-craft`: frame 1 audible; a click 0.9 on every press frame, varied ±0.04 and alternating SFX lanes; typing ticks 0.3–0.45; a soft swish 0.5 on hard cuts or none; a success tone 0.6 on the payoff frame; room tone 0.03–0.05 under everything so silence never reads as a bug report. Bed 0.12 under VO, 0.5 with no VO, instrumental, 100–120 BPM. Strip the recording's own audio. Master −14 LUFS, ≤ −1 dBTP.

## Building it

**From a recording**: bring it in with `save-asset`, then follow `screen-capture`: trim, crop to the canvas, and **encode the seek-safe master: VP9 WebM at the project fps, a keyframe every 15 frames, a 0.5 s tail**, because the renderer seeks every frame and the CLI cannot decode H.264. Crop in `ffmpeg` so focus pushes start from a clean 1.0.

**With no recording**: rebuild the screen in the scene. It is sharper, already the right aspect, animatable per element, and has no private data. Show only what exists in the product (claims rules in `ugc-ad-foundations`); placeholder avatars and thumbnails come from `generate-image`.

- **Three.js** (default): each UI panel is a plane with a canvas texture drawn at 2× (text with the product's fonts, loaded before drawing) or a screenshot plane; a recording is a video texture seeked per frame (`three-assets`). State changes swap or redraw a panel's texture on a given frame. The cursor is a small textured plane above the UI (highest render order, depth test off); the ring is a ring geometry scaled per frame. Focus pushes scale the UI or recording plate in log space around the target, or dolly the camera (`three-camera`); captions sit on the camera-locked overlay (`three-type`, `three-camera`) so pushes never move them. Keep the cursor path, press frames and push targets as constants in `components/` so the SFX placement reads the same numbers.
- **HyperFrames**: the UI as elements in the scene's sub-composition, the cursor as an element tweened on the timeline, pushes as a tween on a wrapper; the recording as a `<video>` element.
- **React**: rebuilt UI components; cursor and pushes from `interpolate` on the frame with the house eases from `@genmotion/motion`.

Captions in the Clean demo skin (`ugc-ad-foundations` → `references/frame-presets.md`), at the caption line y 1160, clear of the UI region being demonstrated.

## Good and bad

- **Bad**: five features in fifteen seconds. **Good**: one, shown completing; the other four deleted.
- **Bad**: open the app, log in, navigate, click, wait 4 s, result. **Good**: result at frame 0, cut to the empty field at frame 36, three steps, the result again at frame 480 held for 4 s.
- **Bad**: the whole desktop at 1080 wide, nothing readable. **Good**: the working panel magnified 2.5×, a push to 1.8× on the output line.
- **Bad**: "Then you click the Generate button." **Good**: "Hit generate. It reads the page itself." (the cursor already shows the click).
- **Bad**: a brand card before the demo. **Good**: the product's own UI is the brand; the name lands with the CTA.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Real footage | `save-asset` for the user's recording; `screen-capture` for trimming and the seek-safe re-encode | Rebuild the UI in the scene, often better |
| Trim, crop, re-encode | `ffmpeg` | Use the recording uncropped on a plane and crop with the camera; still re-encode if at all possible |
| Narration | `pick-voice` then `voiceover` | A caption-led silent cut; this format survives mute better than any other |
| Interaction sound | `sfx` | Credited CC0 clicks via `web-research` + `save-asset` |
| Music | `music` | No bed: clicks and room tone alone |
| Placeholder content | `generate-image` | Initials and flat shapes, never a real person's photo |

## Checks before you finish

1. `capture-frames` at frame 0: the finished result is on screen (not an empty app, not a logo). At frame 45: the empty start state.
2. Capture every press frame and press + 3f: the state change and the ring are visible by press + 3.
3. Capture 5 consecutive frames in the middle of one cursor move and around one press: the cursor arcs, slows into the target, and is still for ≥6f before the press.
4. Capture the first and last frame of every focus push: the target's text is ≥34 px at the end; the cursor and the caption did not move during it.
5. Contact sheet (`ffmpeg`, 1 fps): no wait or load holds longer than 15f; no stretch of 90f without a change.
6. Mute it: the captures alone say what the product does and what to do next.
7. If a recording is used: `ffprobe` shows VP9, the project fps as both `r_frame_rate` and `avg_frame_rate`, and a keyframe every 15 packets (`screen-capture`'s check).
8. Clicks sit on press frames (compare the cue sheet with the captures); the export measures −14 LUFS ±1.
9. `validate` passes; then run `ad-qa` in full.
