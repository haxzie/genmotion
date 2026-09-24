---
name: app-store-preview
description: "Three 15-second App Store and Play Store preview videos: the store specs and the no-audio-dependency rule (they autoplay muted and Apple rejects previews that need sound), device frame rules per store, the three-video structure covering what it is, the best feature, and the payoff, and what each store rejects. Load it when the ask is specifically a store listing preview, not a general product video."
---

# App Store preview

Store previews are the most constrained format in the pack: fixed duration, fixed autoplay behaviour, and a review process that rejects work outside the rules. Read the specs before writing anything.

## When to use

Load this specifically for an App Store or Google Play listing preview. A general product demo for social or a landing page is `launch-playbook` or `demo-walkthrough`; this skill is only for the store surface itself.

## The specs

| | Apple App Store | Google Play |
| --- | --- | --- |
| Duration | 15 to 30 seconds, 15s is the safe default | 30 seconds max, 30s is standard |
| Aspect | Match the device orientation being previewed: 9:16 portrait, or 16:9 landscape for iPad/tablet cuts | 9:16 portrait or 16:9 landscape, must match the listing's primary orientation |
| Autoplay | Muted, on tap or scroll in the listing | Muted, autoplay in the listing |
| Device frame | Apple requires the video shot or composed to their device-frame templates; a bare screen recording without the frame is rejected | A device frame is expected but not enforced as strictly; include one anyway for a professional read |
| Real product only | Must be actual app UI and functionality, not concept art, marketing graphics laid over the UI, or footage of a different version than what is listed | Same rule, enforced less strictly but still real risk of rejection |

**The rule that catches people:** design the entire video to work with zero sound, because it will almost always be watched that way, and a preview that depends on audio to make sense is a preview that fails its actual job even when it technically passes review. On-screen captions or a purely visual demonstration are mandatory, not optional.

## What gets rejected

- Footage of a different app version than the one being submitted.
- Any UI element, price or claim that does not match what is currently in the app.
- Marketing graphics, text cards or illustrations that are not the real interface, used as filler between real shots.
- A device frame that does not match Apple's current template generation.
- Anything implying functionality the submitted build does not have.

When in doubt, use less footage rather than more embellishment. A preview that is 80 percent real screen recording and slightly plain beats one that is 60 percent real and rejected.

## Structure

Build three separate videos, each 15 seconds, each usable independently. Stores show multiple previews in sequence, and a user may watch only the first.

| Video | Content | Job |
| --- | --- | --- |
| 1. What it is | The core loop, in one continuous demonstration | Answer "what does this app do" for someone who has never seen it |
| 2. The best feature | The single most differentiated capability, shown in full | Give the strongest reason to install, isolated from everything else |
| 3. The payoff | The result the app produces, shown as the outcome rather than the process | Close on the reward, not the mechanism |

Each is a complete 15-second unit: a clean start, one clear demonstration, a clean end. Do not write them as three chapters of one script; a viewer who only sees video one gets no benefit from video two's setup.

## Building each 15-second cut

Same discipline as `ugc-screen-demo`'s "one satisfying thing" rule, compressed further: one continuous action, cursor already in motion, result visible before the clip ends. No hook, no CTA. Captions optional but recommended, since the video plays muted by default; if used, they should be minimal, three or four words at a time, not a running transcript.

Device frame: build it as HTML markup around the screen recording, matching the current store template's proportions and corner radius, never as a photo composite. `screen-capture` has the ffmpeg recipes for getting the recording into the right crop first.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Real screen recordings of the current build | `save_asset`, `ffmpeg` via `screen-capture` | There is no honest fallback; a store preview without real footage should not ship |
| The device frame | Built as HTML markup, matched to the current store template | None; a bare screen recording risks rejection |
| Captions | Your project's own caption/text authoring tooling | Plain on-screen text at key moments |

## Checks before you finish

1. All three videos are exactly within the store's duration limit.
2. `capture_frames` on each, muted review: the demonstration is understandable with no sound.
3. Every UI element visible matches the current submitted build, nothing else.
4. The device frame matches the current store template, not an old one.
5. Your project's own check tool (`validate_composition` for HyperFrames, `validate_scene` for React and Three) on all three.
