---
title: Connect your coding agent
seoTitle: "Use GenMotion with Claude Code, Codex, OpenCode and Cursor"
sidebarTitle: Connect your agent
description: "Use GenMotion with Claude Code, Codex, OpenCode, Cursor or any MCP client. Projects ship with AGENTS.md, CLAUDE.md, skills and an MCP server."
group: Guides
order: 1
keywords: [Claude Code MCP video, Codex video generation, OpenCode MCP server, Cursor MCP server, genmotion MCP, AGENTS.md, Claude Code plugin video]
updated: 2026-10-01
---

GenMotion works with the agent you already use. A project folder carries its own instructions, so there is usually nothing to configure: open the agent in the folder and describe the video.

::: note
Everything below runs the CLI from the npm package `@genmotion/cli`, which provides the `genmotion` command. There is no npm package called `genmotion`, so an agent that tries `npx genmotion` outside a project gets a 404; `npx @genmotion/cli` works everywhere.
:::

## What a project already includes

`genmotion init` writes these files, so every common agent knows the rules from its first message:

| File | Read by | What it holds |
| --- | --- | --- |
| `AGENTS.md` | Codex, OpenCode, Cursor and most agents | Scene rules, the authoring guide, every command |
| `CLAUDE.md` | Claude Code | Imports `AGENTS.md`, so there is one copy |
| `.mcp.json` | Claude Code | The `genmotion` MCP server |
| `.cursor/mcp.json` | Cursor | The same server, for Cursor |
| `.claude/skills/`, `.agents/skills/` | Claude Code, Codex | The make-a-video workflow and the skill router |

Already have a project from somewhere else? `npx @genmotion/cli skills add` writes the same files into it, and `npx @genmotion/cli skills update` refreshes them after an upgrade.

## Claude Code

Open Claude Code in the project folder:

```sh
cd my-video
claude
```

It reads `CLAUDE.md`, loads the skills and starts the MCP server from `.mcp.json` (approve it when asked).

### Use it outside a project

Install the plugin and every Claude Code session can make videos, even with no project yet. It bundles the skill pack, a make-video skill and the MCP server:

```sh
claude plugin marketplace add haxzie/genmotion
claude plugin install genmotion@genmotion
```

## Codex

Open Codex in the project folder. It reads `AGENTS.md` and the skills in `.agents/skills/`. To give it the MCP tools too:

```sh
codex mcp add genmotion -- npx -y @genmotion/cli mcp
```

Without MCP, Codex runs the same steps as shell commands (`npx @genmotion/cli check --json` and so on), which `AGENTS.md` lists.

## OpenCode

Open OpenCode in the project folder. It reads `AGENTS.md`, which has the scene rules and every command, so it can build a video from the shell straight away. To give it the MCP tools too, add the server to `opencode.json` in the project:

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "genmotion": {
      "type": "local",
      "command": ["npx", "-y", "@genmotion/cli", "mcp"],
      "enabled": true
    }
  }
}
```

## Cursor

Open the project folder in Cursor. `.cursor/mcp.json` registers the server; enable it under **Settings → MCP** the first time.

## Any other MCP client

The server speaks MCP over stdio. Add it to any client's config:

```json
{
  "mcpServers": {
    "genmotion": { "command": "npx", "args": ["-y", "@genmotion/cli", "mcp"] }
  }
}
```

Pass `--dir <path>` in `args` if the client doesn't start in the project folder. The [MCP tools](/docs/mcp-tools) page lists every tool it provides.

## In GenMotion Studio

The Studio runs Claude Code or Codex for you, with its own tools wired in, so none of the above is needed there. Open a folder with `genmotion .` and talk to the agent in the chat panel.

![GenMotion Studio: the agent chat on the left, a frame-accurate preview in the middle and a timeline of scenes and audio below](/editor-screenshot.webp "GenMotion Studio")

::: tip
Agents do best when they can see the result. The `capture_frames` tool returns rendered frames as images, and the project's instructions tell the agent to look at them before calling a video done.
:::
