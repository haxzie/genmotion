---
title: MCP tools
seoTitle: "genmotion MCP server: tools for coding agents"
description: "The genmotion MCP server gives Claude Code, Codex, OpenCode and Cursor tools to create projects, add scenes, check them, capture frames and render MP4."
group: Reference
order: 3
keywords: [genmotion MCP server, MCP video tools, Claude Code MCP tools, capture frames MCP, render video MCP, Model Context Protocol video]
updated: 2026-10-01
---

`npx @genmotion/cli mcp` runs a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio. It gives agents tools instead of more text to read. Projects made with `init` register it already; see [Connect your agent](/docs/connect-your-agent) to add it anywhere else.

## Tools

| Tool | What it does |
| --- | --- |
| `project_overview` | Size, fps, engine, every scene with its file, start frame and length, audio and assets. Agents call this first |
| `create_project` | Create a project folder with a starter scene and agent files, optionally from a template |
| `add_scene` | Create a scene file and register it in `project.json` |
| `validate_scene` | Compile one scene and check the determinism rules. Fast, no browser |
| `check_project` | The full check: manifest, every scene compiled, and a headless render of each scene's first, middle and last frame |
| `capture_frames` | Render frames and return them as images the agent can look at. Times like `1.5s`, `45`, `500ms`, `60%` |
| `render_video` | Render the video to a file, `exports/<name>.mp4` by default |
| `add_audio` | Put music, narration or an effect on the timeline, from a project file or a URL. Picks a free lane and fades, volume and offsets as given |
| `update_audio` | Move, retime, trim, re-level, fade, rename or mute a clip by id or name |
| `remove_audio` | Take a clip off the timeline. The file stays in `assets/` |
| `save_asset` | Download a remote image, audio, video, font or 3D model into `assets/` (up to 25 MB) |
| `download_x_video` | Save the video from a public post on X (Twitter) into `assets/`, with the author and the post's text |
| `add_package` | Install a browser-safe npm package, with lifecycle scripts disabled |
| `search_skills` | Find the skill that owns this kind of video, from the user's own words |
| `get_skill` | Read a skill and, when needed, one of its reference files |
| `get_guide` | Reference on demand: `three` (scene authoring), `workflow`, `cli` |
| `list_templates` | The template catalog, for `create_project` |

Every tool takes an optional `dir` when the server didn't start in the project folder.

## How an agent uses them

A typical session:

1. `project_overview` to learn the project.
2. `search_skills` and `get_skill` to pick how this video is made.
3. `add_scene` for each scene, then edits the files, and `add_audio` for music, narration and effects.
4. `check_project` and `capture_frames` after each change, and looks at the frames.
5. `render_video` at the end, or when you ask.

::: note
Errors come back with a `fix` the agent can act on, for example the exact `add_scene` call that registers a scene file it forgot.
:::
