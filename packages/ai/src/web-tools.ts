import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";
const SCRAPE_TIMEOUT_MS = 120_000;
const MARKDOWN_LIMIT = 6_000;

type FirecrawlResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

async function firecrawl(
  path: "/scrape" | "/search",
  body: Record<string, unknown>,
): Promise<FirecrawlResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return {
      ok: false,
      error:
        "Web research is not configured (FIRECRAWL_API_KEY is missing). Proceed with your own design judgment and tell the user web research is unavailable.",
    };
  }
  try {
    const res = await fetch(`${FIRECRAWL_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: Record<string, unknown>;
      error?: string;
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        error: `Firecrawl request failed (${res.status}): ${json.error ?? "unknown error"}`,
      };
    }
    return { ok: true, data: json.data ?? (json as Record<string, unknown>) };
  } catch (err) {
    return {
      ok: false,
      error: `Firecrawl request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

const VISION_MODEL = "claude-sonnet-4-6";

const STYLE_GUIDE_PROMPT = `You are a senior motion designer reverse-engineering a website's visual identity from this screenshot, so an AI can design videos that feel unmistakably like this brand. Describe what you SEE, concretely and numerically where possible:

1. Mode & background: light/dark, exact-looking background hex(es), gradients/textures/noise/patterns.
2. Color system: dominant colors with estimated hex values and their roles (background, surface, text, accent, CTA). Note how much accent color is used (a little? a lot?).
3. Typography: serif/sans/mono character, weight range, estimated SIZES in px (hero headline, section heading, body, caption), letter-spacing (tight/normal/wide), line-height feel, casing (Title/sentence/UPPERCASE), any distinctive type treatment (gradient text, outlined, condensed).
4. Shape language: border radii (sharp/4px/12px/pill), border thickness/contrast, shadow style (none/soft/hard), card/surface treatments, dividers.
5. Imagery & graphics: photography vs 3D vs flat illustration vs screenshots-in-frames; icon style (outline/filled, stroke weight); any signature graphic motifs (glows, grids, blobs, gradients, bento boxes, browser mockups).
6. Density & spacing: airy or compact, how much whitespace, content width feel.
7. Personality in 4-6 adjectives, and what a motion designer should echo (e.g. "neon glow pulses", "precise grid reveals", "soft floating cards").

Be specific and visual — estimated hexes and px sizes beat vague words. ≤ 350 words, tight markdown bullets.`;

/** Vision pass: turn a page screenshot into a concrete visual style guide. */
async function describeScreenshot(screenshotUrl: string): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: anthropic(VISION_MODEL),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: new URL(screenshotUrl) },
            { type: "text", text: STYLE_GUIDE_PROMPT },
          ],
        },
      ],
    });
    return text;
  } catch (err) {
    console.warn("[web-tools] screenshot description failed:", err);
    return null;
  }
}

function pickMetadata(data: Record<string, unknown>) {
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  return {
    title: metadata.title,
    description: metadata.description,
    ogImage: metadata.ogImage ?? metadata["og:image"],
    favicon: metadata.favicon,
  };
}

/** Research tools backed by Firecrawl. Available to the editor agent only. */
export function createWebTools() {
  return {
    analyzeWebsiteBranding: tool({
      description:
        "Extract a website's brand identity: logo URL, color palette (hex), typography/fonts, PLUS a screenshot-based visual style guide written by a vision model (estimated font sizes in px, shape language, imagery style, signature motifs, personality). Use this whenever the user references a company, product, or website so scenes match their real design language.",
      inputSchema: z.object({
        url: z.url().describe("Full URL, e.g. https://linear.app"),
      }),
      execute: async ({ url }) => {
        const result = await firecrawl("/scrape", {
          url,
          formats: ["branding", "screenshot"],
        });
        if (!result.ok) return { ok: false as const, error: result.error };

        const screenshotUrl =
          typeof result.data.screenshot === "string"
            ? result.data.screenshot
            : null;
        const styleGuide = screenshotUrl
          ? await describeScreenshot(screenshotUrl)
          : null;

        return {
          ok: true as const,
          branding: result.data.branding ?? null,
          // Concrete, screenshot-derived design language — follow it closely.
          styleGuide,
          ...pickMetadata(result.data),
        };
      },
    }),

    readWebsite: tool({
      description:
        "Read a web page's content as markdown (plus title/description/og-image). Use it to pull real copy, taglines, product names, stats, and facts from a site instead of inventing them.",
      inputSchema: z.object({
        url: z.url(),
      }),
      execute: async ({ url }) => {
        const result = await firecrawl("/scrape", {
          url,
          formats: ["markdown"],
          onlyMainContent: true,
        });
        if (!result.ok) return { ok: false as const, error: result.error };
        const markdown = String(result.data.markdown ?? "");
        return {
          ok: true as const,
          ...pickMetadata(result.data),
          markdown:
            markdown.length > MARKDOWN_LIMIT
              ? `${markdown.slice(0, MARKDOWN_LIMIT)}\n\n[truncated]`
              : markdown,
        };
      },
    }),

    searchWeb: tool({
      description:
        "Search the web. Use it for facts, references, or finding the right URL for a brand before analyzing it.",
      inputSchema: z.object({
        query: z.string().min(2).max(300),
        limit: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, limit = 5 }) => {
        const result = await firecrawl("/search", { query, limit });
        if (!result.ok) return { ok: false as const, error: result.error };
        const web = (result.data.web ?? []) as Array<{
          title?: string;
          url?: string;
          description?: string;
        }>;
        return {
          ok: true as const,
          results: web.map(({ title, url, description }) => ({
            title,
            url,
            description,
          })),
        };
      },
    }),
  };
}
