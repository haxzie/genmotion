import { tool } from "ai";
import { z } from "zod";
import { eq, db, schema } from "@genmotion/db";
import { projectFileKey, putObject } from "@genmotion/storage";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB
const FETCH_TIMEOUT_MS = 30_000;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/bmp": "bmp",
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

/** Derive a clean filename from the URL path, falling back to a generated one. */
function deriveName(url: string, ext: string): string {
  let base = "";
  try {
    const path = new URL(url).pathname;
    base = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
  } catch {
    /* ignore */
  }
  base = safe(base).replace(/\.[a-zA-Z0-9]+$/, ""); // strip any existing ext
  if (!base) base = `image-${crypto.randomUUID().slice(0, 8)}`;
  return `${base}.${ext}`;
}

export interface AssetToolsContext {
  projectId: string;
  userId: string;
  /** Called after the asset is saved so the UI/asset list can refresh. */
  onMutation?: () => void;
}

/** Tools that pull external media into the project's own storage. */
export function createAssetTools({
  projectId,
  userId,
  onMutation,
}: AssetToolsContext) {
  return {
    saveImageToProject: tool({
      description:
        "Download an external image (a researched brand logo, an icon, or any image URL) and save it into THIS project's storage, returning a stable project URL served from our proxy. Always do this for brand logos from analyzeWebsiteBranding before using them in scenes — never hot-link an external logo URL directly, since those can move, expire, or block the renderer. Use the returned `url` in <Img> and in scene briefs.",
      inputSchema: z.object({
        url: z.url().describe("The external image URL to copy into the project"),
        filename: z
          .string()
          .max(120)
          .optional()
          .describe("Optional name for the saved file, e.g. 'stripe-logo.svg'"),
      }),
      execute: async ({ url, filename }) => {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });
          if (!res.ok) {
            return {
              ok: false as const,
              error: `Could not fetch image (${res.status} ${res.statusText}).`,
            };
          }

          const contentType = (res.headers.get("content-type") ?? "")
            .split(";")[0]!
            .trim()
            .toLowerCase();
          if (contentType && !contentType.startsWith("image/")) {
            return {
              ok: false as const,
              error: `URL is not an image (content-type: ${contentType}).`,
            };
          }

          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.byteLength === 0) {
            return { ok: false as const, error: "Fetched image was empty." };
          }
          if (buffer.byteLength > MAX_IMAGE_BYTES) {
            return {
              ok: false as const,
              error: `Image is too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB, max 25MB).`,
            };
          }

          const mime = contentType || "image/png";
          const ext = EXT_BY_MIME[mime] ?? "png";
          const name = filename ? safe(filename) : deriveName(url, ext);
          const key = projectFileKey(projectId, name);
          const savedUrl = await putObject(key, buffer, mime);

          // Register (or refresh) the asset row so it shows in the picker and
          // scenes can reference it. Dedupe by storage key.
          const [existing] = await db
            .select({ id: schema.assets.id })
            .from(schema.assets)
            .where(eq(schema.assets.storageKey, key));
          if (existing) {
            await db
              .update(schema.assets)
              .set({ url: savedUrl, sizeBytes: buffer.byteLength, status: "ready" })
              .where(eq(schema.assets.id, existing.id));
          } else {
            await db.insert(schema.assets).values({
              userId,
              projectId,
              storageKey: key,
              url: savedUrl,
              kind: "image",
              filename: name,
              mimeType: mime,
              sizeBytes: buffer.byteLength,
              status: "ready",
            });
          }

          onMutation?.();
          return { ok: true as const, url: savedUrl, filename: name };
        } catch (err) {
          return {
            ok: false as const,
            error: `Failed to save image: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      },
    }),
  };
}
