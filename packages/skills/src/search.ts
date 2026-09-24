import { skillSearchText, type SkillCatalogEntry, type SkillKind } from "@genmotion/shared";

/**
 * Finding the skill that owns a request.
 *
 * Two rankers, fused. BM25 over the skill's own words is the floor: it needs
 * no key, no network and no build step, so search works for a signed-out user
 * with the wifi off. Cosine over baked embeddings is the improvement layered
 * on top, and it is what makes "something punchy for tiktok" reach a skill
 * whose text never says "punchy".
 *
 * They are combined with reciprocal rank fusion rather than a weighted score:
 * there is no normalisation to tune, and when one list is missing the result
 * is exactly the other list. That is the whole offline story.
 *
 * Pure and dependency-free on purpose — it runs in the Electron main process,
 * in the package's tests, and could run in the renderer unchanged.
 */

export interface SkillHit {
  entry: SkillCatalogEntry;
  score: number;
  /** Which rankers placed it, for debugging a surprising result. */
  from: ("keyword" | "semantic")[];
}

/** `dist/embeddings.json` — base64 Float32 vectors, several per skill. */
export interface SkillEmbeddings {
  model: string;
  dims: number;
  /** FNV over every embedded string, so a stale file is caught in CI. */
  sourceHash: string;
  /** id → the skill's vectors: one for its text, then one per trigger. */
  vectors: Record<string, string[]>;
}

const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how", "i", "in", "is", "it", "its",
  "me", "my", "of", "on", "or", "our", "that", "the", "this", "to", "we", "with", "you", "your", "make",
  "want", "need", "please", "can", "could", "would", "should", "do", "does", "get", "give",
]);

/** Lowercase word tokens, stopwords dropped, `9:16` kept as `9`+`16`. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * Okapi BM25 over the catalog.
 *
 * The corpus is a few dozen short documents, so this is a full scan with no
 * index: building one would cost more than the scan it saves.
 */
export function bm25Scores(query: string, entries: readonly SkillCatalogEntry[]): Map<string, number> {
  const k1 = 1.4;
  const b = 0.72;
  const docs = entries.map((e) => tokenize(skillSearchText(e)));
  const lengths = docs.map((d) => d.length);
  const avgLen = lengths.reduce((n, l) => n + l, 0) / Math.max(1, lengths.length);

  const termCounts = docs.map((doc) => {
    const counts = new Map<string, number>();
    for (const token of doc) counts.set(token, (counts.get(token) ?? 0) + 1);
    return counts;
  });

  const scores = new Map<string, number>();
  const terms = new Set(tokenize(query));
  for (const term of terms) {
    let withTerm = 0;
    for (const counts of termCounts) if (counts.has(term)) withTerm++;
    if (withTerm === 0) continue;
    const idf = Math.log(1 + (entries.length - withTerm + 0.5) / (withTerm + 0.5));

    entries.forEach((entry, i) => {
      const tf = termCounts[i]?.get(term) ?? 0;
      if (tf === 0) return;
      const len = lengths[i] ?? 0;
      const score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * len) / Math.max(1, avgLen))));
      scores.set(entry.id, (scores.get(entry.id) ?? 0) + score);
    });
  }
  return scores;
}

/** Decode the base64 Float32 vectors one skill carries. */
export function decodeVectors(encoded: readonly string[]): Float32Array[] {
  return encoded.map((b64) => {
    const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  });
}

/** Cosine similarity. Vectors from the embedding API arrive normalised already. */
export function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Cosine per skill, max-pooled over its vectors.
 *
 * Max rather than mean because the trigger vectors are the point: a skill
 * whose ten triggers cover ten different phrasings should win on the one that
 * matches, not be dragged down by the nine that don't.
 */
function semanticScores(
  query: Float32Array,
  entries: readonly SkillCatalogEntry[],
  embeddings: SkillEmbeddings,
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const entry of entries) {
    const encoded = embeddings.vectors[entry.id];
    if (!encoded?.length) continue;
    let best = -1;
    for (const vector of decodeVectors(encoded)) best = Math.max(best, cosine(query, vector));
    if (best > 0) scores.set(entry.id, best);
  }
  return scores;
}

/** Reciprocal rank fusion. 60 is the constant the method is usually cited with. */
function fuse(lists: Map<string, number>[]): Map<string, number> {
  const fused = new Map<string, number>();
  for (const list of lists) {
    const ranked = [...list.entries()].sort((a, b) => b[1] - a[1]);
    ranked.forEach(([id], rank) => fused.set(id, (fused.get(id) ?? 0) + 1 / (60 + rank)));
  }
  return fused;
}

export interface SearchOptions {
  query: string;
  entries: readonly SkillCatalogEntry[];
  /** Absent when the embedding call failed or was never made. */
  queryVector?: Float32Array;
  embeddings?: SkillEmbeddings;
  kind?: SkillKind;
  engine?: string;
  limit?: number;
}

export function searchSkills({
  query,
  entries,
  queryVector,
  embeddings,
  kind,
  engine,
  limit = 5,
}: SearchOptions): SkillHit[] {
  const pool = entries.filter(
    (e) => (!kind || e.kind === kind) && (!engine || e.engines.includes(engine as never)),
  );
  if (pool.length === 0) return [];

  const keyword = bm25Scores(query, pool);
  const semantic = queryVector && embeddings ? semanticScores(queryVector, pool, embeddings) : new Map<string, number>();

  // Nothing matched either way: a caller asking "what have you got" deserves
  // an answer, so fall back to the catalog's own order rather than nothing.
  if (keyword.size === 0 && semantic.size === 0) {
    return pool.slice(0, limit).map((entry) => ({ entry, score: 0, from: [] }));
  }

  const fused = fuse([keyword, semantic].filter((m) => m.size > 0));
  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .flatMap(([id, score]) => {
      const entry = pool.find((e) => e.id === id);
      if (!entry) return [];
      const from: ("keyword" | "semantic")[] = [];
      if (keyword.has(id)) from.push("keyword");
      if (semantic.has(id)) from.push("semantic");
      return [{ entry, score, from }];
    });
}
