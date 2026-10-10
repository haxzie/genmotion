import path from "node:path";
import fs from "node:fs/promises";

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const ASSET_TYPES = /^(image|audio|video|font|model)\/|^application\/(octet-stream|json)$/;

export interface SavedAsset {
  /** Project-relative, e.g. `assets/music.mp3`. */
  path: string;
  bytes: number;
  contentType: string;
}

/**
 * Downloads a remote file into the project's `assets/` folder. Scenes must
 * never hot-link a URL (the render has no network guarantee), so anything
 * remote comes through here first: `save_asset` and `audio add <url>`.
 */
export async function downloadAsset(
  projectDir: string,
  url: string,
  filename?: string,
  /**
   * Both raised only by `x-video`, which fetches a whole video the user asked
   * for by name: a 1080p X clip is routinely 90MB, which is over the ceiling
   * where a file that size would be a mistake and over the time an image is
   * allowed to take.
   */
  { maxBytes = MAX_ASSET_BYTES, timeoutMs = 60_000 }: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<SavedAsset> {
  const limit = `${Math.round(maxBytes / 1e6)}MB`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "genmotion-cli" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const type = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0]!.trim();
  if (!ASSET_TYPES.test(type)) throw new Error(`${url} is ${type}, not an image, audio, video, font or model`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error(`${url} is ${Math.round(declared / 1e6)}MB — the limit is ${limit}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error(`${url} is over the ${limit} limit`);
  const fromUrl = path.basename(new URL(url).pathname) || "asset";
  const name = (filename ?? fromUrl).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "") || "asset";
  const file = path.join(projectDir, "assets", name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return { path: `assets/${name}`, bytes: bytes.byteLength, contentType: type };
}
