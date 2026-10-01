---
title: CLI commands
seoTitle: "genmotion CLI reference: every command and flag"
description: "Reference for every genmotion CLI command: init, dev, check, still, render, info, scene, skills, templates, mcp and doctor, with flags and JSON output."
group: Reference
order: 1
keywords: [genmotion CLI reference, genmotion render, genmotion dev, genmotion check, video CLI commands, npx genmotion]
updated: 2026-10-01
---

Run any command with `npx genmotion <command>` from anywhere inside a project. `--help` prints a command's options.

## JSON output

Every command accepts `--json` and prints exactly one JSON object on stdout. Progress goes to stderr. This is how agents and scripts read results.

```json
{ "ok": true, "output": "/path/to/my-video/exports/my-video.mp4", "width": 1920, "height": 1080, "frames": 270, "durationSeconds": 9 }
```

Failures say what went wrong and how to fix it, and exit with code 1:

```json
{ "ok": false, "error": { "message": "Not inside a GenMotion project (no project.json here or above)", "fix": "npx genmotion init my-video && cd my-video" } }
```

## Commands

| Command | What it does |
| --- | --- |
| `init [dir]` | Create a project. See [Install the CLI](/docs/install-cli#init-options) for flags |
| `dev` | Live preview studio |
| `check` | Validate and headless-render every scene |
| `still` | Save frames as images |
| `render [out]` | Render the video. See [Rendering](/docs/rendering) |
| `info` | Size, fps, scenes with start frames, audio, assets |
| `scene add <name>` | Create a scene and register it in `project.json` |
| `skills <action>` | List, search, read and install skills |
| `templates` | List the template catalog |
| `mcp` | Run the MCP server over stdio |
| `browser install` | Download headless Chromium ahead of time |
| `doctor` | Check this machine can preview and render |

## dev

```sh
npx genmotion dev --open
```

| Flag | What it does |
| --- | --- |
| `--port <n>` | Port. Default 4200, or the next free one |
| `--host <addr>` | Bind address. Default `127.0.0.1` |
| `--open` | Open the studio in your browser |
| `--background` | Start detached and return the URL at once (for agents) |
| `--status` | Print the URL of a running background studio |
| `--stop` | Stop the background studio |

The studio plays, scrubs and steps frames, and jumps between scenes. Saving a file reloads it at the frame you were on.

## check

Runs, in order: `project.json` parses and every scene exists; every scene compiles and follows the [determinism rules](/docs/project-structure#the-determinism-rules); every scene renders its first, middle and last frame in headless Chromium without throwing, logging errors or drawing an empty frame.

| Flag | What it does |
| --- | --- |
| `--static` | Skip the browser. Fast, less thorough |
| `--snapshots` | Save each sampled frame to `.genmotion/check/` |
| `--gl <swiftshader\|gpu>` | WebGL backend |

## still

```sh
npx genmotion still --at 0 --at 50% --at 100%
```

| Flag | What it does |
| --- | --- |
| `--at <time>` | Frame to capture. Repeatable. `45`, `45f`, `1.5s`, `500ms` or `60%` |
| `--out`, `-o <path>` | A file for one still, a folder for several. Default `exports/` |
| `--format <png\|jpeg>` | Image format |
| `--scale <n>` | Output size multiplier |

## scene add

```sh
npx genmotion scene add "Hero reveal" --duration 4s --after intro
```

| Flag | What it does |
| --- | --- |
| `--duration <time>` | `4s`, `120` (frames) or `2500ms`. Default 4s |
| `--after <scene>` | Insert after this scene (file or name). Appends by default |

## skills

| Action | What it does |
| --- | --- |
| `list` | Every skill, its kind and what it delivers. `--kind` filters |
| `search "<request>"` | Rank the pack against a request. `--kind`, `--limit` |
| `show <id> [file]` | Print a skill, or one of its reference files |
| `add [<id>...]` | Install skills and what they need. With no ids, write the agent files |
| `update` | Rewrite the agent files and refresh installed skills |

See [Skills](/docs/skills).

## mcp

```sh
npx genmotion mcp [--dir <project>]
```

Speaks MCP over stdio. Never writes anything else to stdout. See [MCP tools](/docs/mcp-tools).

## Environment variables

| Variable | What it does |
| --- | --- |
| `GENMOTION_CHROMIUM` | Use this Chrome or Chromium instead of downloading one |
| `FFMPEG_PATH` | Use this ffmpeg instead of downloading one |
| `GENMOTION_NO_DOWNLOAD=1` | Never download anything; fail with a fix instead |
| `NO_COLOR=1` | Plain output |
