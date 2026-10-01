---
title: Quickstart
seoTitle: "Quickstart: make your first AI video in five minutes"
description: "Create your first GenMotion video in five minutes. Paste one setup prompt into Claude Code, Codex or Cursor, or run npx @genmotion/cli init and render an MP4."
group: Getting started
order: 2
keywords: [GenMotion quickstart, make a video with Claude Code, npx @genmotion/cli init, AI video tutorial, render MP4 from code]
updated: 2026-10-01
---

There are two ways in. Let your agent do the setup, or run three commands yourself. Both end with the same project folder.

## Let your agent set it up

Open Claude Code, Codex, OpenCode or Cursor in an empty folder and paste this prompt. The agent installs the project, reads the rules, asks what the video is for and builds it.

```text title="Setup prompt"
{{SETUP_PROMPT}}
```

::: note
The agent runs `npx`, so the folder needs Node 22 or newer. Check with `node --version`.
:::

## Or set it up yourself

::: steps
### Create a project

```sh
{{CLI_INIT_COMMAND}}
cd my-video
npm install
```

Add `--size portrait` for a 9:16 video, or `--template <id>` to start from a finished video. `npx @genmotion/cli templates` lists them.

### Start the preview

```sh
npm run dev
```

The studio opens at `http://localhost:4200`. Play, scrub, step through frames and jump between scenes. It reloads every time a file is saved.

### Describe your video to your agent

Open your agent in the `my-video` folder and say what you want: "A 20-second launch video for our notes app, 16:9, dark and confident." The project already tells the agent how to work. See [Make your first video](/docs/make-your-first-video) for how to brief it well.

### Check and render

```sh
npm run check     # every scene compiles and renders headlessly
npm run render    # writes exports/my-video.mp4
```

The first render downloads a headless Chromium and ffmpeg, once per machine.
:::

## Prefer an app?

[GenMotion Studio](/docs/install-studio) does all of this in one window on a Mac: chat with your agent on the left, the preview in the middle, a timeline below and an Export button.

![GenMotion Studio: the agent chat on the left, a frame-accurate preview in the middle and a timeline of scenes and audio below](/editor-screenshot.webp "GenMotion Studio")

## Next steps

::: cards
- [Connect your agent](/docs/connect-your-agent): The files a project ships with, the Claude Code plugin and the MCP server.
- [Skills](/docs/skills): How the agent decides what kind of video it's making.
- [CLI commands](/docs/cli): Every command and flag.
- [Rendering](/docs/rendering): Formats, frame ranges, 4K and speed.
:::
