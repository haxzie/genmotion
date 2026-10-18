import path from "node:path";
import fs from "node:fs/promises";

/**
 * The one place bytes land inside a project.
 *
 * Every asset writer goes through this: `save_asset` from a URL,
 * `download_x_video`, the three generators, the keysound synthesiser, and
 * `use_brand_asset` out of the attached brand folder. One function means one
 * filename-sanitising rule, one collision loop and one containment check
 * rather than six near-copies, and it is the check that matters — the
 * filename arrives from a model.
 *
 * Its own module rather than living in `agent/tools.ts`, which is where it
 * started: that file reaches the session registry and the export service, so
 * importing it to write a file pulled a whole app's worth of module
 * initialisation along with it.
 */

export async function saveAssetBytes(
  projectDir: string,
  body: Buffer,
  preferred: string,
  fallbackExt: string,
  /**
   * A folder under `assets/` to write into, for files whose origin is worth
   * keeping visible — `brand` for anything taken out of the attached brand,
   * so a later share or remix shows what came from where. Flat `assets/` by
   * default, which is where everything else goes.
   */
  subdir?: string,
): Promise<string> {
  const base = (preferred || "asset").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
  const ext = path.extname(base) || fallbackExt || "";
  const stem = ext ? base.slice(0, base.length - path.extname(base).length) || "asset" : base;
  const dir = subdir ? `assets/${subdir}` : "assets";

  await fs.mkdir(path.join(projectDir, dir), { recursive: true });
  for (let n = 0; n < 200; n++) {
    const rel = `${dir}/${stem}${n === 0 ? "" : `-${n + 1}`}${ext}`;
    const target = path.join(projectDir, rel);
    if (!isInsideProject(projectDir, rel)) throw new Error("Refusing to write outside the project");
    const taken = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    if (taken) continue;
    await fs.writeFile(target, body);
    return rel;
  }
  throw new Error("Could not find a free filename in assets/");
}

/**
 * `saveAssetBytes` into `assets/brand/`, for `use_brand_asset`.
 *
 * Exported rather than re-implemented next door so that a file arriving from
 * the brand folder is named, de-duplicated and contained by exactly the same
 * code as one arriving from a URL or a generator.
 */
export function saveBrandAssetBytes(
  projectDir: string,
  body: Buffer,
  preferred: string,
  fallbackExt: string,
): Promise<string> {
  return saveAssetBytes(projectDir, body, preferred, fallbackExt, "brand");
}

/** Keep writes inside the project folder, whatever the model asks for. */
export function isInsideProject(projectDir: string, candidate: string): boolean {
  const rel = path.relative(projectDir, path.resolve(projectDir, candidate));
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
