import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { and, eq, db, schema } from "@genmotion/db";
import {
  getObjectBuffer,
  listObjects,
  projectFileKey,
  projectFilesPrefix,
  putObject,
} from "@genmotion/storage";

/** Where the project's files are mounted inside the sandbox. */
const WORKDIR = "/home/user/project";
/** Sandbox auto-expires after this idle window (backstop for dispose()). */
const SANDBOX_TIMEOUT_MS = 5 * 60_000;
const OUTPUT_LIMIT = 4_000;

const MEDIA_KIND: Record<string, "image" | "video" | "audio"> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  bmp: "image",
  svg: "image",
  mp4: "video",
  webm: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  aac: "audio",
};

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  json: "application/json",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  pdf: "application/pdf",
};

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const truncate = (s: string) =>
  s.length > OUTPUT_LIMIT ? `${s.slice(0, OUTPUT_LIMIT)}\n…[truncated]` : s;

/** Node Buffer -> ArrayBuffer slice the E2B filesystem API accepts. */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

export interface SandboxToolsContext {
  projectId: string;
  userId: string;
  /** Called after files are synced back so the UI/asset list can refresh. */
  onMutation?: () => void;
}

/**
 * The "workbench": an E2B sandbox seeded with the project's files. The agent
 * runs bash/python in it; any file it creates or changes is synced back to R2
 * under the project so scenes (and the renderer) can use it by URL.
 *
 * The sandbox boots lazily on first use and is reused for the whole turn.
 */
export function createSandboxTools({
  projectId,
  userId,
  onMutation,
}: SandboxToolsContext) {
  let sandboxPromise: Promise<Sandbox> | null = null;
  // Relative path -> byte size of every file currently known in the sandbox,
  // so sync-back only re-uploads new or changed files.
  const manifest = new Map<string, number>();

  async function boot(): Promise<Sandbox> {
    const sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
    await sandbox.commands.run(`mkdir -p ${WORKDIR}`);

    const prefix = projectFilesPrefix(projectId);
    const objects = await listObjects(prefix);
    for (const obj of objects) {
      const rel = obj.key.slice(prefix.length);
      if (!rel) continue; // the folder placeholder itself
      const buf = await getObjectBuffer(obj.key);
      await sandbox.files.write(`${WORKDIR}/${rel}`, toArrayBuffer(buf));
      manifest.set(rel, buf.byteLength);
    }
    return sandbox;
  }

  function getSandbox(): Promise<Sandbox> {
    if (!sandboxPromise) sandboxPromise = boot();
    return sandboxPromise;
  }

  /** Upload files that are new or changed since the last sync back to R2. */
  async function syncBack(
    sandbox: Sandbox,
  ): Promise<Array<{ name: string; url: string }>> {
    const entries = await sandbox.files.list(WORKDIR, { depth: 10 });
    const saved: Array<{ name: string; url: string }> = [];

    for (const entry of entries) {
      if (entry.type !== "file") continue;
      const rel = entry.path.startsWith(`${WORKDIR}/`)
        ? entry.path.slice(WORKDIR.length + 1)
        : entry.name;
      if (manifest.get(rel) === entry.size) continue; // unchanged

      const bytes = await sandbox.files.read(entry.path, { format: "bytes" });
      const buf = Buffer.from(bytes);
      const ext = extOf(rel);
      const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
      const key = projectFileKey(projectId, rel);
      const url = await putObject(key, buf, contentType);
      manifest.set(rel, buf.byteLength);
      saved.push({ name: rel, url });

      // Register media so the agent can <Img>/<Audio>/<Video> it and it shows
      // up in the asset picker. Non-media files just live in R2 (file proxy).
      const kind = MEDIA_KIND[ext];
      if (kind) {
        const filename = rel.split("/").pop() ?? rel;
        const [existing] = await db
          .select({ id: schema.assets.id })
          .from(schema.assets)
          .where(eq(schema.assets.storageKey, key));
        if (existing) {
          await db
            .update(schema.assets)
            .set({ url, sizeBytes: buf.byteLength, status: "ready" })
            .where(eq(schema.assets.id, existing.id));
        } else {
          await db.insert(schema.assets).values({
            userId,
            projectId,
            storageKey: key,
            url,
            kind,
            filename,
            mimeType: contentType,
            sizeBytes: buf.byteLength,
            status: "ready",
          });
        }
      }
    }

    if (saved.length > 0) onMutation?.();
    return saved;
  }

  const workbench = tool({
    description:
      "Run a script in the project's sandbox (the 'workbench'). The project's uploaded files are mounted at /home/user/project — read, transform, or generate files there (resize/convert images, run ffmpeg, generate charts with Pillow/matplotlib, parse data, fetch and process assets, etc.). Any file you create or modify is automatically uploaded to the project and, if it's an image/video/audio, becomes usable in scenes via the returned URL. Choose `bash` for shell tools (ffmpeg, imagemagick, curl, file ops) or `python` for scripting.",
    inputSchema: z.object({
      language: z.enum(["bash", "python"]),
      code: z
        .string()
        .min(1)
        .describe("The command/script to run from /home/user/project"),
    }),
    execute: async ({ language, code }) => {
      try {
        const sandbox = await getSandbox();
        let stdout = "";
        let stderr = "";
        let exitCode = 0;

        if (language === "bash") {
          const res = await sandbox.commands.run(code, {
            cwd: WORKDIR,
            timeoutMs: SANDBOX_TIMEOUT_MS,
          });
          stdout = res.stdout;
          stderr = res.stderr;
          exitCode = res.exitCode;
        } else {
          const exec = await sandbox.runCode(
            `import os as _os; _os.chdir(${JSON.stringify(WORKDIR)})\n${code}`,
          );
          stdout = exec.logs.stdout.join("");
          stderr = exec.logs.stderr.join("");
          if (exec.error) {
            stderr += `\n${exec.error.name}: ${exec.error.value}`;
            exitCode = 1;
          }
        }

        const files = await syncBack(sandbox);
        return {
          ok: exitCode === 0,
          exitCode,
          stdout: truncate(stdout),
          stderr: truncate(stderr),
          // New/changed files now saved to the project, with usable URLs.
          files,
        };
      } catch (err) {
        return {
          ok: false as const,
          error: `Workbench failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });

  async function dispose(): Promise<void> {
    if (!sandboxPromise) return;
    try {
      const sandbox = await sandboxPromise;
      await sandbox.kill();
    } catch {
      // Best-effort; the sandbox auto-expires after SANDBOX_TIMEOUT_MS anyway.
    }
  }

  return { tools: { workbench }, dispose };
}
