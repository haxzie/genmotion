import { describe, expect, it } from "vitest";
import stripe from "./fixtures/firecrawl-branding-stripe.json";
import { parseBranding, withFontFiles } from "../routes/brands";

/**
 * Held to a real captured Firecrawl response, not a hand-written one.
 *
 * This mapping reads somebody else's payload and its failure mode is silent:
 * a renamed key upstream produces an empty dialog that still looks like it
 * worked. The fixture is what makes that loud.
 */
describe("parseBranding", () => {
  const result = parseBranding(stripe as Record<string, unknown>, "https://stripe.com");

  it("takes the brand name off the title rather than the whole title", () => {
    expect(result.name).toBe("Stripe");
    expect(result.description).toMatch(/^Stripe is a financial services platform/);
    expect(result.url).toBe("https://stripe.com/");
  });

  it("collects every colour, deduplicated, with the named roles winning", () => {
    const byHex = Object.fromEntries(result.colors.map((c) => [c.hex, c]));
    // Named roles are read first, so the primary keeps its role even though
    // the primary button repeats the same value.
    expect(byHex["#533afd"]).toEqual({ hex: "#533afd", role: "primary", label: "Primary" });
    expect(byHex["#0d1738"]?.role).toBe("accent");
    expect(byHex["#ffffff"]?.role).toBe("background");
    expect(byHex["#000000"]?.role).toBe("ink");
    // A component-only colour still comes through, labelled by where it is used.
    expect(byHex["#b9b9f9"]).toEqual({
      hex: "#b9b9f9",
      role: "other",
      label: "Secondary button border",
    });
    // Deduplicated: #533AFD is the primary, the primary button and the
    // secondary button's text.
    expect(result.colors.map((c) => c.hex)).toHaveLength(new Set(result.colors.map((c) => c.hex)).size);
    expect(result.colors.length).toBeGreaterThanOrEqual(6);
  });

  it("normalises hex case, and drops a null colour rather than emitting it", () => {
    expect(result.colors.every((c) => c.hex === c.hex.toLowerCase())).toBe(true);
    expect(result.colors.some((c) => c.label === "Input border")).toBe(false);
  });

  it("maps heading to display and puts it first", () => {
    expect(result.fonts[0]).toEqual({ family: "SF Pro Display", role: "display", files: [] });
    expect(result.fonts).toContainEqual({ family: "Sohne-Var", role: "body", files: [] });
  });

  it("offers the inline logo before the favicon, and labels each", () => {
    expect(result.logos[0]?.src.startsWith("data:image/svg+xml")).toBe(true);
    expect(result.logos[0]?.variant).toBe("mark");
    expect(result.logos.map((l) => l.variant)).toEqual(["mark", "icon", "lockup"]);
    // The inline SVG appears twice in the payload (`logo` and `images.logo`).
    expect(result.logos).toHaveLength(3);
  });

  it("surfaces the extractor's own confidence and reports nothing missing", () => {
    expect(result.confidence).toBe(0.88);
    expect(result.colorScheme).toBe("light");
    expect(result.missing).toEqual([]);
  });

  it("says what is missing when a page gives up nothing", () => {
    const empty = parseBranding({ branding: {}, metadata: {} }, "https://example.com");
    expect(empty.colors).toEqual([]);
    expect(empty.fonts).toEqual([]);
    expect(empty.logos).toEqual([]);
    expect(empty.missing).toHaveLength(3);
    expect(empty.url).toBe("https://example.com");
  });

  it("promotes the first face to display when the page claims none", () => {
    // Notion reports both of its faces as `body`. Left alone that is a brand
    // whose `FONT.display` is empty, and display is the slot a video sets its
    // hero in.
    const notion = parseBranding(
      {
        branding: {
          fonts: [{ family: "NotionInter", role: "body" }, { family: "Inter", role: "body" }],
        },
        metadata: {},
      },
      "https://notion.com",
    );
    expect(notion.fonts[0]).toEqual({ family: "NotionInter", role: "display", files: [] });
    expect(notion.fonts[1]).toEqual({ family: "Inter", role: "body", files: [] });
  });

  it("does not promote a monospace face to display", () => {
    const mono = parseBranding(
      { branding: { fonts: [{ family: "IBM Plex Mono", role: "mono" }] }, metadata: {} },
      "https://example.com",
    );
    expect(mono.fonts).toEqual([{ family: "IBM Plex Mono", role: "mono", files: [] }]);
  });

  it("drops generic font families and unresolved CSS variables", () => {
    const junk = parseBranding(
      {
        branding: {
          fonts: [{ family: "sans-serif", role: "body" }, { family: "var(--font)", role: "heading" }],
          typography: { fontFamilies: { primary: "inherit" } },
        },
        metadata: {},
      },
      "https://example.com",
    );
    expect(junk.fonts).toEqual([]);
  });

  it("refuses a logo source that is not http(s) or a data image", () => {
    const hostile = parseBranding(
      { branding: { logo: "javascript:alert(1)", images: { favicon: "file:///etc/passwd" } }, metadata: {} },
      "https://example.com",
    );
    expect(hostile.logos).toEqual([]);
  });
});

/**
 * Finding the real font files.
 *
 * A family name alone produces a video set in Helvetica, which is the most
 * visible way a brand video goes wrong, so this is the part that matters. Two
 * shapes, because real sites split between them: Linear preloads its woff2 and
 * declares the face in a stylesheet reached through a framework hint, while
 * Vercel puts plain `@font-face` rules in a linked stylesheet.
 *
 * The stylesheet fetch is stubbed; the parsing and matching are not.
 */
describe("withFontFiles", () => {
  const sheet = (css: string) => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response(css, { status: 200 })) as typeof fetch;
    return () => {
      globalThis.fetch = original;
    };
  };

  it("attaches a preloaded file to the family its filename names", async () => {
    const restore = sheet("");
    try {
      const html = `<link rel="preload" href="https://static.linear.app/fonts/InterVariable.woff2?v=4.1" as="font" type="font/woff2">`;
      const fonts = await withFontFiles(
        [{ family: "Inter", role: "display", files: [] }],
        html,
        "https://linear.app",
      );
      expect(fonts[0]?.files).toHaveLength(1);
      expect(fonts[0]?.files[0]).toMatchObject({ format: "woff2", from: "preload", style: "normal" });
    } finally {
      restore();
    }
  });

  it("reads family, weight range and style out of @font-face", async () => {
    const restore = sheet(
      `@font-face{font-family:Inter Variable;font-weight:100 900;font-style:italic;src:url(https://cdn.test/Inter-Italic.woff2)format("woff2")}`,
    );
    try {
      const fonts = await withFontFiles(
        [{ family: "Inter", role: "display", files: [] }],
        `<link rel="stylesheet" href="https://cdn.test/app.css">`,
        "https://example.com",
      );
      expect(fonts[0]?.files[0]).toMatchObject({
        url: "https://cdn.test/Inter-Italic.woff2",
        style: "italic",
        // A weight range is a variable font: there is no single number, and
        // recording "100" would be wrong.
        variable: true,
        from: "font-face",
      });
      expect(fonts[0]?.files[0]?.weight).toBeUndefined();
    } finally {
      restore();
    }
  });

  it("keeps a mono face out of the display family it shares a prefix with", async () => {
    const restore = sheet(
      `@font-face{font-family:GeistSans;font-weight:400;src:url(https://cdn.test/sans.woff2)format("woff2")}` +
        `@font-face{font-family:Geist Mono;font-weight:400;src:url(https://cdn.test/mono.woff2)format("woff2")}`,
    );
    try {
      const fonts = await withFontFiles(
        [{ family: "GeistSans", role: "display", files: [] }],
        `<link rel="stylesheet" href="https://cdn.test/app.css">`,
        "https://example.com",
      );
      // `GeistMono` shares a prefix with `GeistSans` but is not the same face;
      // containment matching put a monospace file in the display family.
      const sans = fonts.find((f) => f.family === "GeistSans");
      const mono = fonts.find((f) => f.family === "Geist Mono");
      expect(sans?.files.map((f) => f.url)).toEqual(["https://cdn.test/sans.woff2"]);
      expect(mono?.files.map((f) => f.url)).toEqual(["https://cdn.test/mono.woff2"]);
      expect(mono?.role).toBe("mono");
    } finally {
      restore();
    }
  });

  it("folds the words a foundry adds to the same face", async () => {
    const restore = sheet(
      `@font-face{font-family:"Sohne-Var";font-weight:400;src:url(https://cdn.test/sohne.woff2)format("woff2")}`,
    );
    try {
      const fonts = await withFontFiles(
        [{ family: "Sohne", role: "display", files: [] }],
        `<link rel="stylesheet" href="https://cdn.test/app.css">`,
        "https://example.com",
      );
      expect(fonts).toHaveLength(1);
      expect(fonts[0]?.files).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it("ignores data URIs and anything that is not a font file", async () => {
    const restore = sheet(
      `@font-face{font-family:Bad;src:url(data:font/woff2;base64,AAAA)format("woff2"),url(https://cdn.test/x.css)}`,
    );
    try {
      const fonts = await withFontFiles(
        [{ family: "Bad", role: "body", files: [] }],
        `<link rel="stylesheet" href="https://cdn.test/app.css">`,
        "https://example.com",
      );
      expect(fonts[0]?.files).toEqual([]);
    } finally {
      restore();
    }
  });
});
