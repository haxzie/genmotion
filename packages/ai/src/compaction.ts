import { generateText } from "ai";
import { and, asc, desc, eq, gt, lt, db, schema } from "@genmotion/db";
import { chatModel } from "./models";

export const COMPACT_PROMPT = `You compress an AI motion-design assistant's conversation into a dense hand-off summary, so a fresh agent can continue the project without re-reading the old messages.

You are given the PRIOR SUMMARY (already-compacted earlier history, may be empty) and the TRANSCRIPT of messages since then. Produce ONE consolidated summary that supersedes both.

Preserve everything that still matters for continuing the work:
- The video's concept, narrative arc, target length, and tone.
- Brand / style decisions: exact hex colors, fonts, light/dark mode, logo URLs, saved asset URLs, signature motifs.
- Scenes that exist and their purpose (names and the role each plays). Do NOT include scene source code — the current code is always supplied separately.
- Voiceover / audio decisions (voice, pacing, which scenes are narrated).
- Standing user preferences, constraints, and any explicit instructions or corrections the user gave.
- Open threads: anything requested but not yet done.

Drop: raw code, tool call mechanics, retries, transient errors that were resolved, and pleasantries.

Write tight prose or terse bullet points. Be specific (real values, names, URLs), not generic. No preamble — output only the summary.`;

interface PartLike {
  type?: string;
  text?: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

/** Render a persisted message's parts into a compact line for the summarizer. */
function partsToText(role: string, parts: unknown): string {
  const list = Array.isArray(parts) ? (parts as PartLike[]) : [];
  const chunks: string[] = [];
  for (const part of list) {
    const type = part?.type ?? "";
    if (type === "text" && typeof part.text === "string") {
      chunks.push(part.text);
    } else if (type.startsWith("tool-") || type === "dynamic-tool") {
      const name = type.replace(/^tool-/, "");
      // Keep only lightweight identifying fields — never the full code payloads.
      const input = part.input ?? {};
      const hint =
        (input.name as string) ??
        (Array.isArray(input.scenes)
          ? (input.scenes as Array<{ name?: string }>)
              .map((s) => s?.name)
              .filter(Boolean)
              .join(", ")
          : undefined) ??
        (input.url as string) ??
        (input.query as string) ??
        "";
      chunks.push(`[called ${name}${hint ? `: ${hint}` : ""}]`);
    }
  }
  const body = chunks.join("\n").trim();
  return body ? `${role.toUpperCase()}: ${body}` : "";
}

/** The active compaction for a project, or null if none yet. */
export async function loadLatestCompaction(projectId: string) {
  const [row] = await db
    .select()
    .from(schema.chatCompactions)
    .where(eq(schema.chatCompactions.projectId, projectId))
    .orderBy(desc(schema.chatCompactions.createdAt))
    .limit(1);
  return row ?? null;
}

export interface CompactionResult {
  ok: boolean;
  /** The new summary, or the existing one when there was nothing new to fold in. */
  summary: string;
  /** True when a new compaction row was written. */
  created: boolean;
}

/**
 * Roll the conversation into a single fresh summary. Summarizes
 * (latest summary, if any) + (messages after it, EXCLUDING the most recent
 * user message — that's the new task we're keeping live) and writes a new
 * compaction row dated just before that user message, so it stays in the
 * live window.
 */
export async function runCompaction(projectId: string): Promise<CompactionResult> {
  const prior = await loadLatestCompaction(projectId);

  // The most recent user message is the new task — it anchors the boundary and
  // is excluded from the summary so it remains visible after compaction.
  const [boundary] = await db
    .select({
      id: schema.chatMessages.id,
      createdAt: schema.chatMessages.createdAt,
    })
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.projectId, projectId),
        eq(schema.chatMessages.role, "user"),
      ),
    )
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(1);

  if (!boundary) {
    return { ok: true, summary: prior?.summary ?? "", created: false };
  }

  const rows = await db
    .select({
      role: schema.chatMessages.role,
      parts: schema.chatMessages.parts,
    })
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.projectId, projectId),
        lt(schema.chatMessages.createdAt, boundary.createdAt),
        prior
          ? gt(schema.chatMessages.createdAt, prior.createdAt)
          : undefined,
      ),
    )
    .orderBy(asc(schema.chatMessages.createdAt));

  const transcript = rows
    .map((r) => partsToText(r.role, r.parts))
    .filter(Boolean)
    .join("\n\n");

  // Nothing new to fold in — keep the existing summary (the agent may have
  // mis-fired the tool). Don't write a redundant row.
  if (!transcript && !prior) {
    return { ok: true, summary: "", created: false };
  }
  if (!transcript) {
    return { ok: true, summary: prior!.summary, created: false };
  }

  const promptParts = [
    prior ? `PRIOR SUMMARY:\n${prior.summary}` : "PRIOR SUMMARY:\n(none)",
    `TRANSCRIPT:\n${transcript}`,
  ];

  const { text } = await generateText({
    model: chatModel(),
    system: COMPACT_PROMPT,
    prompt: promptParts.join("\n\n"),
  });
  const summary = text.trim();
  if (!summary) {
    return { ok: false, summary: prior?.summary ?? "", created: false };
  }

  // Date it just before the boundary user message so that message (and the
  // assistant's reply this turn) remain in the live window.
  const createdAt = new Date(boundary.createdAt.getTime() - 1);
  await db
    .insert(schema.chatCompactions)
    .values({ projectId, summary, createdAt });

  return { ok: true, summary, created: true };
}
