import { z } from "zod";

/**
 * The scene library: every scene of every template, described for an agent
 * that is building a *different* video and wants to see how a hook, an
 * integrations beat or a funding number has been done well before.
 *
 * A template is the wrong grain for that. An agent making a dev-tool launch
 * doesn't want the Stripe template; it wants Stripe's "coin becomes a circuit"
 * beat, Firebase's integrations wall and Assemble's agent-trace scene. So each
 * template carries a `scenes.json` sidecar — one curated entry per scene file —
 * and this module ranks those entries against a request.
 *
 * Pure and dependency-free apart from zod: it runs in the API, in the CLI's
 * local mode and in tests, and nothing here touches the filesystem.
 */

/**
 * The narrative job a scene does. Closed, because the point is that an agent
 * planning beat 3 ("show the integrations") can ask for exactly that beat and
 * get scenes from every template that has one.
 */
export const SCENE_BEATS = [
  "hook",
  "problem",
  "turn",
  "reveal",
  "feature",
  "workflow",
  "integrations",
  "benefit",
  "stat",
  "data",
  "proof",
  "announcement",
  "conversation",
  "concept",
  "comparison",
  "recap",
  "cta",
  "logo",
  "brand",
  "transition",
  "atmosphere",
] as const;

export type SceneBeat = (typeof SCENE_BEATS)[number];

/** One line per beat — shown to agents so the vocabulary explains itself. */
export const SCENE_BEAT_LABELS: Record<SceneBeat, string> = {
  hook: "opening attention grab: cold open, bold statement, striking first seconds",
  problem: "the pain, the status quo, what's broken today",
  turn: "the pivot from problem to solution: 'until now', 'what if'",
  reveal: "the product or name introduced for the first time",
  feature: "one capability shown, usually product UI doing a thing",
  workflow: "a process or demo flow in steps: input, processing, result",
  integrations: "ecosystem: connected apps, platform logos, tools plugging in",
  benefit: "an outcome or value claim: fast, safe, simple",
  stat: "one big number or counter",
  data: "a chart, graph or dashboard of numbers",
  proof: "social proof: customers, testimonials, press",
  announcement: "news: funding round, milestone, now available",
  conversation: "a chat or messaging thread told as a story",
  concept: "an idea or term explained",
  comparison: "before/after, old way vs new way",
  recap: "a summary of everything covered",
  cta: "call to action / end card: URL, download, sign up",
  logo: "logo lockup, brand sting, wordmark resolve",
  brand: "brand identity: palette, type specimen, collage",
  transition: "a bridge between beats with no message of its own",
  atmosphere: "mood, music-video or abstract imagery",
};

/**
 * Words people use for a beat without naming it. Folded into each entry's
 * searchable text (not the query), so "intro scene", "opening" and "cold
 * open" all reach `hook` and "outro"/"end card" reach `cta` and `logo` —
 * BM25 has no notion of synonyms, and the beat is the most important thing a
 * query names.
 */
const BEAT_SYNONYMS: Record<SceneBeat, string> = {
  hook: "hook intro opening opener cold open first scene attention grab start headline",
  problem: "problem pain point status quo before frustration struggle broken old way",
  turn: "turn pivot until now what if but there is a better way bridge",
  reveal: "reveal introducing introduce meet product name launch unveil",
  feature: "feature capability product ui demo showcase screen",
  workflow: "workflow how it works process steps demo flow pipeline",
  integrations: "integrations integration ecosystem apps connect connected platforms tools logos works with plugins partners",
  benefit: "benefit value outcome promise tagline fast safe simple",
  stat: "stat number counter metric big number figure count",
  data: "data chart graph dashboard visualization analytics growth",
  proof: "proof social proof customers testimonial trusted by logos users quote",
  announcement: "announcement news funding raise round series milestone available now",
  conversation: "conversation chat messages messaging texts thread dm group chat",
  concept: "concept explain explainer educational definition idea",
  comparison: "comparison before after versus vs old new side by side",
  recap: "recap summary list overview all",
  cta: "cta call to action end card outro closing download sign up try url",
  logo: "logo lockup sting wordmark brand mark outro ending resolve",
  brand: "brand identity guidelines palette typography colors specimen",
  transition: "transition bridge interstitial cut",
  atmosphere: "atmosphere mood music video abstract cinematic art",
};

/**
 * Words that, in a *query*, name the beat outright. Narrower than
 * `BEAT_SYNONYMS` on purpose: "product" or "all" in a query says nothing about
 * the job a scene does, but "intro", "end card" or "testimonial" does, and
 * then a scene that does that job should outrank one that merely shares the
 * query's other words ("hook for a developer tool launch" wants hooks, not
 * every dev-tool scene).
 */
const BEAT_CUES: Record<SceneBeat, string[]> = {
  hook: ["hook", "intro", "opening", "opener", "cold open", "first scene"],
  problem: ["problem", "pain", "pain point", "struggle", "frustration", "status quo"],
  turn: ["pivot", "until now", "turn"],
  reveal: ["reveal", "introducing", "unveil", "product reveal", "name reveal"],
  feature: ["feature", "capability", "feature demo"],
  workflow: ["workflow", "how it works", "process", "steps", "pipeline"],
  integrations: ["integration", "integrations", "ecosystem", "connect", "connected", "works with", "plugins"],
  benefit: ["benefit", "benefits", "value prop", "tagline", "promise"],
  stat: ["stat", "number", "counter", "metric", "count up", "big number"],
  data: ["chart", "graph", "data", "dashboard", "analytics", "visualization"],
  proof: ["testimonial", "social proof", "customers", "trusted by", "quote", "reviews"],
  announcement: ["announcement", "funding", "raise", "raised", "series", "milestone", "news"],
  conversation: ["chat", "conversation", "messages", "messaging", "texts", "dm", "group chat"],
  concept: ["explain", "explainer", "concept", "educational"],
  comparison: ["comparison", "compare", "versus", "vs", "before and after", "old way"],
  recap: ["recap", "summary", "overview"],
  cta: ["cta", "call to action", "end card", "outro", "sign up", "download"],
  logo: ["logo", "lockup", "sting", "wordmark", "logo reveal", "outro"],
  brand: ["brand identity", "brand guide", "palette", "typography", "guidelines"],
  transition: ["transition", "interstitial"],
  atmosphere: ["music video", "abstract", "mood", "atmosphere"],
};

/** The beats a query names, by its cue words. */
export function beatsInQuery(query: string): SceneBeat[] {
  const words = ` ${tokenize(query).join(" ")} `;
  return SCENE_BEATS.filter((beat) => BEAT_CUES[beat].some((cue) => words.includes(` ${tokenize(cue).join(" ")} `)));
}

export const SCENE_QUALITIES = ["hero", "solid", "filler"] as const;
export type SceneQuality = (typeof SCENE_QUALITIES)[number];

const kebab = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/** One entry in a template's `scenes.json`. */
export const sceneEntrySchema = z.object({
  /** Project-relative, exactly as `project.json` names it. */
  file: z.string().min(1),
  /** Short and specific: what this scene *is*, not the template's name. */
  title: z.string().min(1).max(120),
  beat: z.enum(SCENE_BEATS),
  alsoFits: z.array(z.enum(SCENE_BEATS)).default([]),
  /** What the viewer sees, in order. */
  summary: z.string().min(1),
  /** The reusable implementation idea. */
  build: z.string().min(1),
  /** When to borrow it, and what to swap. */
  reuse: z.string().min(1),
  techniques: z.array(kebab).min(1),
  mood: z.array(kebab).min(1).max(4),
  /** GenMotion owner skills that would use it (`launch-playbook`, …). */
  videoTypes: z.array(kebab).min(1),
  quality: z.enum(SCENE_QUALITIES),
  /** False when copying the file alone won't reproduce the visual. */
  standalone: z.boolean(),
  /** Fractions of the scene's duration for the three-frame filmstrip. */
  sampleAt: z.array(z.number().min(0).max(1)).length(3).optional(),
});

export const sceneSidecarSchema = z.object({
  /** The template's story as a beat sequence. */
  arc: z.string().min(1),
  scenes: z.array(sceneEntrySchema).min(1),
});

export type SceneEntry = z.infer<typeof sceneEntrySchema>;
export type SceneSidecar = z.infer<typeof sceneSidecarSchema>;

export const SCENES_FILE = "scenes.json";
/** Three-frame filmstrips, one per scene, captured by `scripts/scene-stills.mjs`. */
export const STILLS_DIR = "stills";
export const DEFAULT_SAMPLE_AT = [0.2, 0.55, 0.9] as const;

/**
 * A scene as search returns it — everything needed to decide whether it's
 * worth opening, and nothing heavy (no code, no image bytes).
 */
export interface SceneSummary {
  /** `<template>/<scene file stem>`, e.g. `stripe-payment-links-launch-video/06-circuit`. */
  id: string;
  template: string;
  templateTitle: string;
  file: string;
  title: string;
  beat: SceneBeat;
  alsoFits: SceneBeat[];
  summary: string;
  /** When to borrow it and what to swap — the line that decides whether to open it. */
  reuse: string;
  techniques: string[];
  mood: string[];
  videoTypes: string[];
  quality: SceneQuality;
  standalone: boolean;
  engine: "three" | "react" | "hyperframes";
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** Where the scene starts in the template's video, for `videoPath#t=`. */
  startFrame: number;
  /** 1-based position in the template, and the template's scene count. */
  position: number;
  of: number;
  stillPath: string | null;
  videoPath: string;
}

/** What `get_scene` hands an agent: the summary, the how, and the code. */
export interface SceneReference extends SceneSummary {
  build: string;
  /** The whole template's beat sequence, so the scene is seen in context. */
  arc: string;
  previous: { id: string; title: string; beat: SceneBeat } | null;
  next: { id: string; title: string; beat: SceneBeat } | null;
  /** The scene file first, then every local module it imports, transitively. */
  files: { path: string; contents: string }[];
  /** Asset files the code imports — named, not shipped. */
  assets: string[];
}

export interface SceneQuery {
  query?: string;
  beat?: SceneBeat;
  videoType?: string;
  engine?: string;
  technique?: string;
  /**
   * Ranks scenes of this shape higher. A preference rather than a filter: the
   * catalog is mostly landscape, so filtering a "square" request down to the
   * few square scenes replaced relevance with whatever happened to be square
   * (an agent asking for a funding beat got three chat scenes).
   */
  aspect?: "landscape" | "portrait" | "square";
  /**
   * The engine the agent is writing in. A soft preference too: ideas cross
   * engines, but a scene in your own engine has code you can lift.
   */
  preferEngine?: string;
  /** Ranks scenes with this mood (`dark`, `playful`, …) higher. */
  mood?: string;
  /** Filler is hidden unless asked for: it teaches nothing on its own. */
  includeFiller?: boolean;
  /** At most this many hits from one template, so results span the catalog. Default 2. */
  perTemplate?: number;
  limit?: number;
}

export interface SceneHit {
  scene: SceneSummary;
  score: number;
  /** Matching scenes from the same template held back by the per-template cap. */
  moreInTemplate?: number;
}

const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how", "i", "in", "is", "it", "its",
  "me", "my", "of", "on", "or", "our", "that", "the", "this", "to", "we", "with", "you", "your", "make",
  "want", "need", "please", "can", "could", "would", "should", "do", "does", "get", "give", "scene", "scenes",
  "video", "shot", "like", "some", "show", "shows", "showing",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

/**
 * Crude English stemming — enough that "integrations" meets "integration",
 * "charts" meets "chart" and "announcing" meets "announce". A real stemmer
 * would be a dependency for a corpus of a few hundred short documents.
 */
function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const suffix of ["ations", "ation", "ings", "ing", "ies", "es", "s", "ed"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return suffix === "ies" ? `${token.slice(0, -3)}y` : token.slice(0, -suffix.length);
    }
  }
  return token;
}

/**
 * The text a scene is ranked on. Fields are repeated to weight them: the
 * beat and title say what a scene is for, which is what queries mostly ask;
 * the reuse note says when to borrow it, which is the agent's own framing.
 */
export function sceneSearchText(scene: SceneSummary & { templateDescription?: string }): string {
  const beats = [scene.beat, ...scene.alsoFits];
  return [
    scene.title,
    scene.title,
    beats.map((b) => BEAT_SYNONYMS[b]).join(" "),
    BEAT_SYNONYMS[scene.beat],
    scene.summary,
    scene.techniques.join(" ").replace(/-/g, " "),
    scene.techniques.join(" ").replace(/-/g, " "),
    scene.mood.join(" "),
    scene.videoTypes.join(" ").replace(/-/g, " "),
    scene.templateDescription ?? "",
    scene.reuse,
  ].join(" ");
}

function aspectOf(scene: SceneSummary): "landscape" | "portrait" | "square" {
  if (scene.width === scene.height) return "square";
  return scene.width > scene.height ? "landscape" : "portrait";
}

const QUALITY_BOOST: Record<SceneQuality, number> = { hero: 1.3, solid: 1, filler: 0.6 };

type Searchable = SceneSummary & { build?: string; templateDescription?: string };

/**
 * Rank the library against a request.
 *
 * Facets (beat, engine, technique) filter; aspect and engine preference boost; the free-text query ranks with BM25
 * over each scene's text, nudged by curation quality. With no query, the
 * filtered set comes back hero-first — "show me every integrations beat" is a
 * legitimate thing to ask.
 */
export function searchScenes(library: readonly Searchable[], q: SceneQuery): SceneHit[] {
  const limit = Math.min(Math.max(1, q.limit ?? 8), 30);
  const perTemplate = Math.max(1, q.perTemplate ?? 2);
  const pool = library.filter(
    (s) =>
      (q.includeFiller || s.quality !== "filler") &&
      (!q.beat || s.beat === q.beat || s.alsoFits.includes(q.beat)) &&
      (!q.videoType || s.videoTypes.includes(q.videoType)) &&
      (!q.engine || s.engine === q.engine) &&
      (!q.technique || s.techniques.includes(q.technique)),
  );

  const scores = new Map<string, number>();
  const terms = [...new Set(tokenize(q.query ?? ""))];
  if (terms.length > 0) {
    const docs = pool.map((s) => tokenize(sceneSearchText(s)));
    const avgLen = docs.reduce((n, d) => n + d.length, 0) / Math.max(1, docs.length);
    const counts = docs.map((doc) => {
      const m = new Map<string, number>();
      for (const t of doc) m.set(t, (m.get(t) ?? 0) + 1);
      return m;
    });
    const k1 = 1.2;
    const b = 0.6;
    for (const term of terms) {
      const withTerm = counts.filter((c) => c.has(term)).length;
      if (withTerm === 0) continue;
      const idf = Math.log(1 + (pool.length - withTerm + 0.5) / (withTerm + 0.5));
      pool.forEach((s, i) => {
        const tf = counts[i]?.get(term) ?? 0;
        if (tf === 0) return;
        const len = docs[i]?.length ?? 0;
        const score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * len) / Math.max(1, avgLen))));
        scores.set(s.id, (scores.get(s.id) ?? 0) + score);
      });
    }
  }

  const named = q.beat ? [] : beatsInQuery(q.query ?? "");
  const beatBoost = (scene: SceneSummary) =>
    named.includes(scene.beat) ? 1.8 : scene.alsoFits.some((b) => named.includes(b)) ? 1.3 : 1;
  // Music-video imagery shares a lot of vocabulary with everything ("chart",
  // "grid", "counter") but is rarely what someone building a product or an
  // explainer wants; it has to be asked for.
  const moodBoost = (scene: SceneSummary) => (scene.beat === "atmosphere" && !named.includes("atmosphere") ? 0.6 : 1);
  const shapeBoost = (scene: SceneSummary) =>
    (q.aspect && aspectOf(scene) === q.aspect ? 1.4 : 1) *
    (q.preferEngine && scene.engine === q.preferEngine ? 1.3 : 1) *
    (q.mood && scene.mood.includes(q.mood) ? 1.4 : 1);
  const ranked = pool
    .map((scene) => {
      const base = terms.length > 0 ? scores.get(scene.id) ?? 0 : 1;
      return { scene, score: base * QUALITY_BOOST[scene.quality] * beatBoost(scene) * moodBoost(scene) * shapeBoost(scene) };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.scene.id.localeCompare(b.scene.id));
  // A tail of one-shared-word matches is noise that reads as a recommendation;
  // stop where relevance falls below a quarter of the best hit.
  const floor = terms.length > 0 ? (ranked[0]?.score ?? 0) * 0.25 : 0;
  const relevant = ranked.filter((h) => h.score >= floor);

  const taken = new Map<string, number>();
  const hits: SceneHit[] = [];
  for (const hit of relevant) {
    const n = taken.get(hit.scene.template) ?? 0;
    if (n >= perTemplate) continue;
    taken.set(hit.scene.template, n + 1);
    hits.push({ scene: stripPrivate(hit.scene), score: Math.round(hit.score * 100) / 100 });
    if (hits.length >= limit) break;
  }
  // Say what the cap held back, on the template's last hit, so a query that
  // really is about one template ("whiteboard explainer") isn't a dead end.
  const matched = new Map<string, number>();
  for (const h of relevant) matched.set(h.scene.template, (matched.get(h.scene.template) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const h of hits) {
    const k = (seen.get(h.scene.template) ?? 0) + 1;
    seen.set(h.scene.template, k);
    const more = (matched.get(h.scene.template) ?? 0) - (taken.get(h.scene.template) ?? 0);
    if (k === taken.get(h.scene.template) && more > 0) h.moreInTemplate = more;
  }
  return hits;
}

/** Search hands back summaries; the build notes and the code are `getScene`'s. */
function stripPrivate(scene: Searchable): SceneSummary {
  const { build: _build, templateDescription: _description, ...summary } = scene;
  return summary;
}

// ── As text, for an agent ────────────────────────────────────────────────
// Shared by the CLI, its MCP server and the desktop app's tools, so a scene
// reads the same wherever an agent meets it.

export const BEAT_HELP = SCENE_BEATS.map((b) => `${b} (${SCENE_BEAT_LABELS[b]})`).join("; ");

/** Search results as an agent reads them: enough to choose, one handle to open. */
export function formatSceneHits(hits: SceneHit[]): string {
  if (hits.length === 0) return "No scenes matched. Try a beat filter alone, or fewer words.";
  return hits
    .map(({ scene: s, moreInTemplate }, i) =>
      [
        `${i + 1}. ${s.id} — ${s.title}`,
        `   [${s.engine} · ${s.beat}${s.alsoFits.length ? ` +${s.alsoFits.join(",")}` : ""} · ${s.quality} · ${s.width}x${s.height} · ${(s.durationInFrames / s.fps).toFixed(1)}s · scene ${s.position}/${s.of} of "${s.templateTitle}"]`,
        `   ${s.summary}`,
        `   Borrow it: ${s.reuse}`,
        `   Techniques: ${s.techniques.join(", ")} · mood: ${s.mood.join(", ")}`,
        moreInTemplate ? `   +${moreInTemplate} more matching scene${moreInTemplate === 1 ? "" : "s"} in this template (its arc is in get_scene)` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

/**
 * How much imported code comes inline. Shared component files run to
 * thousands of lines, and an agent printing all of them every time it opens a
 * scene drowned the notes it came for (trials hit 800-line outputs). Small
 * helpers inline; big ones are listed with what they export, to read by name.
 * A scene that is only a window onto a shared component gets more room,
 * because there the component *is* the scene.
 */
const INLINE_FILE_MAX = 6 * 1024;
const INLINE_TOTAL = { standalone: 16 * 1024, slice: 28 * 1024 };

function exportsOf(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]!);
  }
  return [...names];
}

export interface SceneReferenceFormat {
  /** One imported file instead of the overview. */
  file?: string;
  /** Where the filmstrip can be opened (a path or URL), shown first. */
  frames?: string | null;
  /** The reader's own engine, so a cross-engine reference says so up front. */
  engine?: string;
  /** Inline every imported file regardless of size. */
  full?: boolean;
}

/**
 * A scene reference as text: frames, notes, then code. The scene file always
 * comes whole.
 */
export function formatSceneReference(scene: SceneReference, options: SceneReferenceFormat = {}): string {
  const { file, frames, engine, full } = options;
  if (file) {
    const one = scene.files.find((f) => f.path === file);
    if (!one) throw new Error(`${scene.id} has no file "${file}". One of: ${scene.files.map((f) => f.path).join(", ")}`);
    return `// ${one.path} (from ${scene.id})\n${one.contents}`;
  }
  const crossEngine = engine && engine !== scene.engine;
  const lines: (string | null)[] = [
    `# ${scene.title}`,
    `${scene.id} · beat: ${scene.beat}${scene.alsoFits.length ? ` (also ${scene.alsoFits.join(", ")})` : ""} · ${scene.quality} · ${scene.engine} engine · ${scene.width}x${scene.height} @ ${scene.fps}fps · ${scene.durationInFrames} frames (${(scene.durationInFrames / scene.fps).toFixed(1)}s)`,
    frames ? `Frames (entrance, key moment, end) — look at them first: ${frames}` : null,
    crossEngine ? `Written for the ${scene.engine} engine, yours is ${engine}: borrow the idea and timing, not the code.` : null,
    `Scene ${scene.position} of ${scene.of} in "${scene.templateTitle}". The template's arc: ${scene.arc}`,
    scene.previous ? `Before it: ${scene.previous.id} (${scene.previous.beat}) — ${scene.previous.title}` : null,
    scene.next ? `After it: ${scene.next.id} (${scene.next.beat}) — ${scene.next.title}` : null,
    "",
    `## What you see\n${scene.summary}`,
    `## How it's built\n${scene.build}`,
    `## Borrowing it\n${scene.reuse}${scene.standalone ? "" : "\nNot standalone: the visual lives in the shared components below, not the scene file alone."}`,
    `Techniques: ${scene.techniques.join(", ")} · mood: ${scene.mood.join(", ")}`,
    "",
    "## Code",
    crossEngine
      ? "Study it for the idea and the timing; it can't be forked into your engine."
      : "If this is close to your beat, fork it (fork_scene / `genmotion scenes add <id>`) and re-skin it: that keeps the tuned timing, camera and finish. Otherwise study it and write your own.",
  ];
  const budget = full ? Infinity : scene.standalone ? INLINE_TOTAL.standalone : INLINE_TOTAL.slice;
  let used = 0;
  const withheld: string[] = [];
  for (const [i, f] of scene.files.entries()) {
    const size = f.contents.length;
    if (i > 0 && !full && (size > (scene.standalone ? INLINE_FILE_MAX : budget) || used + size > budget)) {
      const names = exportsOf(f.contents);
      withheld.push(`- ${f.path} (${f.contents.split("\n").length} lines)${names.length ? `: ${names.slice(0, 14).join(", ")}${names.length > 14 ? ", …" : ""}` : ""}`);
      continue;
    }
    used += size;
    lines.push(`\n### ${f.path}\n\`\`\`ts\n${f.contents}\n\`\`\``);
  }
  if (withheld.length) lines.push(`\nAlso imported, not shown — read one by its path (file=<path>):\n${withheld.join("\n")}`);
  if (scene.assets.length) lines.push(`\nAssets it imports (not shipped): ${scene.assets.join(", ")}`);
  return lines.filter((l) => l !== null).join("\n");
}

/** What to tell an agent right after a fork, so the re-skin is the next step. */
export function forkNextSteps(forked: { file: string; written: string[]; kept: string[]; warnings: string[] }, template: string): string {
  return [
    `Forked into ${forked.file} and registered in project.json.`,
    forked.written.length ? `Wrote: ${forked.written.join(", ")}` : "",
    forked.kept.length ? `Kept your existing (edited) copies of: ${forked.kept.join(", ")}` : "",
    ...forked.warnings.map((w) => `Warning: ${w}`),
    "",
    "Now re-skin it — this is the job, not optional polish:",
    `1. Brand: components/${template}/ usually has a brand/palette/type module — change colours and fonts there once, and every scene forked from this template follows.`,
    `2. Copy and data: replace every string, number, name and logo in ${forked.file} (and the components it pulls them from) with this video's own. Never ship the template's brand, product names, people or logos.`,
    "3. Keep what made it good: the timing, camera moves, easing, blur, grain and glow. Change them only for a reason.",
    "4. Handoffs: match its first and last frames to the neighbouring scenes (colour, position, carrier).",
    "5. Look: capture frames at its start, middle and end, compare with the library filmstrip, and fix anything that reads as the old brand.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}
