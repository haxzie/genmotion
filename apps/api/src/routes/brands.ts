import { Hono } from "hono";
import { firecrawl, hasFirecrawlKey } from "@genmotion/ai/firecrawl";
import type {
  BrandColorRole,
  BrandFontRole,
  BrandInspection,
  BrandLogoVariant,
  InspectedColor,
  InspectedFont,
  InspectedFontFile,
  InspectedLogo,
} from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

/**
 * Reading a company's website so the desktop app can offer to build a brand
 * from it: the name, what they do, their palette, their type and their mark.
 *
 * Server-side because Firecrawl's key is billable. Bundled into the desktop
 * build it would be a credential handed to every user, which is the same
 * reason `/api/events` exists rather than a PostHog key in the app.
 *
 * It answers suggestions, never settled facts. Nothing here writes anything:
 * the app shows what came back, the user confirms it, and only then does a
 * brand folder get written. A palette scraped off a landing page is a starting
 * point somebody should look at, and one presented as final is a wrong blue
 * nobody ever re-checks.
 */
export const brandRoutes = new Hono<AuthEnv>();

brandRoutes.use(requireAuth);

/**
 * Per hour, per organization.
 *
 * Unlike the X resolver next door this one guards real money: every call is a
 * Firecrawl credit. Generous for the thing it is for — somebody setting up the
 * handful of brands they make videos for — and low enough that a stuck retry
 * loop cannot run up a bill overnight. In memory, and so per instance, which
 * is the same trade `x-video.ts` makes and for the same reason.
 */
const ALLOWANCE = { limit: 60, windowMs: 60 * 60 * 1000 };

const spent = new Map<string, { count: number; resetAt: number }>();

function withinAllowance(key: string): boolean {
  const now = Date.now();
  const window = spent.get(key);
  if (!window || window.resetAt <= now) {
    for (const [id, w] of spent) if (w.resetAt <= now) spent.delete(id);
    spent.set(key, { count: 1, resetAt: now + ALLOWANCE.windowMs });
    return true;
  }
  if (window.count >= ALLOWANCE.limit) return false;
  window.count += 1;
  return true;
}

/* ----------------------------------------------------------------- parsing */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Firecrawl answers hex, but it is a scraper: anything else is dropped. */
function hex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return HEX.test(trimmed) ? trimmed : null;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/**
 * Firecrawl's colour names mapped onto ours.
 *
 * Theirs describe where a colour sits on a web page; ours describe what it is
 * for in a video. The two mostly agree, and where they do not the honest
 * answer is `other` rather than a guess that reads as settled.
 */
const COLOR_ROLES: Record<string, { role: BrandColorRole; label: string }> = {
  primary: { role: "primary", label: "Primary" },
  secondary: { role: "accent", label: "Secondary" },
  accent: { role: "accent", label: "Accent" },
  background: { role: "background", label: "Background" },
  textPrimary: { role: "ink", label: "Body text" },
  textSecondary: { role: "muted", label: "Secondary text" },
  link: { role: "other", label: "Links" },
  border: { role: "other", label: "Borders" },
};

/** The colours a component uses, which are often the brand's truest ones. */
const COMPONENT_COLORS: { path: [string, string]; role: BrandColorRole; label: string }[] = [
  { path: ["buttonPrimary", "background"], role: "primary", label: "Primary button" },
  { path: ["buttonPrimary", "textColor"], role: "other", label: "Primary button text" },
  { path: ["buttonSecondary", "background"], role: "other", label: "Secondary button" },
  { path: ["buttonSecondary", "textColor"], role: "other", label: "Secondary button text" },
  { path: ["buttonSecondary", "borderColor"], role: "other", label: "Secondary button border" },
  { path: ["input", "background"], role: "other", label: "Input" },
  { path: ["input", "borderColor"], role: "other", label: "Input border" },
];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Every colour the page gave up, deduplicated by value.
 *
 * "All of them" is the brief, and it is the right one: a brand guide has more
 * than three colours in it, and the user is going to delete the ones they do
 * not want far more happily than they would go hunting for a missing one. The
 * first mention of a hex wins its role, because the named roles are read
 * before the component ones.
 */
function colorsFrom(branding: Record<string, unknown>): InspectedColor[] {
  const out: InspectedColor[] = [];
  const seen = new Set<string>();

  const add = (value: unknown, role: BrandColorRole, label: string) => {
    const parsed = hex(value);
    if (!parsed || seen.has(parsed)) return;
    seen.add(parsed);
    out.push({ hex: parsed, role, label });
  };

  const colors = record(branding.colors);
  for (const [key, { role, label }] of Object.entries(COLOR_ROLES)) add(colors[key], role, label);
  // Anything they report that we have no name for still counts as a colour.
  for (const [key, value] of Object.entries(colors)) {
    if (key in COLOR_ROLES) continue;
    add(value, "other", text(key, 40) ?? "Other");
  }

  const components = record(branding.components);
  for (const { path, role, label } of COMPONENT_COLORS) {
    add(record(components[path[0]])[path[1]], role, label);
  }
  return out.slice(0, 24);
}

const FONT_ROLES: Record<string, BrandFontRole> = {
  heading: "display",
  display: "display",
  title: "display",
  body: "body",
  paragraph: "body",
  mono: "mono",
  code: "mono",
};

/**
 * Typefaces, display first.
 *
 * Firecrawl reports a role per family and a separate `fontFamilies` map; they
 * usually agree, and reading both is what catches a site that only filled in
 * one of them.
 */
function fontsFrom(branding: Record<string, unknown>): InspectedFont[] {
  const out: InspectedFont[] = [];
  const seen = new Set<string>();

  const add = (family: unknown, role: BrandFontRole) => {
    const name = text(family, 120);
    // Generic families say nothing about a brand, and a CSS variable that was
    // never resolved is not a typeface name.
    if (!name || /^(inherit|initial|unset|var\(|serif|sans-serif|monospace|system-ui|-apple-system)/i.test(name)) {
      return;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ family: name, role, files: [] });
  };

  const fonts = Array.isArray(branding.fonts) ? branding.fonts : [];
  for (const entry of fonts) {
    const font = record(entry);
    add(font.family, FONT_ROLES[String(font.role ?? "").toLowerCase()] ?? "body");
  }

  const families = record(record(branding.typography).fontFamilies);
  add(families.heading, "display");
  add(families.primary, out.length === 0 ? "display" : "body");
  add(families.body, "body");
  add(families.mono, "mono");

  // Display first: it is the one a video is actually set in.
  const order: BrandFontRole[] = ["display", "body", "mono"];
  const sorted = out.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).slice(0, 6);

  // Promote the first face when nothing claimed the display role. Plenty of
  // sites set their headings and body in one family, and Notion reports both
  // of its faces as `body`; left alone that produces a brand whose
  // `FONT.display` is empty, which is the one slot a video actually sets its
  // hero in.
  const first = sorted[0];
  if (first && !sorted.some((f) => f.role === "display") && first.role !== "mono") {
    sorted[0] = { ...first, role: "display" };
  }
  return sorted;
}

/* -------------------------------------------------------------- font files */

/**
 * How many stylesheets to read, and how big each may be.
 *
 * A code-split site links a lot of them: Linear's homepage points at 48, and
 * exactly one carries its `@font-face` rules. So the list is ordered by what
 * the filename suggests before it is cut — the font rules live in something
 * called `layout`, `global` or `fonts` far more often than in a hashed chunk —
 * and the cut is wide enough to survive the guess being wrong. They are
 * fetched in parallel with a short timeout each, so the whole pass costs about
 * one slow request rather than sixteen.
 */
const MAX_STYLESHEETS = 16;
const MAX_STYLESHEET_BYTES = 2 * 1024 * 1024;
const STYLESHEET_TIMEOUT_MS = 8_000;

const FONT_FORMATS = ["woff2", "woff", "otf", "ttf"] as const;

function fontFormat(url: string): string | null {
  const clean = url.split(/[?#]/)[0] ?? "";
  const ext = clean.slice(clean.lastIndexOf(".") + 1).toLowerCase();
  return (FONT_FORMATS as readonly string[]).includes(ext) ? ext : null;
}

/**
 * Families compare without case, punctuation, or the words a foundry adds to
 * the same face: "Inter Variable", "Sohne-Var" and "Inter" are one family.
 *
 * It stops short of substring matching, which merged Vercel's `GeistMono` into
 * `Geist` and gave the display family a monospace file. A suffix that names a
 * different face is a different family, even when it shares a prefix.
 */
function foldFamily(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(variable|vf|web|regular|book)$/g, "")
    .replace(/var$/g, "");
}

/**
 * CSS `font-weight` as a number, or nothing.
 *
 * A range (`100 900`) is a variable font, which covers every weight, so there
 * is no single number to record and saying "100" would be wrong.
 */
function parseWeight(value: string | undefined): { weight?: number; variable: boolean } {
  if (!value) return { variable: false };
  const named: Record<string, number> = { normal: 400, bold: 700 };
  const trimmed = value.trim().toLowerCase();
  if (named[trimmed]) return { weight: named[trimmed], variable: false };
  const numbers = trimmed.match(/\d{2,4}/g) ?? [];
  if (numbers.length > 1) return { variable: true };
  const single = Number(numbers[0]);
  return Number.isFinite(single) ? { weight: single, variable: false } : { variable: false };
}

interface FoundFont {
  family: string | null;
  file: InspectedFontFile;
}

/** Every `@font-face` rule in a stylesheet, as the files it points at. */
function fontFacesIn(css: string, base: string): FoundFont[] {
  const found: FoundFont[] = [];
  for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const body = block[1] ?? "";
    const declared = (prop: string) =>
      new RegExp(`${prop}\\s*:\\s*([^;}]+)`, "i").exec(body)?.[1]?.trim();

    const family = declared("font-family")?.replace(/^["']|["']$/g, "");
    const { weight, variable } = parseWeight(declared("font-weight"));
    const style = /italic|oblique/i.test(declared("font-style") ?? "") ? "italic" : "normal";

    for (const match of body.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      const raw = match[2];
      if (!raw || raw.startsWith("data:")) continue;
      const url = source(raw, base);
      const format = url ? fontFormat(url) : null;
      if (!url || !format) continue;
      found.push({
        family: family ?? null,
        file: { url, format, ...(weight ? { weight } : {}), style, variable, from: "font-face" },
      });
    }
  }
  return found;
}

/**
 * Font files the page preloads.
 *
 * `<link rel="preload" as="font">` is how a modern site gets its above-the-fold
 * type in early, and it names the file directly. Worth reading on its own:
 * Linear declares its faces in a stylesheet that is loaded through a framework
 * hint rather than a `<link rel="stylesheet">`, so the preload is sometimes the
 * only thing in the HTML that points at the real file.
 */
function preloadedFonts(html: string, base: string): FoundFont[] {
  const found: FoundFont[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/as\s*=\s*["']?font/i.test(tag)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const url = href ? source(href, base) : null;
    const format = url ? fontFormat(url) : null;
    if (!url || !format) continue;
    // A preload carries no family. It is matched to one by filename below,
    // and offered under its own name when nothing matches.
    found.push({ family: null, file: { url, format, style: "normal", variable: false, from: "preload" } });
  }
  return found;
}

/**
 * Filenames that tend to hold the `@font-face` rules.
 *
 * Matched against the last path segment only: the whole URL is no good,
 * because `linear.app` contains "app" and every one of its 48 stylesheets
 * would look interesting.
 */
const FONT_SHEET_HINTS = /font|typography|layout|global|main|index|root|base|style|theme/i;

/** Every `.css` the page points at, however it points at it, best guesses first. */
function stylesheetUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  // Not just `<link rel="stylesheet">`: frameworks emit their stylesheets as
  // preload hints and inline module payloads, and Linear's `@font-face` rules
  // live in one of those — inside a JS string, where the surrounding quotes
  // are backslash-escaped. So this matches the URL itself wherever it appears
  // rather than anchoring on what sits next to it.
  for (const match of html.matchAll(/(?:https?:\/\/|\/)[^\s"'<>()\\]+\.css(?:\?[^\s"'<>()\\]*)?/gi)) {
    const url = source(match[0], base);
    if (url) urls.add(url);
    // No early break: the ranking below needs the whole list to choose from,
    // and cutting at discovery order is what missed Linear's font sheet at
    // index 35 of 48.
  }

  const filename = (url: string) => url.split("/").pop()?.split("?")[0] ?? "";
  return [...urls]
    .sort((a, b) => Number(FONT_SHEET_HINTS.test(filename(b))) - Number(FONT_SHEET_HINTS.test(filename(a))))
    .slice(0, MAX_STYLESHEETS);
}

async function readStylesheet(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(STYLESHEET_TIMEOUT_MS) }).catch(() => null);
  if (!res?.ok) return "";
  const body = await res.arrayBuffer().catch(() => null);
  if (!body || body.byteLength > MAX_STYLESHEET_BYTES) return "";
  return new TextDecoder().decode(body);
}

/**
 * The real font files, attached to the families they belong to.
 *
 * A family name alone produces a video set in Helvetica, which is the most
 * visible way a brand video goes wrong. Two sources, because sites split
 * between them: `@font-face` rules carry the family and the weight, preloads
 * carry only a file and are matched to a family by name.
 */
export async function withFontFiles(fonts: InspectedFont[], html: string, base: string): Promise<InspectedFont[]> {
  const sheets = await Promise.all(stylesheetUrls(html, base).map(readStylesheet));
  const found = [
    ...sheets.flatMap((css) => fontFacesIn(css, base)),
    // Inline `<style>` too, for a site that ships its rules in the document.
    ...(html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) ?? []).flatMap((block) =>
      fontFacesIn(block, base),
    ),
    ...preloadedFonts(html, base),
  ];

  const families = fonts.map((font) => ({ font, key: foldFamily(font.family), files: [...font.files] }));
  const extra = new Map<string, { family: string; files: InspectedFontFile[] }>();
  const seen = new Set<string>();

  for (const { family, file } of found) {
    if (seen.has(file.url)) continue;
    seen.add(file.url);

    // Equality after folding, not containment: `GeistMono` shares a prefix
    // with `Geist` and is not the same face.
    const key = family
      ? foldFamily(family)
      : // A preload carries no family, so the filename stands in for one.
        // `InterVariable.woff2` folds to `inter`.
        foldFamily((file.url.split("/").pop() ?? "").replace(/\.[a-z0-9]+$/i, "").split(/[.?]/)[0] ?? "");
    const match = families.find(({ key: known }) => known === key);
    if (match) {
      match.files.push(file);
      continue;
    }
    // A face the branding pass never mentioned. Linear's mono is one of these,
    // and it is a real part of the brand.
    if (!family) continue;
    const entry = extra.get(key) ?? { family, files: [] };
    entry.files.push(file);
    extra.set(key, entry);
  }

  const withFiles = families.map(({ font, files }) => ({ ...font, files: files.slice(0, 12) }));
  const discovered = [...extra.values()].slice(0, 4).map(({ family, files }) => ({
    family,
    role: /mono|code/i.test(family) ? ("mono" as const) : ("body" as const),
    files: files.slice(0, 12),
  }));
  return [...withFiles, ...discovered].slice(0, 8);
}

/** `data:` for an inline SVG, otherwise an absolute URL. Anything else is dropped. */
function source(value: unknown, base: string): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("data:image/")) return value;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Logo candidates, best first.
 *
 * The inline SVG Firecrawl returns as `logo` is the find worth having: it is
 * the real mark at full quality, which is exactly what the agent is told it
 * must use and must never redraw. A favicon is a fallback, and an og:image is
 * a social card far more often than it is a logo — both are offered, neither
 * is assumed.
 */
function logosFrom(branding: Record<string, unknown>, base: string): InspectedLogo[] {
  const out: InspectedLogo[] = [];
  const seen = new Set<string>();
  const images = record(branding.images);

  const add = (value: unknown, variant: BrandLogoVariant, label: string) => {
    const src = source(value, base);
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ src, variant, label });
  };

  add(branding.logo, "mark", "Logo on the page");
  add(images.logo, "mark", "Logo on the page");
  add(images.favicon, "icon", "Favicon");
  add(images.ogImage, "lockup", "Social card");
  return out.slice(0, 6);
}

/* ------------------------------------------------------------------ route */

brandRoutes.post("/inspect", async (c) => {
  if (!hasFirecrawlKey()) {
    return c.json(
      { error: "Brand import is not configured on this server. Add the details by hand for now." },
      503,
    );
  }

  const body = await c.req.json<{ url?: string }>().catch(() => ({}) as { url?: string });
  const raw = body.url?.trim();
  if (!raw) return c.json({ error: "Missing url" }, 400);

  let target: URL;
  try {
    // A person types `acme.com`, not a URL. Completing it here rather than
    // refusing is the difference between a feature and a form error.
    target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return c.json({ error: `"${raw}" is not a web address.` }, 400);
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return c.json({ error: "Only http and https addresses." }, 400);
  }

  if (!withinAllowance(c.get("organizationId"))) {
    return c.json({ error: "Too many brand imports in the last hour. Try again shortly." }, 429);
  }

  const result = await firecrawl(
    "/scrape",
    {
      url: target.toString(),
      // `branding` is the extraction built for this and `metadata` rides along
      // with every scrape, carrying the title and description. `rawHtml` is
      // what the font files are found through: the family names `branding`
      // reports are not enough to set type with, and the page is where the
      // stylesheets and preload hints that name the real files are.
      formats: ["branding", "rawHtml"],
      onlyMainContent: false,
    },
    { timeoutMs: 45_000 },
  );

  if (!result.ok) {
    return c.json({ error: `Could not read ${target.hostname}. ${result.error}` }, 502);
  }

  const inspection = parseBranding(result.data, target.toString());
  // The files come from the page's stylesheets and preload hints, which means
  // a handful of extra fetches from our side. Never fatal: a family name is
  // still worth having without the bytes behind it.
  const html = typeof result.data.rawHtml === "string" ? result.data.rawHtml : "";
  if (html) {
    inspection.fonts = await withFontFiles(inspection.fonts, html, target.toString()).catch(
      () => inspection.fonts,
    );
  }
  return c.json(inspection);
});

/**
 * Firecrawl's payload, as the shape the app renders.
 *
 * Exported and pure so the mapping can be held to a real captured response in
 * a test. Every field here is a guess about somebody's website, and the way
 * this goes wrong is quietly: a renamed key upstream becomes an empty dialog
 * that still looks like it worked.
 */
export function parseBranding(data: Record<string, unknown>, requested: string): BrandInspection {
  const branding = record(data.branding);
  const metadata = record(data.metadata);

  const colors = colorsFrom(branding);
  const fonts = fontsFrom(branding);
  const logos = logosFrom(branding, requested);

  const missing: string[] = [];
  if (colors.length === 0) missing.push("colours — nothing on the page named one, so you will have to enter the hex values");
  if (fonts.length === 0) missing.push("typefaces — the page loads its fonts somewhere this cannot see");
  if (logos.length === 0) missing.push("a logo — no image on the page looked like a mark");

  const confidence = record(branding.confidence).colors;
  const scheme = branding.colorScheme;
  // A page title is "Stripe | Financial Infrastructure...", and the brand is
  // the part before the separator.
  const fromTitle = (value: unknown) => text(value, 120)?.split(/\s[|–—-]\s/)[0]?.trim();
  const name = text(branding.brandName, 120) ?? fromTitle(metadata.ogTitle) ?? fromTitle(metadata.title);
  const description = text(metadata.ogDescription, 600) ?? text(metadata.description, 600);

  return {
    url: text(metadata.url, 300) ?? requested,
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    colors,
    fonts,
    logos,
    ...(scheme === "light" || scheme === "dark" ? { colorScheme: scheme } : {}),
    ...(typeof confidence === "number" ? { confidence } : {}),
    missing,
  };
}
