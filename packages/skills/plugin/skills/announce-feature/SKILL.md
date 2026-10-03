---
name: announce-feature
description: "The 15 to 45 second feature announcement or changelog video, in the manner of Linear, Notion and Slack: what changed, why it matters, show it, where to find it. Covers naming the feature in the first six words, frame-budgeted beat sheets for 15, 20, 30 and 45 seconds with VO word budgets, the cursor, before-and-after and focus-push patterns with house timings, the CTA that points at the toggle, sound per interaction, and recuts for an in-app loop, a changelog embed and a vertical social clip. Load it for one feature or a small set, not a whole-product launch."
---

# Announce feature

A feature announcement is small on purpose. One thing changed: name it, say why it matters in one line, show it working in the real interface, and point at where to find it. The viewer already knows the product; they need to see the new thing, not the company. Frames at 30 fps. Read `direction` first; moves come from `motion-language`, levels from `sound-design`.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, never putting words in a real person's mouth, and the sound bans in `sound-design` (no whoosh; never a synthesised noise bed, room tone or "air", which reads as wind or hiss on phones). The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- A single feature or a tight cluster of related ones: "changelog video for our new release", "announce this feature on social", "in-app video for this update", "feature reveal video".
- An integration going live (a new connector, an API, an MCP server) when the story is one workflow it enables.

Another owner fits better when:

| The ask is really | Owner |
| --- | --- |
| The whole product, or a new product | `launch-playbook` |
| A number, with no feature to show | `announce-milestone` |
| A 1–3 minute walkthrough of the workflow | `demo-walkthrough` |
| A paid vertical ad built around the feature | `ugc-screen-demo` |
| A store listing preview | `app-store-preview` |

## Ask first

1. **Which feature, and what can the user do now that they couldn't before?** One sentence; that is the proposition.
2. **Where does it play: changelog or blog embed, in-app, or social?** It decides aspect, VO and whether it must loop.
3. **Is there a screen recording or screenshots of it?** Real UI is the whole video; without it, ask before rebuilding from a description.

## Direction defaults

- **Style family**: B (soft-light SaaS) by default: the product's own UI rebuilt and magnified on a light stage. E (chat-UI social) when the feature lives in a conversation (polls, reactions, a messaging feature). D (one-shot camera) when the feature is a place inside the product the camera can travel to.
- **Energy curve**: steps to one peak: the first time the new control is used and its result appears, at **35–45%** of the length. Before it, the familiar product (energy 4); after it, the payoff and the CTA (5, then 3).
- **Pacing**: Medium (new information every 30–50f); a social cut runs High (18–30f).
- **Transitions**: signature is the **persisting element**: the same window, card or cursor carries across every cut, because the feature lives inside a product the viewer knows. Workhorse exit-then-cut. A match-push (24–48f) into the new control is the natural peak.
- **Sound**: VO-led with a bed per `sound-design`'s bed row (0.1–0.2 under any voice, default 0.18) for changelog embeds; music-led at 1.0 with UI clicks for social; none for an in-app loop. One sound per interaction that matters.
- **Memorable moment**: the new control doing its job in one move: the poll appears and the votes roll in, the export lands in the CDN, the typed command becomes the result.

## Beat sheets

VO budgets at the house 2.3 words/s over the VO window (starts 6f in, last 45–60f VO-free); the ceiling is 2.5 words/s. Text holds follow `max(30, 9 × words + 15)` frames.

### 30 s (900f), the default

| # | Frames | Job | Content | Typical motion | Sound |
| - | - | - | - | - | - |
| 1 | 0–90 | What changed | The feature's name in the first 6 words, over the product already on screen | Name by word in the family's headline entrance (`motion-language`: blurUp for energetic films, rise + fade for calm ones); the UI is already visible behind it | Frame-1 transient; VO from 6f |
| 2 | 90–240 | Why it matters | One real moment the viewer has had: the "before" state | Same framing as beat 3 so the change reads; slow creep +2–3% | Bed only |
| 3 | 240–330 | **First use (peak)** | The cursor or finger triggers the feature; the result appears | Cursor 16–26f arc, press 4f in / 6f out, ring 8–14f; focus push 24–48f to 1.3–2.5× on the new control | Click 0.8–1.0 on the press frame |
| 4 | 330–750 | Show it | 1–2 more runs on the same surface: input → response → result | Persisting element between runs; layout morphs 24f | One cue per interaction, ≤1 per second |
| 5 | 750–900 | Where to find it | The toggle, menu path or command, then the product mark small | Path text holds ≥ its formula; mark persists from the UI | Bed button or chime 0.6 on the mark |

VO ≤64 words. The name is said once, early, and never by another name later.

### Other lengths

| Length | Frames | Beats | VO |
| --- | --- | --- | --- |
| 15 s | 450 | Name + UI 0–60 · first use 60–180 (peak ~150) · show it 180–360 · where 360–450 | ≤30 words, or none |
| 20 s | 600 | Name 0–75 · why 75–180 · first use 180–270 · show it 270–495 · where 495–600 | ≤42 words |
| 45 s | 1350 | Name 0–90 · why 90–300 · first use 300–420 · show it 420–1110 (3 runs) · second detail or a customer line 1110–1215 · where 1215–1350 | ≤98 words |

Three parts to the update? Show the best one fully and name the others in one line at the end. A viewer remembers one clear thing, not three blurred ones.

## Script

- Plain, specific, present tense, written like a changelog someone meant: "You can now export straight to your CDN", not "We're excited to announce a brand-new export experience".
- Line 1 names the feature within six words. Line 2 is the only line allowed to be copywriting: the real moment it fixes.
- No line describes what the cursor is about to do; let the cursor do it. VO names the result as it appears (±6f).
- The CTA is the path, not the homepage: "It's on by default", "Settings → Labs → Polls", "Type /export". The viewer's only remaining friction is finding the toggle.

## UI-in-motion craft

- **Rebuild and magnify**: the real UI at true proportions, the region around the new control magnified 2–2.5× so its label reads at ≥24 px on a 1080p frame. The rest of the product is context, seen briefly at 1× if at all.
- **The cursor narrates**: it travels 16–26f on an arc (x outCubic, y inOutCubic), slows into the target, rests 6–10f before the click that matters, and never moves during a camera push. The press is 4f in, 6f out at −8 to −15% scale with an 8–14f ring; the state change shows within 3f of the release.
- **Before and after**: one framing, two states. Carry the frame across the change as a persisting element and swap only what changed (a word-slot flip 10–14f for a label, a panel wipe 8–23f along the direction of travel for a region). Never cut to a new layout to show "after".
- **Focus push, not punch**: the move onto the new control is a focus push of 24–48f inOutCubic to 1.3–2.5×, drift stopped. A punch-in (8–15% in 6–10f, hold ≥15f, release 10–15f) is only for a music hit. Both are defined in `motion-language`.
- **Typing**: 2–3 frames per character, finishing ~4f before the send; the full string's width is reserved so nothing reflows; caret solid while typing.
- **Dead waits**: cut any loading longer than 15f, or compress it to 15–20f.

## Directed example: 20 s changelog clip, muted embed

```markdown
## Direction
SMP: Decide in the chat, not about the chat.
Audience / placement / sound: existing users · changelog embed · sound off-first
Idea: We show a group chat going in circles as a thread that one poll straightens out.
Style family: E chat-UI social — the feature lives in a conversation
Transitions: signature persisting element (the thread never leaves) · workhorse none · travel bottom → top
Energy curve: 4 → peak 9 at 210 (first vote lands) → 5 → 3
Sound: music-led at 1.0 when unmuted, a ping 0.85 on each bubble's first visible pixel, tap-pop 1.0 on the press
Memorable moment: 180–240 — the poll grows into the thread and five votes tick in 12f apart

## Beats
| # | Frames | Job | On screen (words → hold f) | Sound cue |
| 1 | 0–75 | Name | "Polls, now in every chat" (5 → 60f) over the thread | Ping on the first bubble |
| 2 | 75–180 | Why | Five messages 22f apart: "Fri?" "Sat?" "idk" | A ping per bubble |
| 3 | 180–270 | First use | Finger taps the poll button (approach 22f, dip 4/9f), poll grows 11f | Tap-pop on 200 |
| 4 | 270–495 | Show it | Options stagger 4f; votes every 12f; the winner fills | Soft tick 0.45 per vote |
| 5 | 495–600 | Where | "Tap + → Poll" (3 → 42f), mark small | Chime 0.6 on 510 |
```

## Recuts

| Placement | Aspect, length | What changes |
| --- | --- | --- |
| Changelog or blog embed | 16:9, 20–45 s, autoplays muted | The full beat sheet; every claim also on screen; VO is a bonus |
| In-app banner or empty state | 16:9 strip, 1:1 or the slot's own size, 6–15 s | Beat 3–4 only, silent, **loop-safe**: the last frame equals the first, ambient motion on whole cycles of the loop length |
| Social clip | 9:16 or 4:5, 15–20 s | Open on the first use, not the name (the visual hook first, the name as the first caption); type re-laid 2–4 words per line inside x 120–840, y 270–1210 |

## Building it

- **Three.js (default)**: UI rebuilt as planes with canvas-drawn content (`three-assets`' `references/drawn-ui.md` has tested panel, field, chip and button helpers; `three-assets` also for screenshots and video textures, `three-type` for crisp UI and headline text), an orthographic or fixed-distance camera so pixel sizes stay exact, focus pushes via `three-camera`, and the cursor as a small textured plane with its own pose module so the next scene can start from it. Floods and wipes from `three-transitions`.
- **HyperFrames**: the UI as markup inside each scene's sub-composition; the cursor and ring as timeline tweens; clicks as `<audio>` elements at the press time.
- **React**: one scene per beat; `@genmotion/motion` eases; `<TextAnimation>` for the name.

## Good and bad

- Bad: a 3 s logo, then "Big news!", then a tour of the sidebar. Good: frame 0 shows the inbox; "Polls, now in every chat" types in; the cursor goes straight to the new button.
- Bad: "after" is a different screenshot with a crossfade. Good: the same message thread, the poll grows into it, votes tick in.
- Bad: "Learn more at acme.com". Good: "Settings → Labs → Polls", held 2 s.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Real feature footage or screens | `save-asset`; `screen-capture` for cropping, scaling and cursor recipes | Rebuild the UI from the user's screenshots; never from a description alone |
| Narration | `pick-voice`, then `voiceover` | On-screen lines carry it; this format survives mute |
| Click and UI sounds | `sfx` | Credited CC0 UI sounds, or a music-only cut |
| Music | `music` | No bed; clicks and their tails |
| Seeing it | `capture-frames` | None |
| Loudness, loop check | `ffmpeg` | None |
| Direction, moves, mix | `direction`, `motion-language`, `sound-design` | — |

## Checks before you finish

1. `capture-frames` at frame 0 and 15: the product UI is visible and the feature's name is readable by frame 15 (social cut: the new control is already on screen).
2. The feature's name appears in the first six words of the VO or the first on-screen line, and only that name is used throughout.
3. The peak (first use) sits at 35–45% of the length; capture the press frame and 3f after it: the state change is visible.
4. The new control's label is ≥24 px tall in the captured frame at its focus push.
5. Muted, on captured frames alone, a viewer can tell what changed and where to find it.
6. Every click sound sits on its press frame (capture the cue frame and the frame before).
7. VO words ≤ the budget; VO starts 3–8f after each cut.
8. The CTA frame names a path, command or default, and holds ≥ its text formula.
9. In-app loop cut: the first and last frames are identical (compare the two captures; on the export, PSNR ≥ 30 dB at 320 px per `direction`'s critique §1); no audio.
10. `ffmpeg` `ebur128`: −14 LUFS ±1, true peak ≤ −1 dBTP (cuts with sound). The `direction` self-critique passes; `validate` passes.
