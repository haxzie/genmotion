import { describe, expect, it } from "vitest";
import { mainDomain, mcpServerId, parseMcpToolName } from "../mcp";

describe("mainDomain", () => {
  it("drops the vendor's MCP subdomain", () => {
    expect(mainDomain("mcp.linear.app")).toBe("linear.app");
    expect(mainDomain("api.elevenlabs.io")).toBe("elevenlabs.io");
    expect(mainDomain("asset-management.mcp.cloudinary.com")).toBe("cloudinary.com");
  });
  it("keeps a country's second-level suffix", () => {
    expect(mainDomain("mcp.bbc.co.uk")).toBe("bbc.co.uk");
  });
  it("has nothing for a bare or loopback host", () => {
    expect(mainDomain("localhost")).toBeNull();
    expect(mainDomain("127.0.0.1")).toBeNull();
  });
});

describe("tool names", () => {
  it("round-trips through the harness's mcp__ prefix", () => {
    expect(parseMcpToolName("mcp__deepwiki-custom__ask_question")).toEqual({
      server: "deepwiki-custom",
      tool: "ask_question",
    });
    expect(parseMcpToolName("Write")).toBeNull();
    // Servers this app did not name: Claude Code's own connectors carry
    // underscores in the server segment, and the split is on the first `__`.
    expect(parseMcpToolName("mcp__claude_ai_Firecrawl__firecrawl_search")).toEqual({
      server: "claude_ai_Firecrawl",
      tool: "firecrawl_search",
    });
    expect(parseMcpToolName("mcp__genmotion__generate_typing_sound")).toEqual({
      server: "genmotion",
      tool: "generate_typing_sound",
    });
  });
  it("slugs a name into something safe as a prefix", () => {
    expect(mcpServerId("DeepWiki custom")).toBe("deepwiki-custom");
    expect(mcpServerId("  My_Server!! ")).toBe("my-server");
  });
});
