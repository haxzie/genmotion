---
title: Install the genmotion CLI
seoTitle: "Install the genmotion CLI with npm and Node 22"
sidebarTitle: Install the CLI
description: "Install the genmotion CLI with npm and Node 22. Scaffold a video project with npx genmotion init, preview it live, and render MP4 on macOS, Linux or CI."
group: Getting started
order: 4
keywords: [genmotion npm, npx genmotion, video CLI, render video from the command line, Three.js video CLI, programmatic video Node]
updated: 2026-10-01
---

The `genmotion` CLI is the app-free way to make videos: scaffold, preview, check and render from a terminal, plus an MCP server for coding agents. It's open source under Apache-2.0 and needs no account.

## Requirements

- **Node 22 or newer.** Check with `node --version`.
- **macOS or Linux.** CI runners work too.
- Nothing else. A headless Chromium and ffmpeg download on the first render.

## Create a project

::: steps
### Scaffold it

```sh
{{CLI_INIT_COMMAND}}
```

`npm create genmotion@latest my-video` does the same thing.

### Install dependencies

```sh
cd my-video
npm install
```

The project pins its own copy of `genmotion`, so `npm run` scripts and `npx genmotion` use the same version.

Want `genmotion` without `npx`, everywhere? Install it globally:

```sh
npm install -g genmotion
```

That is the same command GenMotion Studio installs. If the Studio is on this Mac, `genmotion .` opens the current folder in it.

### Run it

```sh
npm run dev       # live studio at http://localhost:4200
npm run check     # compile and headless-render every scene
npm run render    # exports/my-video.mp4
```
:::

## `init` options

| Flag | What it does |
| --- | --- |
| `--size <size>` | `landscape` (1920×1080, default), `portrait` (1080×1920), `square`, `4k`, or `WIDTHxHEIGHT` |
| `--fps <n>` | Frame rate. Default 30 |
| `--template <id\|path>` | Start from a catalog template or a local project folder |
| `--engine <three\|react>` | Scene runtime. Default `three` |
| `--name <name>` | Display name. Default: the folder name |
| `--yes`, `-y` | Never ask a question |
| `--json` | Print one JSON object, for scripts and agents |

```sh
npx genmotion init reel --size portrait --fps 60
npx genmotion init launch --template crypto-launch-video
```

## Check your machine

```sh
npx genmotion doctor
```

It checks Node, ffmpeg, Chromium and WebGL, and prints the fix for anything missing.

::: note
The CLI renders Three.js and React projects. HyperFrames projects open in [GenMotion Studio](/docs/install-studio).
:::

## Render in CI

Rendering is deterministic: the default software WebGL produces the same pixels on every machine. A project needs no extra setup to render in a CI job. This is the workflow the [starter repo](https://github.com/haxzie/genmotion/tree/main/examples/three-starter) ships with:

```yaml title=".github/workflows/render.yml"
name: Render
on: [push]
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npx genmotion check
      - run: npx genmotion render
      - uses: actions/upload-artifact@v4
        with:
          name: video
          path: exports/
```
