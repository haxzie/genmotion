---
title: Skills
seoTitle: "Video skills for Claude Code and Codex agents"
description: "GenMotion skills tell your agent how to make each kind of video: launch films, feature announcements, explainers, logo stings, app previews and social ads."
group: Guides
order: 3
keywords: [Claude Code skills, agent skills for video, launch video skill, explainer video AI, UGC ad generator, AI logo animation]
updated: 2026-10-01
---

A skill is a folder of instructions that tells the agent how a particular kind of video is made: its structure, pacing, the questions to ask first and the checks before it's done. GenMotion ships a pack of them with the CLI, the Studio and the Claude Code plugin.

## Video types

Each kind of video has one skill that owns it. The agent picks exactly one owner per video.

| Video | Skill | Delivers |
| --- | --- | --- |
| Product launch | `launch-playbook` | A launch film for a new product or company |
| Feature or changelog | `announce-feature` | One new feature, shown working |
| Milestone | `announce-milestone` | A number, a funding round, a launch anniversary |
| Explainer | `explainer` | A concept, process or comparison, step by step |
| Logo reveal | `brand-sting` | A short logo sting or bumper |
| App store preview | `app-store-preview` | An App Store or Google Play preview video |
| Product walkthrough | `demo-walkthrough` | A guided tour of a real product flow |
| Social ads | `ugc-screen-demo`, `ugc-problem-solution`, `ugc-unboxing`, `ugc-green-screen` | Vertical, feed-native ad formats |
| Anything else | `freeform-video` | The fallback for any other video |

## Craft skills

Loaded alongside the owner for the project's engine. For Three.js projects:

| Skill | Covers |
| --- | --- |
| `three-camera` | Camera moves, framing and depth |
| `three-type` | Text in 3D: fonts, layout, reveals |
| `three-transitions` | Cuts and transitions between scenes |
| `three-assets` | Images, video, logos and 3D models |
| `three-look` | Lighting, color, materials and post-processing |

## How the agent picks one

The router skill, `genmotion-skills`, runs at the start of a new video:

1. If `VIDEO.md` exists, it already names the skill. The agent loads it and carries on.
2. Otherwise it searches the pack with your own words and picks one owner.
3. It asks only the questions that skill marks as required and you haven't answered.
4. It writes the brief and the choice to `VIDEO.md`.

## Use skills from the terminal

```sh
npx genmotion skills list
npx genmotion skills search "explainer about how our sync engine works"
npx genmotion skills show explainer
npx genmotion skills add explainer   # copy it and what it needs into the project
```

Over MCP the same thing is `search_skills` and `get_skill`. Every search result says what the skill delivers, which questions it asks first, and anything it needs that this setup doesn't have, with what to do instead.

::: note
Some skills use voiceover, which the Studio provides and the CLI doesn't. Search results flag this, and the skill falls back to on-screen captions.
:::
