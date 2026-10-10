---
title: CLI commands
seoTitle: "genmotion CLI reference: every command and flag"
description: "Reference for every genmotion CLI command: init, dev, check, still, render, info, scene, audio, skills, templates, mcp, doctor and upgrade, with flags and JSON output."
group: Reference
order: 1
keywords: [genmotion CLI reference, genmotion render, genmotion dev, genmotion check, genmotion audio, add music to video CLI, video CLI commands, npx @genmotion/cli]
updated: 2026-10-01
---

Run any command with `npx @genmotion/cli <command>` from anywhere inside a project. `--help` prints a command's options.

## JSON output

Every command accepts `--json` and prints exactly one JSON object on stdout. Progress goes to stderr. This is how agents and scripts read results.

```json
{ "ok": true, "output": "/path/to/my-video/exports/my-video.mp4", "width": 1920, "height": 1080, "frames": 270, "durationSeconds": 9 }
```

Failures say what went wrong and how to fix it, and exit with code 1:

```json
{ "ok": false, "error": { "message": "Not inside a GenMotion project (no project.json here or above)", "fix": "npx @genmotion/cli init my-video && cd my-video" } }
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
| `audio <action>` | Add, move, trim, mute or remove timeline audio |
| `x-video <post url>` | Save the video from a public post on X into `assets/` |
| `skills <action>` | List, search, read and install skills |
| `templates` | List the template catalog |
| `mcp` | Run the MCP server over stdio |
| `browser install` | Download headless Chromium ahead of time |
| `doctor` | Check this machine can preview and render |
| `upgrade` | Update this command, and the Studio when it's installed |

## dev

```sh
npx @genmotion/cli dev --open
```

| Flag | What it does |
| --- | --- |
| `--port <n>` | Port. Default 4200, or the next free one |
| `--host <addr>` | Bind address. Default `127.0.0.1` |
| `--open` | Open the studio in your browser |
| `--background` | Start detached and return the URL at once (for agents) |
| `--status` | Print the URL of a running background studio |
| `--stop` | Stop the background studio |

The studio plays, scrubs and steps frames under a timeline: a ruler, the scene track, and every audio lane from `project.json` with its waveform. Click or drag anywhere on the timeline to seek, and click a scene to jump to its start. Audio plays in sync with the picture, with each clip's volume, fades and mute applied as the render mixes them; `m` turns the sound off.

Two buttons sit at the top right. **Export MP4** runs the same render as `render`, saves it in `exports/` and downloads it through your browser; click it again while it runs to cancel. **Edit in studio** opens the project in the GenMotion app, or links to the download when the app isn't installed.

Saving a file reloads the studio at the frame you were on, so the timeline updates as your agent adds scenes and audio. Editing happens through the agent or the `audio` command, not by dragging.

## check

Runs, in order: `project.json` parses and every scene exists; every scene compiles and follows the [determinism rules](/docs/project-structure#the-determinism-rules); every scene renders its first, middle and last frame in headless Chromium without throwing, logging errors or drawing an empty frame.

| Flag | What it does |
| --- | --- |
| `--static` | Skip the browser. Fast, less thorough |
| `--snapshots` | Save each sampled frame to `.genmotion/check/` |
| `--gl <swiftshader\|gpu>` | WebGL backend |

## still

```sh
npx @genmotion/cli still --at 0 --at 50% --at 100%
```

| Flag | What it does |
| --- | --- |
| `--at <time>` | Frame to capture. Repeatable. `45`, `45f`, `1.5s`, `500ms` or `60%` |
| `--out`, `-o <path>` | A file for one still, a folder for several. Default `exports/` |
| `--format <png\|jpeg>` | Image format |
| `--scale <n>` | Output size multiplier |

## scene add

```sh
npx @genmotion/cli scene add "Hero reveal" --duration 4s --after intro
```

| Flag | What it does |
| --- | --- |
| `--duration <time>` | `4s`, `120` (frames) or `2500ms`. Default 4s |
| `--after <scene>` | Insert after this scene (file or name). Appends by default |

## audio

```sh
npx @genmotion/cli audio add assets/music.mp3 --fade-in 0.5s --fade-out 1s --volume 0.3
npx @genmotion/cli audio add https://example.com/whoosh.mp3 --at 4s
npx @genmotion/cli audio set music --at 1s --duration 8s
npx @genmotion/cli audio remove whoosh-3f2a
npx @genmotion/cli audio list
```

`add` takes a file inside the project, or a URL, which is saved into `assets/` first. Clips go on up to four lanes, and a clip never overlaps another on its own lane: `add` picks a free lane, and a clip that would run into the next one is shortened (the result says so). `set` and `remove` take a clip's id or its `--name`.

| Flag | What it does |
| --- | --- |
| `--at <time>` | Where it starts on the timeline. Default 0 |
| `--duration <time>` | How long it plays. Default: the whole file, cut at the end of the video |
| `--from <time>` | How far into the file it starts playing |
| `--track <n>` | Lane, from 0. A preference on `add`; on `set` the lane must be free |
| `--volume <0-2>` | Linear gain. 1 is unchanged, 0.5 is about -6 dB |
| `--fade-in`, `--fade-out <time>` | Fade lengths |
| `--name <text>` | A label, accepted in place of the id |
| `--mute`, `--unmute` | Silence a clip and keep its level (`set`) |

Times use the same spellings as everywhere else: `48` (frames), `2s`, `500ms`, and `50%` for `--at`.

## x-video

```sh
npx @genmotion/cli x-video https://x.com/someone/status/1988283207138324487
```

Takes the link to the post, not a media URL: the MP4 sits behind an id only the
post knows. The post is resolved through X's own embed endpoint, so there is no
key, no account and no login, and the file comes straight from X into
`assets/`.

`--quality smallest` takes the lowest rendition instead of the best, which is
what you want for a clip that plays inside a phone mock. `--index <n>` picks one
video out of a post that carries several, and `--filename <name>` overrides the
default `x-<handle>-<quality>.mp4`.

An animated GIF comes back as a silent MP4, which is what X stores. The clip's
own audio is not mixed into a render: pull it out with ffmpeg and place it with
`audio add` if it matters.

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
npx @genmotion/cli mcp [--dir <project>]
```

Speaks MCP over stdio. Never writes anything else to stdout. See [MCP tools](/docs/mcp-tools).

## Environment variables

| Variable | What it does |
| --- | --- |
| `GENMOTION_CHROMIUM` | Use this Chrome or Chromium instead of downloading one |
| `FFMPEG_PATH` | Use this ffmpeg instead of downloading one |
| `GENMOTION_NO_DOWNLOAD=1` | Never download anything; fail with a fix instead |
| `NO_COLOR=1` | Plain output |
