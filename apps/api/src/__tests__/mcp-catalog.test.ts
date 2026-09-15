import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { mcpCatalogRoutes } from "../routes/mcp-catalog";
import { MCP_CATALOG_ENTRIES } from "../mcp-catalog/index";
import { defineMcpCatalogEntry, mcpServerId, type McpCatalog } from "@genmotion/shared";
import { createMcpCatalog } from "../mcp-catalog/registry";

/**
 * The MCP marketplace.
 *
 * The list is static, so what can go wrong is the list itself: an id that
 * collides, or one that would not survive as a tool-name prefix. Both are
 * cheaper to catch here than as a row in "Needs attention".
 */
const app = new Hono().route("/api/mcp", mcpCatalogRoutes);
const get = (path: string) => app.fetch(new Request(`http://api.test${path}`));

describe("GET /api/mcp/catalog", () => {
  it("serves the catalog, publicly, with what a card needs", async () => {
    const res = await get("/api/mcp/catalog");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("public");

    const body = (await res.json()) as McpCatalog;
    expect(body.revision).toMatch(/^[0-9a-f]{8}$/);
    expect(body.entries.length).toBeGreaterThan(0);
    for (const entry of body.entries) {
      expect(entry).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        category: expect.any(String),
        iconUrl: expect.stringMatching(/^(https:\/\/|data:image\/)/),
        transport: "http",
        url: expect.stringMatching(/^(https:\/\/|http:\/\/127\.0\.0\.1)/),
      });
      expect(["none", "oauth", "header"]).toContain(entry.auth.kind);
      if (entry.auth.kind === "header") {
        expect(entry.auth.headerName).toBeTruthy();
        expect(entry.auth.hint).toBeTruthy();
      }
    }
  });

  it("uses ids that are unique and already valid server ids", () => {
    const ids = MCP_CATALOG_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(mcpServerId(id)).toBe(id);
  });

  it("refuses a half-described entry at definition time", () => {
    const base = MCP_CATALOG_ENTRIES[0]!;
    expect(() => defineMcpCatalogEntry({ ...base, url: undefined })).toThrow();
    expect(() => defineMcpCatalogEntry({ ...base, iconUrl: "http://plain.example/i.png" })).toThrow();
    expect(() =>
      defineMcpCatalogEntry({ ...base, auth: { kind: "header", headerName: "", hint: "x" } }),
    ).toThrow();
    expect(() => createMcpCatalog([base, base])).toThrow(/two entries/);
  });
});
