---
name: app-store-preview
description: "App Store and Google Play preview videos: up to three 15 to 30 second cuts per locale, each standalone (what it is, the best feature, the payoff). Covers the verified store specs (Apple's 886 x 1920 and 1200 x 1600 sizes, 30 fps cap, H.264 settings, the 5 second poster frame; Play's YouTube link rules), what each store rejects (hands, prices, dates, footage outside the app), muted-first design, native full-screen framing with touch hotspots, frame budgets, export and ffprobe checks. Load it when the ask is a store listing preview, not a general product video."
---

# App Store preview

The most constrained format in the pack: fixed sizes, a 30 fps cap, muted autoplay, and a review that rejects work outside the rules. A preview is the app's own UI, captured full screen, edited so a stranger understands the core loop with the sound off in the first few seconds. Frames at 30 fps (the store maximum). Read `direction` first; moves come from `motion-language`, the mix from `sound-design`. The full spec tables and export commands are in `references/store-specs.md`; read it before setting the project size.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- "App Store preview video", "Play Store listing video", "preview for our app page", "15 second video for the store".

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| A product film for a site or social | `launch-playbook` |
| A vertical ad that will run as paid social | `ugc-screen-demo` |
| A long tour of the app | `demo-walkthrough` |
| One shipped feature for existing users | `announce-feature` |

## Ask first

1. **Which store, and which devices?** Apple needs one set per device size class (iPhone 886 × 1920, iPad 1200 × 1600); Google Play takes one YouTube link.
2. **Do you have screen recordings of the current build?** Captured from the device at native resolution is best; screenshots can be animated but must show real UI.
3. **Which locales?** Each language gets its own set; overlay text is kept as data so every locale re-renders from one project.

## The specs that cause rejections

Verified October 2026; re-check with `web-research` before submitting (sources named in `references/store-specs.md`).

| | Apple App Store | Google Play |
| --- | --- | --- |
| Length | 15–30 s | No hard cap; only the first 30 s may autoplay. Make it 15–30 s |
| Count | Up to 3 per locale, per device size | One video |
| Size | iPhone 6.1"–6.9": 886 × 1920 (or 1920 × 886); iPad: 1200 × 1600 (or 1600 × 1200); older sizes in the reference | Any YouTube-standard size, portrait or landscape |
| Frame rate | ≤30 fps | YouTube's own |
| Encoding | H.264 High ≤4.0, 10–12 Mbps, stereo AAC 256 kbps; ≤500 MB | Uploaded to YouTube: public or unlisted, embeddable, not age-restricted, ads off |
| Playback | Autoplays muted | May autoplay the first 30 s muted, over the feature graphic |
| Still | Poster frame defaults to **5 s** | The 1024 × 500 feature graphic |

What gets rejected (Apple's guidelines; Play is looser but the same rules keep the listing honest):

- **Hands, fingers, people holding the device**, over-the-shoulder shots. Use a drawn touch hotspot instead.
- Footage or graphics from outside the app, concept art, or features the submitted build does not have.
- **Prices** and **seasonal or dated references** ("new for spring", a year).
- In-app purchases shown without a disclosure (in the footage or the end frame).
- Unlicensed music, images or fonts.

## Direction defaults

- **Style family**: none of the house families wholesale: the app's own UI is the look. Overlay text borrows B's type (a neutral grotesque 400–500 per `three-type`'s size table, one accent) and stays out of the UI's way. Landscape Play videos may use B or C around a device on a stage.
- **Framing**: **full screen, native UI, no device frame** (the store presents the video; a frame inside wastes pixels). Apple recommends native resolution rather than zooming in, so keep pushes rare: at most one slow push of ≤1.15× on a detail, held, per cut.
- **Energy curve**: front-loaded like a feed ad: the core interaction is visible by frame 15, a new step every 1–3 s, the payoff in the last 4–5 s. Each cut has its own small peak.
- **Pacing**: High to Medium (a new UI state every 20–45f). Real UI transitions as they happen in the app; between scenes, a cut or a short dissolve (Apple names cuts, dissolves and fades as the expected transitions).
- **Sound**: muted-first: the video must make complete sense silent. Sound-on viewers get a licensed track at 0.5–0.6 with the app's own UI sounds at 0.8–1.0, or music at 1.0 alone. VO is optional and never carries information the picture does not.
- **Memorable moment**: the app's core loop completing once, cleanly, in the first third.

## The three cuts

A viewer may only see the first, and each plays alone, so none of them depends on another.

| Cut | Job | Content |
| --- | --- | --- |
| 1. What it is | Answer "what does this app do?" | The core loop, one continuous demonstration, from open to result |
| 2. The best feature | The strongest reason to install | The single most differentiated capability, shown in full |
| 3. The payoff | Close on the reward | The outcome the app produces (the finished photo, the paid bill, the streak), not the mechanism |

Ship one if that is all there is material for; the first cut is the one that matters.

## Frame budgets

| Length | Frames and beats |
| --- | --- |
| **15 s** (450f) | Core interaction from frame 0, caption 1 by frame 15 · step 2 at 90–120 · step 3 at 210–240 · result 300–390 · end frame 390–450 (app name + disclosure if needed) |
| **20 s** (600f) | Interaction 0–150 (poster frame at 150 shows the result of step 1) · steps 150–420 · result 420–520 · end frame 520–600 |
| **30 s** (900f) | Core loop 0–300 (poster at 150) · best feature 300–630 · payoff 630–810 · end frame 810–900 |

- **The poster frame (5 s, frame 150)** is the still most people see when autoplay is off: make frame 150 a fully built, legible, attractive state with its caption on screen, never a transition. Or pick another frame in App Store Connect and say which.
- **Captions**: ≤5 words, one per step, 64–132 px at 886 or 1080 wide, held `max(30, 9 × words + 15)` frames, placed where the UI is empty (usually the top 12–20% of the frame), on a solid band if the UI behind is busy. Plain words that age well: "Name any plant", not "New in 2026!".
- **End frame**: the app name and icon, 60–90f; no price, no "Download now" badge artwork (the store already shows the button).

### Directed example: cut 1, 20 s, iPhone 886 × 1920

| # | Frames | Job | On screen | Caption (words → hold f) | Sound (if unmuted) |
| - | - | - | - | - | - |
| 1 | 0–60 | Hook | Camera view already open on a houseplant | "Name any plant" (3 → 42f) | Track downbeat on frame 1 |
| 2 | 60–125 | Core loop | Hotspot on the shutter at 66; the leaf outline locks on in 20f; name and care fields fill line by line 6f apart | — | Shutter sound from the app |
| 3 | 125–300 | Poster state | The plant card, fully built by 125; its caption legible by 140 and on screen at 150 | "Care tips, written for you" (5 → 60f) | — |
| 4 | 300–420 | Organise | Swipe trail moves it into "Living room"; the room's count ticks 12 → 13 | "Sorted by room" (3 → 42f) | Soft tick |
| 5 | 420–520 | Result | The week's watering calendar, every plant on its day | "Never miss a watering" (4 → 51f) | Track's lift |
| 6 | 520–600 | End frame | App icon and name | "Subscription required for reminders" (4 → 51f) | Track's button |

## Craft

- **Touch hotspots** replace fingers: a ring of 60–90 px at 886 wide, growing from 0.6 → 1 scale with opacity 0.6 → 0 over 12–14f outCubic, drawn on the tap frame. A long-press holds a filled circle; a swipe draws a short trail along the path.
- **Real interactions at real speed**, trimmed: cut any wait over 15f; typing compressed to 2–3 frames per character; scrolls 18–24f outExpo with velocity blur only if the app's own scroll shows it.
- **Status bar**: clean it (full battery, signal, a neutral time such as 9:41); never a carrier name or notification banner.
- **Continuity across cuts**: the same account, data and theme in all three cuts and every locale.
- **Localization**: captions, the app's UI language and any VO all match the locale; render each locale from the same project with the strings swapped.

## Building it

- **Three.js (default)**: the recording as a full-frame video texture on a plane that exactly fills an orthographic camera at 886 × 1920 (`three-assets`), captions from `three-type` on canvas-texture planes, the hotspot as a `RingGeometry` plane scaled and faded per frame, a rare push via `three-camera`, a cut or dissolve between scenes (`three-transitions`), a neutral, untinted look (`three-look`: no tone mapping that shifts the app's colours).
- **HyperFrames**: the recording as a `<video>` filling the composition; captions and hotspots as elements on the timeline.
- **React**: the project's video component full frame; `<TextAnimation>` for captions.
- Set `width`, `height` and `fps: 30` in `project.json` to the exact store size before building, then encode with the command in `references/store-specs.md`. Recording prep (trimming, removing the device frame, scaling without blur): `screen-capture`.

## Good and bad

- Bad: an iPhone mockup on a gradient with a hand tapping it. Good: the app full screen, a ring blooming on each tap.
- Bad: frame 150 is mid-dissolve between two screens. Good: frame 150 is the identified plant's card, care fields filled in, caption "Care tips, written for you".
- Bad: "Only $4.99 — Spring sale!". Good: "Unlimited scans with Pro" with "Subscription required" on the end frame.
- Bad: three chapters of one story. Good: three cuts, each complete on its own.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Recordings of the current build | `save-asset`; `screen-capture` for trims, crops and scaling | Animate real screenshots; with no real UI at all, do not ship a preview |
| Current store rules | `web-research` | The October 2026 table above, flagged to the user as possibly stale |
| Encoding, silent track, probing | `ffmpeg` | None: a file that fails the spec is rejected on upload |
| Music | `music` | Silent with UI sounds, or silent |
| UI sounds | `sfx` | The app's own sounds from the recording |
| Seeing it | `capture-frames` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `ffprobe` on every delivery file: width and height exactly an accepted size for its device class, 30 fps or less, H.264 High level ≤4.0, a stereo AAC track at 44.1 or 48 kHz, duration between 15.0 and 30.0 s, size ≤500 MB.
2. `capture-frames` at frame 15: the app's core screen and the first caption are visible.
3. `capture-frames` at frame 150 (the default poster): a fully built, legible state with its caption, not a transition. If another poster frame was chosen, say which.
4. Muted review on captured frames, one per 30f: a stranger could say what the app does from the frames alone.
5. No hands, devices, prices, years or seasonal words appear anywhere (check every caption string and the end frame).
6. Every visible screen exists in the current build; in-app purchases shown are disclosed.
7. Each cut stands alone: its first frame needs no earlier cut to make sense.
8. Every caption holds ≥ its formula and sits on empty UI or a band, never over the control being used.
9. Any music has a licence line in `VIDEO.md`; if there is sound, `ebur128` gives −14 LUFS ±1 and true peak ≤ −1 dBTP.
10. Google Play: the YouTube video is public or unlisted, embeddable, not age-restricted, with ads off; tell the user to check these settings. The `direction` self-critique passes; `validate` passes.
