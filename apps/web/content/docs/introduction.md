---
title: Introduction
description: "GenMotion makes motion videos with coding agents. Describe a video to Claude Code, Codex or Cursor and get Three.js scenes, a live preview and an MP4."
group: Getting started
order: 1
keywords: [AI video generator, Claude Code video, Codex video, programmatic video, Three.js video, motion graphics with code, GenMotion]
updated: 2026-10-01
---

GenMotion turns a description into a finished video. Your coding agent writes the scenes as code, you watch them in a frame-accurate preview, and the export is the same frames as an MP4. There is no keyframing by hand and no render farm: everything runs on your machine.

::: cards
- [Quickstart](/docs/quickstart): Make your first video in five minutes, from a prompt or three commands.
- [Install the Studio](/docs/install-studio): The desktop app for Mac: chat, preview, timeline and one-click export.
- [Install the CLI](/docs/install-cli): `npx @genmotion/cli` for any terminal, any agent, and CI.
- [Connect your agent](/docs/connect-your-agent): Claude Code, Codex, OpenCode, Cursor or any MCP client.
:::

## How it works

1. **You describe the video.** What it's for, how long, where it will run.
2. **Your agent picks a skill.** GenMotion ships one skill per kind of video (launch film, feature announcement, explainer, logo sting, social ad and more) that tells the agent how that kind of video is made.
3. **The agent writes scenes.** Each scene is a TypeScript module that draws a frame from the time it's given, with Three.js by default.
4. **You preview and give notes.** The preview reloads on every save, at the frame you were looking at.
5. **You export.** The MP4 is rendered in a headless browser from the same code, so it matches the preview frame for frame.

## Two ways to use GenMotion

| | **GenMotion Studio** | **genmotion CLI** |
| --- | --- | --- |
| What it is | Desktop app: chat, preview, timeline, export | Command-line tool and MCP server on npm |
| Runs on | macOS on Apple silicon | Node 22 or newer on macOS or Linux |
| Your agent | Claude Code or Codex, inside the app | Any coding agent, or your own terminal |
| Export | One click | `npx @genmotion/cli render` |
| Account | Free plan, no card | None |

![GenMotion Studio: the agent chat on the left, a frame-accurate preview in the middle and a timeline of scenes and audio below](/editor-screenshot.webp "GenMotion Studio")

A project made in one opens in the other. Pick the Studio if you want to see and click. Pick the CLI if you already live in a terminal or a coding agent, or want to render in CI.

::: tip
Not sure where to start? Copy the [setup prompt](/docs/quickstart#let-your-agent-set-it-up) into your agent. It installs everything and asks you what the video is for.
:::

## What you can make

Product launch films, feature and changelog announcements, milestone and funding videos, explainers, logo stings, App Store previews, product walkthroughs and vertical social ads. Anything else goes through the freeform skill. See [Skills](/docs/skills) for the full list.
