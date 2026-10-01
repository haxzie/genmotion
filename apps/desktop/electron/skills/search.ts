import type { ResolvedSkillRequirement, SkillCatalogEntry } from "@genmotion/shared";
import { searchSkills, type SkillHit } from "@genmotion/skills/search";
import { availableOn } from "@genmotion/skills/capabilities";
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

async function resolveRequirements(entry: SkillCatalogEntry, engine?: string): Promise<ResolvedSkillRequirement[]> {
  const servers = await mcpManager.list().catch(() => []);
  const catalog = await loadCatalog();
  // A skill requirement scoped to other engines (`three-camera` on a
  // HyperFrames project) is not this project's to load.
  const applies = entry.requires.filter(
    (req) => req.kind !== "skill" || !req.engines || !engine || (req.engines as readonly string[]).includes(engine),
  );
  return applies.map((req) => {
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
      // Every capability the pack names has a desktop tool (the paid
      // generators report their own refusal); an old-style tool name is
      // resolved to its capability first.
      installed: availableOn(req, "desktop"),
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
    // No baked skill vectors, nothing to compare a query vector against:
    // don't spend a network round trip on one.
    queryVector: embeddings ? await embedQuery(opts.query) : undefined,
    kind: opts.kind as never,
    engine: opts.engine,
    limit: opts.limit ?? 5,
  });

  return Promise.all(
    hits.map(async (hit) => ({
      ...hit,
      path: await skillPath(hit.entry.id, opts.projectDir, opts.engine),
      requirements: await resolveRequirements(hit.entry, opts.engine),
    })),
  );
}
