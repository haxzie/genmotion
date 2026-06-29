import { generateText } from "ai";
import { chatModel } from "./models";
import { SCENE_WRITER_PROMPT } from "./system-prompt";

const MAX_ATTEMPTS = 3;

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
 */
export async function writeScene(
  request: SceneBrief,
  project: ProjectConfig,
  validate: (code: string) => Promise<string | null>,
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
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let text: string;
    try {
      ({ text } = await generateText({
        model: chatModel(),
        system: SCENE_WRITER_PROMPT,
        messages,
      }));
    } catch (err) {
      // Model/API error (rate limit, timeout, etc.): count it as a failed
      // attempt and retry rather than throwing out of the tool.
      lastError = `model request failed: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }

    const code = extractCode(text);
    const error = await validate(code);
    if (!error) return { ok: true, code };

    lastError = error;
    messages.push(
      { role: "assistant", content: text },
      {
        role: "user",
        content: `Your scene failed validation:\n\n${error}\n\nReply with the corrected complete TSX module (code only, no fences).`,
      },
    );
  }

  return {
    ok: false,
    error: `Scene "${request.name}" failed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}`,
  };
}
