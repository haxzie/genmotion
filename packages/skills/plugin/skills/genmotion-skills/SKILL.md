---
name: genmotion-skills
description: "GenMotion's creative pack: what to make, for the kinds of video people actually ask for, from viral UGC ads to product launches, feature announcements, milestones and brand stings. Read this when a request names an ad, a launch, an announcement or a social clip, or when search_skills returns something and you want to know how the pack fits together. It is creative direction, the same for every engine: your project's own authoring rules still own how a scene actually gets built."
---

# The GenMotion pack

This pack says **what the video should be**: the format, the beat sheet, the hook, the shot list, the thing that makes an ad work rather than merely render. It is written once, for every engine this app can produce a video in. Your project's own authoring rules (whatever they are for this engine) still own how a scene actually gets built; nothing here replaces them.

## When to use

Read this when the request is a piece of marketing rather than a piece of motion: an ad, a launch, a feature drop, a milestone, a brand sting, a social clip. Skip it for a pure craft question (how do I animate this) and for an edit to a video that already exists.

**Your first move on a new video request is `search_skills`**, with what the user said, in their words. It ranks the whole pack and tells you which of each skill's required integrations this machine actually has. Read the top match before you plan anything.

## How the pack is laid out

| Layer | Skills | When |
| --- | --- | --- |
| Foundations | `ugc-ad-foundations`, `ugc-hooks`, `ugc-scripting`, `ugc-craft` | Load `ugc-ad-foundations` for any ad. The other three on demand: hooks when you are choosing an opening, scripting when you are writing one, craft when you are cutting and captioning. |
| Formats | `ugc-screen-demo`, `ugc-problem-solution`, `ugc-unboxing`, `ugc-green-screen`, more arriving | One per ad format. Pick exactly one. |
| Launch and announcement | `launch-playbook`, `announce-feature`, `announce-milestone`, `brand-sting`, `app-store-preview`, `demo-walkthrough` | For product marketing rather than social ads. |
| Technique | `ai-presenter`, `screen-capture`, `stock-and-broll`, `ad-qa` | Cross-cutting. Loaded alongside a format, never instead of one. |

A format skill is short on purpose. It carries the reference shot list with timings, the script scaffold, the shot vocabulary and the failure modes. Everything general lives in the foundations.

## The order of operations

1. `search_skills` with the user's own words.
2. Read the top format skill. If it is a UGC format, read `ugc-ad-foundations` too.
3. Check requirements. If the skill needs a connector and `search_skills` reported it missing, call `recommend_integration` once, say in a sentence what you will do without it, and carry on.
4. Turn the shot list into your project's own planning artifact, if it uses one, then build the scenes. What that artifact is and how a scene actually compiles is your project's own authoring rules, not this pack's business.
5. Run the checks the format skill ends with.

Never load two format skills at once. If the request genuinely straddles two, pick the one that owns the opening and borrow the other's shot list by name.

## Requirements

Nothing. This skill is a map.

## What every skill in this pack assumes about tools

Every skill in this pack names the same handful of tools, and they work the same regardless of what the project's video engine is:

| Need | Tool |
| --- | --- |
| Check the composition or scene you just wrote | `validate_composition` (HyperFrames) or `validate_scene` (React, Three), each tells you plainly if you called the wrong one |
| Look at a frame | `capture_frames` |
| Bring a remote image, video, font or audio file into `assets/` | `save_asset` |
| Make artwork that is neither the user's nor a real brand's | `generate_image` |
| Narration | `pick_voice` once, then `generate_voiceover` |
| A whoosh, a click, ambience | `generate_sfx` |
| The timeline as the editor sees it | `project_overview` |

`ffmpeg` is on your shell's PATH for trims, transcodes and frame extraction. Write its output into `assets/`.

For the motion, camera and audio mechanics behind any of this, how a punch-in, a text stagger, or a mixed track actually gets written for this specific engine, read your project's own authoring guidance. This pack tells you what to build; it is deliberately silent on the markup.

## Checks before you finish

- The project's own check tool passes (`validate_composition` or `validate_scene`).
- `capture_frames` on the first frame and on each scene you touched.
- The format skill's own checklist ran, not just this one.
