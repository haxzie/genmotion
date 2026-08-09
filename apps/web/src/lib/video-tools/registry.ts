import type { TemplateId } from "./templates/types";
import type { SourceId } from "./types";

/**
 * One entry per free video generator.
 *
 * `slug` is load-bearing: it is simultaneously the page route
 * (`/tools/<slug>`), the API route (`/api/tools/<slug>`), and the key of the
 * matching entry in `@/lib/marketing/tools`, which is what puts the tool in the
 * sitemap and llms.txt.
 */
export interface Generator {
  slug: string;
  source: SourceId;
  /** Label above the single input field. */
  inputLabel: string;
  inputPlaceholder: string;
  /** Clickable chips that fill the input — the fastest path to a preview. */
  examples: string[];
  templates: TemplateId[];
  /** Short line under the input explaining what's accepted. */
  hint: string;
}

export const GENERATORS: Record<string, Generator> = {
  "github-star-count": {
    slug: "github-star-count",
    source: "github-stars",
    inputLabel: "Repository",
    inputPlaceholder: "facebook/react",
    examples: ["facebook/react", "vercel/next.js", "microsoft/vscode"],
    templates: ["count-up", "stat-card"],
    hint: "Any public repository — owner/repo or a GitHub URL.",
  },
  "npm-downloads": {
    slug: "npm-downloads",
    source: "npm-downloads",
    inputLabel: "Package",
    inputPlaceholder: "react",
    examples: ["react", "typescript", "@tanstack/react-query"],
    templates: ["chart-rise", "count-up", "stat-card"],
    hint: "Any package on npm, including scoped ones.",
  },
  "youtube-subscribers": {
    slug: "youtube-subscribers",
    source: "youtube-subscribers",
    inputLabel: "Channel",
    inputPlaceholder: "@mkbhd",
    examples: ["@mkbhd", "@veritasium", "@fireship"],
    templates: ["count-up", "stat-card"],
    hint: "A channel handle, a channel URL, or a UC… channel ID.",
  },
};

export function getGenerator(slug: string): Generator {
  const generator = GENERATORS[slug];
  if (!generator) throw new Error(`Unknown video generator: ${slug}`);
  return generator;
}
