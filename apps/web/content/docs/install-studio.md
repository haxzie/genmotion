---
title: Install GenMotion Studio
seoTitle: "Install GenMotion Studio for Mac (Apple silicon)"
sidebarTitle: Install the Studio
description: "Install GenMotion Studio on macOS with Apple silicon. Download the signed DMG or run the one-line installer, then connect Claude Code or Codex."
group: Getting started
order: 3
keywords: [GenMotion download, GenMotion Mac app, AI video editor for Mac, Claude Code desktop app, install GenMotion]
updated: 2026-10-01
---

GenMotion Studio is the desktop app: your agent's chat, a frame-accurate preview, a timeline and one-click export in one window.

## Requirements

| | |
| --- | --- |
| Mac | Apple silicon (M1 or later). Intel Macs are not supported |
| macOS | A current release of macOS |
| Agent | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [Codex](https://github.com/openai/codex), installed and signed in |
| Account | A GenMotion account. The free plan needs no card |

GenMotion drives the agent subscription you already have. It doesn't sell or meter model access.

## Install

::: steps
### Run the installer, or download the disk image

In Terminal:

```sh
{{STUDIO_INSTALL_COMMAND}}
```

It downloads the latest signed build into `/Applications` and adds the `genmotion` command to your shell. Prefer a download? Get the `.dmg` from the [download page](/download), open it and drag GenMotion into Applications.

### Open GenMotion and sign in

Every build is signed with a Developer ID and notarized by Apple, so it opens without a security warning. Sign in from the welcome screen.

### Install an agent, if you don't have one

GenMotion finds Claude Code or Codex on your machine. If neither is installed:

```sh
npm install -g @anthropic-ai/claude-code   # then run: claude
npm install -g @openai/codex               # then run: codex
```

Sign in to it once in the terminal. The Studio uses the same login.

### Create or open a project

Start a new project from the home screen or from a template. From a terminal, `genmotion .` opens the current folder in the app.
:::

## The `genmotion` command

The installer leaves a `genmotion` command behind. With no arguments, or a folder, it opens the Studio:

```sh
genmotion .            # open this folder in the app
genmotion ~/videos/x   # open another folder
genmotion clone owner/repo   # clone a GitHub repo and open it
genmotion upgrade      # install the latest version
```

It hands the terminal commands (`init`, `dev`, `render`, `check`, `still`, `mcp`, `skills` and the rest) to the [CLI](/docs/cli), so both workflows share one command.

## Updates

The app checks for a new version when it starts and asks before downloading anything. Installing quits the app, so it's a separate click. `genmotion upgrade` does the same from the terminal.

::: tip
Voiceover, sound effects and image generation in chat are part of the Pro plan. Everything else, including export, is on the free plan. See [pricing](/pricing).
:::
