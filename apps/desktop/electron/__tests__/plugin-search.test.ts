import { describe, expect, it, vi } from "vitest";

/**
 * `search_plugins`' ranking.
 *
 * The thing worth pinning is the ordering, not the wording: a user names a
 * product ("figma", "a video model") and the first hit has to be the plugin
 * they meant, because the model turns the top result into a Connect card. The
 * connected flag is the other half — it is what tells the model to call the
 * plugin's tools instead of offering it again.
 */

const ENTRIES = [
  {
    id: "figma",
    name: "Figma",
    description: "Read a design file's frames, components and styles.",
    category: "Design",
    iconUrl: "https://example.com/figma.png",
    homepage: "https://figma.com",
    transport: "http",
    url: "https://mcp.figma.com/mcp",
    auth: { kind: "oauth" },
    tags: ["design", "frames"],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issues, projects and cycles — turn a release into a changelog video.",
    category: "Content sources",
    iconUrl: "https://example.com/linear.png",
    homepage: "https://linear.app",
    transport: "http",
    url: "https://mcp.linear.app/mcp",
    auth: { kind: "oauth" },
    tags: ["issues", "roadmap"],
  },
  {
    id: "fal",
    name: "fal",
    description: "Hundreds of image and video models, billed to your own fal account.",
    category: "Media models",
    iconUrl: "https://example.com/fal.png",
    homepage: "https://fal.ai",
    transport: "http",
    url: "https://mcp.fal.ai/mcp",
    auth: { kind: "header", headerName: "Authorization", prefix: "Key ", hint: "fal.ai dashboard" },
    tags: ["image", "video"],
  },
];

const cloudFetch = vi.fn(
  async () => new Response(JSON.stringify({ entries: ENTRIES, revision: "test" })),
);

vi.mock("../auth", () => ({ cloudFetch: (...args: unknown[]) => cloudFetch(...(args as [])) }));
vi.mock("../mcp/store", () => ({
  listConfigs: async () => [{ id: "figma", catalogId: "figma", enabled: true, name: "Figma" }],
}));

const { searchPlugins } = await import("../mcp/catalog");

/** The id on the first result line. */
function top(answer: string): string | undefined {
  return /^1\. (\S+) —/m.exec(answer)?.[1];
}

describe("searchPlugins", () => {
  it("puts the named product first and says it is connected", async () => {
    const answer = await searchPlugins("pull the frames from my Figma file");
    expect(top(answer)).toBe("figma");
    expect(answer).toMatch(/figma — Figma .*CONNECTED/);
  });

  it("matches on what a plugin is for, not just its name", async () => {
    expect(top(await searchPlugins("issue tracker for a changelog"))).toBe("linear");
    expect(top(await searchPlugins("a better video model"))).toBe("fal");
  });

  it("marks an unconnected plugin and names the way in", async () => {
    const answer = await searchPlugins("video model");
    expect(answer).toMatch(/fal — fal .*not connected/);
    expect(answer).toContain("needs an API key");
    expect(answer).toContain("recommend_integration");
  });

  it("lists the catalog when nothing matches, so the model stops guessing", async () => {
    const answer = await searchPlugins("underwater basket weaving");
    expect(answer).toContain("No plugin matches");
    expect(answer).toContain("figma, linear, fal");
  });

  it("fetches the catalog once for the life of the process", async () => {
    expect(cloudFetch).toHaveBeenCalledTimes(1);
  });
});
