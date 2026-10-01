---
title: Troubleshooting
seoTitle: "Troubleshooting GenMotion installs, renders and agents"
description: "Fix common GenMotion problems: Chromium or ffmpeg not found, slow renders, blank scenes, MCP server not loading, Node version errors and Mac app issues."
group: Reference
order: 4
keywords: [GenMotion troubleshooting, genmotion render error, Chromium not found, ffmpeg not found, MCP server not connecting, blank Three.js render]
updated: 2026-10-01
faqs:
  - q: Why does the first render take longer?
    a: The first render downloads a headless Chromium (about 100 MB) and ffmpeg, once per machine. Later renders start immediately. Run npx @genmotion/cli browser install to do it ahead of time.
  - q: Does GenMotion work on Windows?
    a: The Studio runs on macOS with Apple silicon. The CLI is tested on macOS and Linux; on Windows, run it inside WSL.
  - q: Can I use my own Chrome and ffmpeg?
    a: Yes. Set GENMOTION_CHROMIUM to a Chrome or Chromium binary and FFMPEG_PATH to an ffmpeg binary, and nothing is downloaded.
  - q: Does GenMotion upload my project anywhere?
    a: No. Projects are folders on your machine, and the preview and the render both run locally.
---

Start with `npx @genmotion/cli doctor`. It checks Node, ffmpeg, Chromium and WebGL, and prints the fix for anything that fails.

## Installing

### "Node 22 or newer is required"

Install a current Node from [nodejs.org](https://nodejs.org) or with a version manager (`nvm install 22`), then open a new terminal.

### "No Chromium found"

The first render downloads one automatically. If your network blocks the download, run `npx @genmotion/cli browser install` on another network, or point `GENMOTION_CHROMIUM` at an installed Chrome.

### "ffmpeg not found"

ffmpeg is also downloaded on first use. Set `FFMPEG_PATH` to use your own.

## Rendering

### Renders are slow

Add `--gl gpu` to use your graphics card, and raise `--concurrency` on a machine with more cores. The default software WebGL is slow but identical everywhere.

### A scene renders blank or black

Run `npx @genmotion/cli check`. It flags frames that are a single flat color and says whether the camera is pointing away or the objects are unlit. Then `npx @genmotion/cli still --at 50%` to see the frame yourself.

### The export doesn't match the preview

A scene is reading a clock or random numbers. `npx @genmotion/cli check` names the line; replace it with the `time`, `frame` or `progress` the update function receives. See [the determinism rules](/docs/project-structure#the-determinism-rules).

### "Not inside a GenMotion project"

Run the command from the project folder (any subfolder works), or pass `--dir path/to/project`.

## Agents

### The MCP server doesn't show up

- **Claude Code:** approve the `genmotion` server when asked, or run `claude mcp list`. Restart the session after adding it.
- **Cursor:** enable it under Settings → MCP.
- **Any client:** the server must start in the project folder, or get `--dir`. Run `npx -y @genmotion/cli mcp` in a terminal; it should wait silently for input.

### The agent ignores the project's rules

Make sure it was opened in the project folder, so it can read `AGENTS.md` or `CLAUDE.md`. `npx @genmotion/cli skills update` rewrites those files if they're missing or stale.

## GenMotion Studio

### The app can't find Claude Code or Codex

Install one and sign in once in a terminal (`claude` or `codex`), then restart GenMotion.

### Two `genmotion` commands, or a command that's out of date

Older versions of the Studio wrote a launcher script to `/usr/local/bin/genmotion`, which can block `npm install -g @genmotion/cli` or answer ahead of it. `npx @genmotion/cli doctor` lists every `genmotion` on your PATH and flags the old script. Run `genmotion upgrade`, or choose **Update the 'genmotion' command** in the Studio's account menu, to replace it with the npm command.

### HyperFrames projects in the CLI

The CLI renders Three.js and React projects. Open HyperFrames projects in the Studio.
