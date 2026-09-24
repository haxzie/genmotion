import type { ResolvedSkillRequirement, SkillCatalogEntry } from "@genmotion/shared";
import { searchSkills, type SkillHit } from "@genmotion/skills/search";
import { cloudFetch } from "../auth";
import { mcpManager } from "../mcp/manager";
import { loadCatalog, skillPath } from "./catalog";

/**
 * Finding the skill that owns a request.
 *
 * Ranking is `@genmotion/skills/search` — BM25 always, cosine when a query
 * vector is available, fused. The vector comes from the API, because the
 * embeddings are baked into the pack at build time but the query is not, and
 * nobody's machine holds a key. That call is allowed to fail: keyword search
 * alone is the floor, and an agent that cannot search because the wifi is off
 * would be worse than one that searches slightly less well.
 *
 * On top of ranking this resolves each hit's requirements against the MCP
 * servers this machine actually has, which is what lets the agent say "this
 * wants ElevenLabs and you have not got it" instead of silently degrading.
 */

const GENMOTION_TOOLS = new Set([
  "project_overview",
  "validate_composition",
  "capture_frames",
  "save_asset",
  "generate_image",
  "generate_voiceover",
  "generate_sfx",
  "pick_voice",
  "search_skills",
  "recommend_integration",
]);

/** Query vectors, by query string. Identical queries inside a session are common. */
const vectors = new Map<string, Float32Array | null>();

async function embedQuery(query: string): Promise<Float32Array | undefined> {
  const key = query.trim().toLowerCase();
  if (!vectors.has(key)) {
    const vector = await cloudFetch("/api/skills/embed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: key }),
      signal: AbortSignal.timeout(2500),
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ vector: string }>) : null))
      .then((body) => (body ? new Float32Array(Buffer.from(body.vector, "base64").buffer) : null))
      .catch(() => null);
    vectors.set(key, vector);
  }
  return vectors.get(key) ?? undefined;
}

async function resolveRequirements(entry: SkillCatalogEntry): Promise<ResolvedSkillRequirement[]> {
  const servers = await mcpManager.list().catch(() => []);
  const catalog = await loadCatalog();
  return entry.requires.map((req) => {
    if (req.kind === "mcp") {
      const server = servers.find((s) => s.catalogId === req.id || s.id === req.id);
      return {
        kind: req.kind,
        id: req.id,
        label: server?.name ?? req.id,
        why: req.why,
        installed: Boolean(server?.enabled),
        status: server?.status,
      };
    }
    if (req.kind === "skill") {
      return {
        kind: req.kind,
        id: req.id,
        label: catalog.entries.find((e) => e.id === req.id)?.title ?? req.id,
        installed: true,
      };
    }
    return {
      kind: req.kind,
      id: req.id,
      label: req.id,
      why: req.why,
      // A built-in tool is always there. A capability either is (ffmpeg ships
      // with the app) or is a paid generator that reports its own refusal.
      installed: req.kind !== "tool" || GENMOTION_TOOLS.has(req.id),
    };
  });
}

export interface SkillSearchHit extends SkillHit {
  /** Absolute path to the skill folder, so Codex can read SKILL.md directly. */
  path: string | null;
  requirements: ResolvedSkillRequirement[];
}

export async function findSkills(opts: {
  query: string;
  limit?: number;
  kind?: string;
  projectDir?: string;
  engine?: string;
}): Promise<SkillSearchHit[]> {
  const { entries, embeddings } = await loadCatalog(opts.projectDir);
  const hits = searchSkills({
    query: opts.query,
    entries,
    embeddings: embeddings ?? undefined,
    queryVector: await embedQuery(opts.query),
    kind: opts.kind as never,
    engine: opts.engine,
    limit: opts.limit ?? 5,
  });

  return Promise.all(
    hits.map(async (hit) => ({
      ...hit,
      path: await skillPath(hit.entry.id, opts.projectDir, opts.engine),
      requirements: await resolveRequirements(hit.entry),
    })),
  );
}
