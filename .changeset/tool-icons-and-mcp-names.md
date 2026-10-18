---
"@genmotion/shared": patch
"@genmotion/desktop": patch
---

Every tool call in the chat has an icon and a readable label.

Two separate causes behind the grey dots and the raw `mcp__…` names in the
transcript. `parseMcpToolName` matched `[^_]+` for the server segment, so any
server this app did not name itself failed to parse at all: Claude Code's own
connectors arrive as `mcp__claude_ai_Firecrawl__firecrawl_search`, and every
one of them lost its icon, its label and its `mcp_tool_called` event. The
split is now on the first `__`.

Separately, eight GenMotion tools had no card registered — `search_skills`,
`search_scenes`, `get_scene`, `fork_scene`, `brand_overview`,
`use_brand_asset`, `validate_composition` and `recommend_integration` — and
the MCP fallback skips our own server on purpose, so they fell through to a
dot and their raw name. All eight have labels, subjects and icons now, there
is a GenMotion fallback behind them for the next tool somebody adds, and a
test holds the two lists together.
