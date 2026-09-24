---
name: announce-feature
description: "The 20 to 45 second changelog video after Linear, Notion and Slack: what changed, why it matters, show it, where to get it. Covers quick-highlights-over-feature-lists, the UI-in-motion patterns that carry the demonstration, why the CTA points at the feature itself rather than a marketing page, and the recuts for an in-app banner, a changelog embed and a social clip. Load it for a single feature or a small feature set, not a whole-product launch."
---

# Announce feature

A feature announcement is small on purpose. One thing changed; say what, why, and show it, then get out.

## When to use

Load this for a single feature or a tight cluster of related ones. Route to `launch-playbook` instead when the ask is the whole product, and to `announce-milestone` when there is no feature at all, only a number.

## The shape

Four beats, always in this order, and the whole thing is usually under 45 seconds.

| Beat | Time | Job |
| --- | --- | --- |
| What changed | 0 to 6s | Name it plainly. No preamble. |
| Why it matters | 6 to 14s | One sentence tying it to a real moment the viewer has had. |
| Show it | 14 to 35s | The feature working, in the real interface. This is most of the video. |
| Where to get it | 35 to 42s | Point at the feature itself. |

Quick highlights beat a feature list every time. If the update has three parts, show the best one fully rather than all three partially; a viewer remembers one clear thing, not three blurred ones.

## UI-in-motion patterns

The demonstration is a screen recording or a rebuilt interface (`screen-capture` owns the mechanics). Three patterns carry almost every feature announcement:

- **The cursor as narrator.** It moves with intent, pauses before the click that matters, and the click has a visible state change. No narration line should describe what the cursor is about to do; let it do it.
- **The before-and-after state.** One screen, two states, a hard cut or a wipe between them. This is the fastest way to show "you couldn't do this, now you can" without saying it.
- **The punch-in on the new thing.** Everything else on screen is familiar; the new control, panel or button is the one thing that gets a camera move. Push in on it the moment it appears, a punch-in of roughly 10 to 15 percent over about a second; read your project's own authoring guidance for the exact motion API.

Do not tour the whole interface. The rest of the product is context, shown briefly if at all; the new thing gets the runtime.

## Writing it

Plain, specific, present tense. "You can now export straight to your CDN" beats "We're excited to announce a brand new export experience." State the feature's name once, early, and never again by a different name later in the same script.

The why-it-matters beat is the one line that is allowed to be a little bit of copywriting; the rest should read like a changelog entry someone actually wrote.

## The CTA

Point at the feature, not the homepage. "It's on by default" or "Turn it on in Settings" beats "Learn more at ourproduct.com". The viewer already knows the product; the only friction left is finding the toggle.

## Recuts

One script, three placements, minimal rework:

| Placement | Aspect | What changes |
| --- | --- | --- |
| In-app banner | Often square or a short 16:9 strip | Trim to the show-it beat almost entirely; the viewer is already inside the product |
| Changelog embed | 16:9, autoplay muted | Full four-beat cut, captions load-bearing |
| Social clip | 9:16 | Recrop, apply `ugc-ad-foundations` safe zones, and open on the show-it beat rather than the what-changed line, because social audiences need the visual hook first |

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Real footage of the feature | `save_asset` on the user's recording, `screen-capture` for the ffmpeg and framing recipes | Rebuild the relevant UI in HTML rather than describe it |
| Narration | `pick_voice` then `generate_voiceover` | Captions carry the whole thing; this format survives mute well |
| The punch-in on the new control | Your project's own motion/keyframe authoring guidance | A hard cut to a closer crop of the same still |
| Sound on the click | `generate_sfx` | Silence is acceptable here only if the whole cut is silent |

## Checks before you finish

1. `capture_frames` at 0s. The what-changed line is legible immediately, no wind-up.
2. Watch muted. The new capability is visually obvious even without the narration.
3. The feature is named once and consistently.
4. The CTA names where to find it, not a generic destination.
5. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three).
