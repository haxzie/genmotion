import { generateText } from "ai";
import { sceneModel } from "./models";
import { SCENE_WRITER_PROMPT } from "./system-prompt";

const MAX_ATTEMPTS = 3;

/**
 * Hard cap per model attempt. These subagents run several-at-a-time via
 * Promise.all in the createScenes tool; without a timeout a single stalled
 * Moonshot request (rate-limit/latency) would hang the whole tool call — and
 * therefore the entire chat stream — indefinitely. On timeout the attempt is
 * counted as a failure and retried, then surfaced as a normal tool error.
 */
const WRITE_TIMEOUT_MS = Number(process.env.SCENE_WRITE_TIMEOUT_MS ?? 90_000);

export interface SceneBrief {
  name: string;
  durationInFrames: number;
  brief: string;
}

export interface ProjectConfig {
  fps: number;
  width: number;
  height: number;
}

export type SceneWriteResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/** Strip markdown fences in case the model wraps its code despite instructions. */
function extractCode(text: string): string {
  const fenced = text.match(/```(?:tsx|typescript|jsx|ts|js)?\n([\s\S]*?)```/);
  return (fenced ? fenced[1]! : text).trim();
}

/**
 * One scene-writer subagent: brief in, validated TSX out. Compile errors are
 * fed back to the same writer for up to MAX_ATTEMPTS self-corrections. Run
 * several of these concurrently to write multi-scene requests in parallel.
 *
 * `review` returns non-blocking advisories (e.g. text motion that should use
 * the library instead of being hand-rolled). A scene that validates but draws
 * advisories gets ONE polish pass; if the polished version fails validation,
 * the already-good original is kept. Advisories can never lose a working scene.
 */
export async function writeScene(
  request: SceneBrief,
  project: ProjectConfig,
  validate: (code: string) => Promise<string | null>,
  review?: (code: string) => string[],
): Promise<SceneWriteResult> {
  const userPrompt = [
    `Composition: ${project.width}×${project.height} @ ${project.fps}fps.`,
    `Scene name: ${request.name}`,
    `Duration: ${request.durationInFrames} frames (${(request.durationInFrames / project.fps).toFixed(1)}s).`,
    ``,
    `Brief:`,
    request.brief,
  ].join("\n");

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: userPrompt },
  ];

  let lastError = "unknown error";
  // A scene that has already passed validation. Held so a polish pass that
  // goes wrong falls back to it instead of failing the whole write.
  let accepted: string | null = null;
  let polished = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    console.log(
      `[scene-writer] "${request.name}" attempt ${attempt + 1}/${MAX_ATTEMPTS} start`,
    );
    let text: string;
    try {
      ({ text } = await generateText({
        model: sceneModel(),
        system: SCENE_WRITER_PROMPT,
        messages,
        // Backstop so a stalled request can't hang the stream forever.
        abortSignal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
      }));
    } catch (err) {
      // Model/API error (rate limit, timeout/abort, etc.): count it as a failed
      // attempt and retry rather than throwing out of the tool.
      lastError = `model request failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(
        `[scene-writer] "${request.name}" attempt ${attempt + 1} failed after ${Date.now() - startedAt}ms: ${lastError}`,
      );
      continue;
    }
    console.log(
      `[scene-writer] "${request.name}" attempt ${attempt + 1} model returned in ${Date.now() - startedAt}ms (${text.length} chars)`,
    );

    const code = extractCode(text);
    const error = await validate(code);
    if (!error) {
      const notes = review?.(code) ?? [];
      if (notes.length === 0 || polished || attempt === MAX_ATTEMPTS - 1) {
        console.log(`[scene-writer] "${request.name}" ok on attempt ${attempt + 1}`);
        return { ok: true, code };
      }

      // Valid, but it hand-rolled something the library covers. Spend one
      // attempt improving it, keeping this version as the fallback.
      console.log(
        `[scene-writer] "${request.name}" valid on attempt ${attempt + 1}, polishing (${notes.length} note(s))`,
      );
      accepted = code;
      polished = true;
      messages.push(
        { role: "assistant", content: text },
        {
          role: "user",
          content: `Your scene works, but it can be simplified:\n\n${notes.map((n) => `- ${n}`).join("\n\n")}\n\nReply with the revised complete TSX module (code only, no fences). Keep the timing, layout and copy exactly as they are — change only what the notes call out.`,
        },
      );
      continue;
    }

    // A failed polish attempt must never throw away a scene that already works.
    if (accepted) {
      console.warn(
        `[scene-writer] "${request.name}" polish attempt failed validation, keeping the original`,
      );
      return { ok: true, code: accepted };
    }

    console.warn(
      `[scene-writer] "${request.name}" attempt ${attempt + 1} failed validation, retrying`,
    );
    lastError = error;
    messages.push(
      { role: "assistant", content: text },
      {
        role: "user",
        content: `Your scene failed validation:\n\n${error}\n\nReply with the corrected complete TSX module (code only, no fences).`,
      },
    );
  }

  // Ran out of attempts mid-polish — the pre-polish version is still good.
  if (accepted) return { ok: true, code: accepted };

  return {
    ok: false,
    error: `Scene "${request.name}" failed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}`,
  };
}
