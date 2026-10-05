---
title: "How do I install HyperFrames, and why did npx skills add fail?"
description: "The current install routes for Claude Code, Codex, Cursor and others, plus the three real failures people hit: a 60 second clone timeout, a missing git-lfs, and a Codex marketplace error. What each means and how to get past it."
tool: hyperframes
kind: how-to
errors:
  - "Failed to clone repository. Clone timed out after 60s."
  - "git-lfs filter-process: git-lfs: command not found"
  - "invalid marketplace file: marketplace root does not contain a supported manifest"
  - "FFmpeg not found"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["install", "skills", "setup"]
related:
  - hyperframes-render-is-black
  - hyperframes-render-is-slow
  - hyperframes-add-voiceover-and-captions
sources:
  - label: "HyperFrames: Make your first video"
    url: "https://hyperframes.heygen.com/quickstart"
  - label: "HyperFrames: Install the HyperFrames plugin"
    url: "https://hyperframes.heygen.com/guides/plugins"
  - label: "hyperframes#300: npx skills add fails with 60s clone timeout"
    url: "https://github.com/heygen-com/hyperframes/issues/300"
  - label: "hyperframes#407: Install failed at the first hurdle (git-lfs)"
    url: "https://github.com/heygen-com/hyperframes/issues/407"
  - label: "hyperframes#408: Codex install command fails"
    url: "https://github.com/heygen-com/hyperframes/issues/408"
  - label: "HyperFrames troubleshooting: FFmpeg not found"
    url: "https://hyperframes.heygen.com/guides/troubleshooting"
genmotion:
  heading: "Nothing to install but the app"
  body: |-
    GenMotion Studio bundles the HyperFrames compiler, the linter and the full set of HyperFrames skills for its agent, along with its own ffmpeg. There is no plugin marketplace to add, no repository to clone and no separate FFmpeg to install. Pick HyperFrames in the engine picker, describe the video, and the studio does the rest. [How the HyperFrames engine works in GenMotion](/blog/hyperframes-engine-in-genmotion).
faqs:
  - q: "What do I need installed?"
    a: "Node.js 22 or newer and npm for the local CLI, plus FFmpeg for rendering. Install on each machine you use; a plugin does not synchronise your machines. HyperFrames itself is free and open source, and local rendering does not use HeyGen credits."
  - q: "Plugin or standalone skills?"
    a: "Choose one installation method per agent. The plugin gives your agent the complete set of video workflows and updates through the agent's plugin manager. Standalone skills remain available for OpenCode and other agents, or when you prefer the smaller core-only install."
  - q: "Do I have to use an agent at all?"
    a: "No. You can write a composition by hand with npx hyperframes init my-video, preview it with npx hyperframes preview, and render it from the command line. The agent route is the one the quickstart leads with."
---

## The routes

Pick one per agent, from HyperFrames' own installation guide.

| Agent | How |
| --- | --- |
| Claude Code | HyperFrames' GitHub marketplace |
| Copilot CLI | HyperFrames' GitHub marketplace |
| VS Code / Copilot | Add the GitHub marketplace in the Extensions view |
| Cursor | Import through a team marketplace, or load a local plugin |
| Gemini CLI | Install the HyperFrames extension from GitHub |
| Codex | Use your existing HyperFrames plugin |
| OpenCode | Standalone skills |

For Claude Code, the commands are:

```bash
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
claude plugin details hyperframes
```

Then start a new session or run `/reload-plugins`. For standalone skills, in your project folder:

```bash
npx skills add heygen-com/hyperframes
```

Choose **Core Skills** in the picker, then restart your agent in that folder. To keep them current, run `npx hyperframes skills update`.

## Failure 1: "Clone timed out after 60s"

```
Failed to clone repository
Clone timed out after 60s. This often happens with private repos that require authentication.
```

The error message points you at SSH keys and authentication. That is misleading: the repository is public. The real cause, found by a reporter in April 2026, was size. A shallow clone produced a working tree of about 554 MB, which on an ordinary connection takes longer than the `skills` tool's hard 60 second clone timeout. The maintainers removed a batch of large image and video files from the repository to shrink it, and later reports on the issue said the timeout could still appear.

**Workaround:** clone manually, then install from the local path.

```bash
git clone --depth 1 https://github.com/heygen-com/hyperframes.git /tmp/hyperframes
npx skills add /tmp/hyperframes -g -y
```

## Failure 2: "git-lfs: command not found"

```
git-lfs filter-process: git-lfs: command not found
fatal: the remote end hung up unexpectedly
warning: Clone succeeded, but checkout failed.
```

Your machine does not have Git LFS. On macOS:

```bash
brew install git-lfs
```

Then retry. A commenter on the issue reported it was fine from version 1.5.2 of the `skills` tool onward, so updating that tool may also resolve it.

## Failure 3: Codex says "invalid marketplace file"

```
Error: invalid marketplace file ...: marketplace root does not contain a supported manifest
```

The Codex install command in the README at the time did not work with the Codex CLI the reporter was using (0.122.0), even though the repository contained a plugin manifest. One maintainer said it should be fixed; a later comment on the issue said it was not fixed yet. Check the current installation guide for the Codex route instead of an old README command, because this is the part most likely to have changed.

## Failure 4: "FFmpeg not found"

FFmpeg is required for local video encoding. Install it and verify:

```bash
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Ubuntu or Debian
ffmpeg -version
```

On Windows, download a 64-bit build from ffmpeg.org and add its `bin` directory to your `PATH`. Then run `npx hyperframes doctor`, which checks the runtime, the browser and FFmpeg together.

## Check it worked

```bash
npx hyperframes doctor
npx hyperframes info
```

In your agent, type `/hyperframes`. If it autocompletes, you are in. If skills do not appear right away, open a new session so the agent reloads them.
