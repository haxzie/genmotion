---
name: genmotion-skills
description: "The router for GenMotion's creative pack: start here for any new video request. It sends you through creative direction first, then picks the one skill that owns the video type (launch, feature announcement, milestone, explainer, brand sting, app store preview, walkthrough, UGC ad formats, editing the user's own footage, or a freeform fallback), loads what that skill needs for this project's engine, and records the choice in VIDEO.md so later sessions resume instead of re-deciding. Creative direction for every engine; your project's own authoring rules still own how a scene gets built."
---

# The GenMotion pack: direct, pick one skill, then build

This pack says **what the video should be**: the idea, the format, the beat sheet, the motion and the sound. Your project's own authoring rules (its AGENTS.md) say how a scene is built. This skill is the router between the two.

> **These are references, not rules.** The numbers, beat sheets, style families and examples here are starting points distilled from work that landed well, not a recipe to fill in. The user's instructions always win over anything in this skill. When a different idea serves the brief better, propose it and try it: change the structure, break a default, invent a device, and write what you changed and why in `VIDEO.md`. What stays fixed is correctness: determinism, legibility and safe zones, loudness and clipping, licences and credits, and never putting words in a real person's mouth. The checks at the end are a quality bar to clear, not a template to reproduce.

## When to use

- Any new video request, before planning anything.
- Resuming a video: check for `VIDEO.md` first.
- "What can you make?" or "which format should this be?"

Skip it for a small edit to an existing video ("make the logo bigger"). Just do the edit.

## Step 0: is there already a decision?

If the project has a `VIDEO.md`, read it. Its `skill:` line is the decision and its `## Direction` block is the brief: load that skill and continue where the file says. Do not re-route or re-direct an existing video unless the user asks for a different kind of video.

## Step 1: read `direction`

Read `direction` before choosing anything. Its Part A turns the request into a proposition, an audience and placement, and an idea, and asks only the few questions that change them; that is what makes the owner choice below a real decision. After you pick the owner, its Part B writes the `## Direction` block and the timed beat table into `VIDEO.md`.

## Step 2: search

Run `search-skills` with the user's own words for **what they want made**, in a short phrase ("animated logo for a coffee roastery", "vertical clip from our podcast"), not the whole brief pasted in: brand names, colours and platform details drown the words that pick the format. Each result shows its kind, its **deliverable** (what the user ends up with), the questions it asks first, and which of its needs this setup has. If no workflow or style skill is in the results, check the owner table in Step 3 before falling back to `freeform-video`.

## Step 3: pick exactly one owner

Only `workflow` and `style` skills own a video. Pick one:

1. **Match the deliverable, not a word in passing.** "A launch video with a logo sting at the end" is a launch (`launch-playbook`), not a sting. "A TikTok ad for our app" is a UGC format, not an app store preview.
2. **Inputs break ties.** Footage the user shot (a podcast, a talking head, a clip to cut into a trailer or social edit) points to `video-editing`; a screen recording toward `ugc-screen-demo`, `app-store-preview` or `demo-walkthrough`; a single number toward `announce-milestone`; a concept to explain toward `explainer`.
3. **Still tied? Lower `priority` wins.** It ranks the more specific format above the more general one.
4. **Nothing fits?** `freeform-video`. Never stitch two owners together; borrow a shot list from a second skill by name if you must.

| Owner | The video |
| --- | --- |
| `brand-sting` | 2–8s logo reveal or bumper |
| `app-store-preview` | Store preview from the app's screens |
| `announce-milestone` | One number, celebrated |
| `announce-feature` | A changelog video for one feature |
| `demo-walkthrough` | A guided tour of one product flow |
| `launch-playbook` | A product launch film |
| `ugc-screen-demo`, `ugc-green-screen`, `ugc-unboxing`, `ugc-problem-solution` | Vertical social ad formats |
| `explainer` | A concept, process, comparison or number, explained |
| `video-editing` | The user's own footage edited: podcast clip, talking head, trailer, social cut |
| `freeform-video` | Anything else |

## Step 4: ask only what's missing

Each owner lists up to three `askFirst` questions; `direction` may already have asked some. Ask only what neither the request nor an earlier answer settled, all in one message. If the user said "just make it", choose sensible defaults and say what you chose, keeping what they told you apart from what you assumed.

## Step 5: record the decision

Write `VIDEO.md` at the project root, then let `direction` fill in its blocks:

```markdown
---
skill: launch-playbook
aspect: "16:9"
length: 30s
---
## Direction
SMP: One sentence the video says.
...

## Beats
| # | Frames | Job | Focal point | On screen | VO | Energy | Out | Sound cue |
```

The owner skill's own plan (shot list, script, cue sheet) goes in the body as you build. A later session reads this file in Step 0.

## Step 6: load what the owner needs

Read the owner skill fully. Then load its `requires` that apply to this project's engine:

- **Always**: `motion-language` (entrances, exits, easing, camera, handoffs) before the first scene, and `sound-design` (music, effects, VO mix, loudness) before placing any audio.
- **Launch-type films** (a product launch, feature announcement, brand sting, milestone, store preview, or a freeform promo for a product or company): `launch-taste` before writing direction's Idea and Style family lines; it chooses the concept device, the look and the sound's role, and its taste test joins the self-critique.
- **Foundations** for ads: `ugc-ad-foundations`, then `ugc-hooks`, `ugc-scripting` or `ugc-craft` when the owner says so.
- **Techniques**, cross-cutting: `screen-capture`, `ai-presenter`, `stock-and-broll`, `ad-qa`.
- **Engine craft** for Three.js projects: `three-look` (lighting, palette), `three-camera`, `three-type`, `three-transitions`, `three-assets`. Load `three-look` before the first scene and the others as the plan needs them: a locked single-scene piece (most stings) skips `three-camera` unless the camera moves and `three-transitions` unless there is a handoff, a flash or an iris.
- **When two skills disagree, the owner wins for its own format**: a sting's sound rules (anticipation ticks, where the first sound sits) over `sound-design`'s general density, a trailer's card typography over the house sentence case, an owner's beat sheet over a style family's tempo. A general rule an owner does not mention still applies.

## Opening a skill's reference files

Skills keep long tables and code in `references/*.md` beside their `SKILL.md`, and say when to read each one. A path like `references/critique.md` is relative to that skill's own folder. How to open one on each surface:

- **Shell**: `npx @genmotion/cli skills show <id> references/<file>.md` (for example `skills show direction references/critique.md`); `skills show <id>` alone prints `SKILL.md` and lists the reference files at the end.
- **The GenMotion MCP server**: `get_skill` with the skill's `id` and `file: "references/<file>.md"`.
- **Skills installed as files** (the Claude Code plugin, Codex's `.agents/skills`, the desktop app): read `<the skill's folder>/references/<file>.md` directly.

Read a reference when the skill says the step needs it, not all of them up front.

## Capabilities, not tools

Skills in this pack name what to do as capability ids in backticks: `validate`, `capture-frames`, `project-overview`, `save-asset`, `generate-image`, `pick-voice`, `voiceover`, `sfx`, `music`, `place-audio`, `transcribe`, `search-skills`, `recommend-integration`, `ffmpeg`, `web-research`. Your environment's instructions map each one to a real tool, or tell you what to do when it isn't available. When a skill needs a capability you don't have, say so in one sentence, use the fallback, and carry on. Never stall a video on a missing generator.

**Times for `capture-frames`**: a bare number is a frame (`45` = `45f`); `1.5s`, `500ms` and `60%` (of the last frame) also work. They count from the start of the whole film, unless the tool takes a scene and you named one, so the land at frame 180 of a scene that starts at 90 is `270`.

## Requirements

Nothing. This skill is the map.

## Checks before you finish

- `VIDEO.md` names the owner skill, has a `## Direction` block and a beat table, and the video matches its length and aspect.
- `validate` passes.
- `capture-frames` on the first frame and on each scene you touched, and you looked at them.
- The owner skill's own checklist ran, and so did the self-critique in `direction`.
