import {
  getAllAnswers,
  type Answer,
  type AnswerKind,
  type AnswerTool,
} from "@/lib/marketing/content";
import { SITE_URL } from "@/lib/marketing/site";

export type ToolMeta = {
  name: string;
  /** Where the tool's own hub lives. `general` has none: it is index-only. */
  href: string | null;
  /** One line under the hub heading. */
  tagline: string;
  /** Intro paragraph on the hub. Facts only; the hub is a map, not a pitch. */
  intro: string;
  /** Pages a reader of this hub should also meet: the essays, the docs. */
  elsewhere: { label: string; href: string; note: string }[];
};

export const TOOL_META: Record<AnswerTool, ToolMeta> = {
  hyperframes: {
    name: "HyperFrames",
    href: "/answers/hyperframes",
    tagline: "HyperFrames errors, black frames and slow renders, answered",
    intro:
      "HyperFrames turns an HTML document with timing attributes and a seekable animation into a deterministic MP4. When it goes wrong it usually goes wrong quietly: the check passes, the render exits 0, and the video is black or still. These answers are built from the project's issue tracker, its docs and its changelog, with the cause traced rather than guessed.",
    elsewhere: [
      {
        label: "HyperFrames alternatives",
        href: "/blog/hyperframes-alternatives",
        note: "When a framework is the wrong shape and you want an app instead",
      },
      {
        label: "The HyperFrames engine in GenMotion",
        href: "/blog/hyperframes-engine-in-genmotion",
        note: "Run HyperFrames compositions in a studio, with no CLI to manage",
      },
      {
        label: "Deterministic rendering",
        href: "/glossary/deterministic-rendering",
        note: "Why a frame has to be a pure function of time",
      },
    ],
  },
  remotion: {
    name: "Remotion",
    href: "/answers/remotion",
    tagline: "Remotion render errors, speed, cost and licensing, answered",
    intro:
      "Remotion renders React compositions to video, and most of its pain is in the renderer: delayRender timeouts, renders that hang, Lambda limits, blurry text and the licence. These answers are built from Remotion's own docs and its GitHub issues and discussions, and they say plainly when the right answer is to stay on Remotion.",
    elsewhere: [
      {
        label: "Remotion alternatives",
        href: "/blog/remotion-alternatives",
        note: "What Remotion's licence actually costs, and the tools to compare",
      },
      {
        label: "Deterministic rendering",
        href: "/glossary/deterministic-rendering",
        note: "Why a frame has to be a pure function of the frame number",
      },
    ],
  },
  general: {
    name: "Video rendering",
    href: null,
    tagline: "Answers that apply to every code-to-video tool",
    intro:
      "Questions that come up whichever framework you use: previews that do not match renders, black frames from headless Chrome, and encoder settings.",
    elsewhere: [],
  },
};

export const KIND_LABEL: Record<AnswerKind, string> = {
  error: "Error",
  "how-to": "How-to",
  decision: "Decision",
  explainer: "Explainer",
};

/** Hub sections, in the order a reader hits them. */
export const KIND_ORDER: AnswerKind[] = ["error", "how-to", "decision", "explainer"];

export const KIND_HEADING: Record<AnswerKind, string> = {
  error: "Errors and things that look wrong",
  "how-to": "How to do it",
  decision: "Should you, and what does it cost",
  explainer: "How it works",
};

/** Slugs that would collide with a static route under `/answers`. */
export const RESERVED_SLUGS = new Set(["hyperframes", "remotion"]);

export type AnswerBlock =
  | { type: "markdown"; content: string }
  | { type: "callout"; key: string };

const CALLOUT_DIRECTIVE = /^::callout\s+([a-z0-9-]+)\s*$/;

/**
 * Splits a body on `::callout <key>` lines, the way the blog splits on
 * `::video`. Markdown cannot carry a component, so a callout is named in the
 * body and defined in the frontmatter.
 */
export function parseAnswerBody(body: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) blocks.push({ type: "markdown", content });
    buffer = [];
  };
  for (const line of body.split("\n")) {
    const match = CALLOUT_DIRECTIVE.exec(line.trim());
    if (match?.[1]) {
      flush();
      blocks.push({ type: "callout", key: match[1] });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return blocks;
}

export function answerUrl(slug: string): string {
  return `${SITE_URL}/answers/${slug}`;
}

export function answerMarkdownHref(slug: string): string {
  return `/answers/${slug}.md`;
}

export function getAnswersByTool(tool: AnswerTool): Answer[] {
  return getAllAnswers().filter((a) => a.tool === tool);
}

const RELATED_MAX = 5;
/** Below this many hand-made links, a page is topped up from its own tool. */
const RELATED_MIN = 3;

/**
 * Siblings for the foot of an answer, strongest signal first:
 *   1. the ones this answer names in `related`;
 *   2. the ones that name this answer, so a link is never one-way;
 *   3. only if that leaves fewer than RELATED_MIN, same-tool answers ranked by
 *      shared tags, then the newest.
 * Step 3 exists so a new answer is never a dead end. It is deliberately not
 * applied to a page that is already well linked: tags like "render" sit on most
 * pages, and an unrelated sibling would dilute a list someone curated.
 * It never returns the answer itself or the same slug twice.
 */
export function getRelatedAnswers(answer: Answer): Answer[] {
  const all = getAllAnswers();
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  const picked = new Map<string, Answer>();
  const add = (a: Answer | undefined) => {
    if (a && a.slug !== answer.slug && !picked.has(a.slug)) picked.set(a.slug, a);
  };

  for (const slug of answer.related) add(bySlug.get(slug));
  for (const other of all) if (other.related.includes(answer.slug)) add(other);

  if (picked.size < RELATED_MIN) {
    const sameTool = all.filter((a) => a.tool === answer.tool && a.slug !== answer.slug);
    const shared = (a: Answer) => a.tags.filter((t) => answer.tags.includes(t)).length;
    [...sameTool].sort((a, b) => shared(b) - shared(a)).forEach(add);
  }

  return [...picked.values()].slice(0, RELATED_MAX);
}

/** The Markdown twin served at `/answers/<slug>.md`: same words, no HTML. */
export function answerToMarkdown(answer: Answer): string {
  const out: string[] = [`# ${answer.title}`, "", answer.description, ""];

  if (answer.errors.length > 0) {
    out.push("## The error", "");
    for (const e of answer.errors) out.push("```", e, "```", "");
  }

  // The twin carries the callouts too, as quotes, so an agent reading it gets the
  // same offer in the same place a person would.
  for (const block of parseAnswerBody(answer.body)) {
    if (block.type === "markdown") {
      out.push(block.content, "");
    } else {
      const c = answer.callouts[block.key];
      if (!c) continue;
      out.push(`> **${c.heading}**`, ">", ...c.body.split("\n").map((l) => `> ${l}`));
      if (c.prompt) out.push(">", "> Prompt:", ">", ...c.prompt.split("\n").map((l) => `> ${l}`));
      out.push("");
    }
  }

  if (answer.genmotion) {
    out.push(`## ${answer.genmotion.heading}`, "", answer.genmotion.body, "");
  }

  const related = getRelatedAnswers(answer);
  if (related.length > 0) {
    out.push("## Related", "");
    for (const r of related) out.push(`- [${r.title}](${answerUrl(r.slug)})`);
    out.push("");
  }

  if (answer.faqs.length > 0) {
    out.push("## FAQ", "");
    for (const f of answer.faqs) out.push(`### ${f.q}`, "", f.a, "");
  }

  if (answer.sources.length > 0) {
    out.push("## Sources", "");
    for (const s of answer.sources) out.push(`- [${s.label}](${s.url})`);
    out.push("");
  }

  out.push(`Canonical: ${answerUrl(answer.slug)}`, "");
  return out.join("\n");
}
