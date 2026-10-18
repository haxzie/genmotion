import path from "node:path";
import fs from "node:fs/promises";
import {
  BRAND_DIRS,
  brandManifestSchema,
  type BrandDir,
  type BrandManifest,
  type BrandSummary,
} from "@genmotion/shared";
import type { ProjectSession } from "../project-session";
import {
  BrandError,
  createBrand,
  deleteBrand,
  listBrands,
  normaliseSite,
  readBrand,
  summariseBrand,
  writeBrand,
} from "./manifest";
import type { AcceptedInspection } from "./import";
import { brandDir } from "./paths";
import { syncBrandIntoProject } from "./project-sync";
import { attachBrand, attachedBrandId, forgetBrand, lastUsedByBrand } from "./store";

/**
 * What the Brands screen talks to.
 *
 * The loopback routes are thin on purpose: this is where a brand id becomes a
 * path, where every path out of the renderer is checked, and where the one
 * thing the renderer must not be able to do — name an arbitrary file on the
 * disk and have the app open or serve it — is refused. The renderer is where
 * agent-authored code runs, so the same rule the plugin catalog follows holds
 * here: it names a brand and a file inside that brand, never a URL and never
 * an absolute path.
 */

/** A brand with everything the detail panel needs, in one request. */
export interface BrandDetail extends BrandSummary {
  files: Record<BrandDir, BrandFileView[]>;
}

export interface BrandFileView {
  /** Brand-relative, e.g. `logos/mark.svg`. */
  file: string;
  name: string;
  bytes: number;
}

/* ------------------------------------------------------------------- paths */

const UPLOAD_DIRS = new Set<string>(BRAND_DIRS.map(({ dir }) => dir));

/**
 * Resolve a brand-relative file to an absolute path, or refuse.
 *
 * The one gate every file route goes through. A path is normalised before it
 * is judged, so `logos/../../.ssh/id_rsa` is rejected as what it resolves to
 * rather than waved through as what it was spelled; and the first segment has
 * to be one of the brand's four folders, which keeps `brand.json` and
 * `BRAND.md` from being servable or deletable through the asset routes.
 */
function resolveBrandFile(id: string, file: string): string {
  const rel = path.normalize(file).split(path.sep).join("/");
  const top = rel.split("/")[0];
  if (!top || !UPLOAD_DIRS.has(top)) throw new BrandError("That is not a file in the brand.");
  const dir = brandDir(id);
  const absolute = path.resolve(dir, rel);
  if (path.relative(dir, absolute).startsWith("..")) throw new BrandError("That path is outside the brand.");
  return absolute;
}

/** For the bytes route: the file, once it is known to exist. */
export async function brandAssetPath(id: string, file: string): Promise<string> {
  const absolute = resolveBrandFile(id, file);
  const stat = await fs.stat(absolute);
  if (!stat.isFile()) throw new BrandError("Not a file.");
  return absolute;
}

/* -------------------------------------------------------------------- read */

/**
 * The files in each drawer.
 *
 * Deliberately no URL: the loopback carries a per-launch secret in its path
 * prefix, so a root-relative `/api/brands/...` built here resolves to a 404 in
 * the renderer. The renderer builds its own from `window.__GM_API_URL__` —
 * see `brandAssetUrl`. A URL that was wrong in a way only visible as a blank
 * tile is exactly the kind of thing to not have two sources for.
 */
async function filesIn(id: string): Promise<Record<BrandDir, BrandFileView[]>> {
  const dir = brandDir(id);
  const out = {} as Record<BrandDir, BrandFileView[]>;
  await Promise.all(
    BRAND_DIRS.map(async ({ dir: sub }) => {
      const entries = await fs.readdir(path.join(dir, sub), { withFileTypes: true }).catch(() => []);
      const views: BrandFileView[] = [];
      for (const entry of entries) {
        if (!entry.isFile() || entry.name.startsWith(".")) continue;
        const stat = await fs.stat(path.join(dir, sub, entry.name)).catch(() => null);
        if (!stat) continue;
        const file = `${sub}/${entry.name}`;
        views.push({ file, name: entry.name, bytes: stat.size });
      }
      out[sub] = views.sort((a, b) => a.name.localeCompare(b.name));
    }),
  );
  return out;
}

export async function listBrandsForUi(): Promise<BrandSummary[]> {
  const brands = await listBrands(await lastUsedByBrand());
  // Most recently used first, then alphabetical: the brand someone is working
  // on this week is the one they are looking for, and a brand never used yet
  // should not be buried by one from months ago.
  return brands.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name));
}

export async function readBrandForUi(id: string): Promise<BrandDetail> {
  const lastUsed = await lastUsedByBrand();
  const summary = await summariseBrand(id, lastUsed[id]);
  return { ...summary, files: await filesIn(id) };
}

/* ------------------------------------------------------------------- write */

export async function createBrandForUi(input: {
  name?: string;
  site?: string;
  description?: string;
  thirdParty?: boolean;
  /**
   * What the user ticked in the import dialog, applied in the same call.
   *
   * One request rather than create-then-patch: a half-made brand left behind
   * by a failure between the two is a folder with a name and nothing else,
   * which looks to the list exactly like a finished one.
   */
  accepted?: AcceptedInspection;
}): Promise<BrandDetail> {
  const brand = await createBrand({
    name: (input.name ?? "").trim(),
    ...(input.site ? { site: input.site } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.thirdParty === undefined ? {} : { thirdParty: input.thirdParty }),
  });
  if (input.accepted) {
    const { applyInspection } = await import("./import");
    // Best-effort: a logo that will not download must not lose the brand that
    // was otherwise built correctly.
    await applyInspection(brand.id, input.accepted).catch(() => {});
  }
  return readBrandForUi(brand.id);
}

/**
 * The editable fields, merged over what is on disk.
 *
 * `id`, `createdAt` and `updatedAt` are not among them: the id is the folder
 * name, and renaming a folder under a project that is attached to it is a
 * different operation from editing a brand. The display `name` is free to
 * change without the folder moving.
 */
type BrandPatch = Partial<
  Pick<BrandManifest, "name" | "site" | "description" | "colors" | "fonts" | "logos" | "voice" | "thirdParty">
>;

export async function updateBrandForUi(id: string, patch: BrandPatch): Promise<BrandDetail> {
  const current = await readBrand(id);
  // Parsed rather than spread straight in: this arrives from the renderer, and
  // the schema is what keeps a hand-typed hex or a path with `..` in it out of
  // the file the agent is about to be handed.
  const next = brandManifestSchema.parse({
    ...current,
    ...patch,
    // `acme.com` is what somebody types; the schema wants a URL. Also clears
    // the field when it is emptied, rather than failing on "".
    ...("site" in patch ? { site: normaliseSite(patch.site) } : {}),
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  });
  await writeBrand(next);
  await resyncOpenProjects(next);
  return readBrandForUi(id);
}

export async function deleteBrandForUi(id: string): Promise<{ ok: true }> {
  await deleteBrand(id);
  // Before the folder is forgotten, not after: a project left pointing at a
  // deleted brand hands the agent a read root that does not exist on every
  // turn from then on.
  await forgetBrand(id);
  return { ok: true };
}

/* ------------------------------------------------------------------ assets */

export async function prepareBrandUpload(
  id: string,
  dir: string,
  filename: string,
): Promise<{ absolute: string; relative: string }> {
  if (!UPLOAD_DIRS.has(dir)) throw new BrandError(`Cannot upload into "${dir}".`);
  const safe = path.basename(filename).replace(/[^\w.\- ]+/g, "_") || "file";
  const root = brandDir(id);
  await fs.mkdir(path.join(root, dir), { recursive: true });

  const ext = path.extname(safe);
  const stem = safe.slice(0, safe.length - ext.length) || "file";
  for (let n = 0; n < 200; n++) {
    const relative = `${dir}/${stem}${n === 0 ? "" : `-${n + 1}`}${ext}`;
    const absolute = resolveBrandFile(id, relative);
    const taken = await fs
      .access(absolute)
      .then(() => true)
      .catch(() => false);
    if (!taken) return { absolute, relative };
  }
  throw new BrandError(`Could not find a free filename in ${dir}/.`);
}

/**
 * After the bytes have landed.
 *
 * A logo dropped into `logos/` registers itself in the manifest, because a
 * file the manifest does not mention is a file the agent is never told about
 * and `components/brand.ts` never points at — which would make the drag-and-
 * drop look broken in the only way that matters.
 */
export async function finishBrandUpload(id: string, relative: string): Promise<BrandDetail> {
  if (relative.startsWith("logos/")) {
    const current = await readBrand(id);
    if (!current.logos.some((l) => l.file === relative)) {
      await writeBrand(
        brandManifestSchema.parse({
          ...current,
          logos: [...current.logos, { file: relative, variant: "mark", on: "any", source: "user" }],
        }),
      );
    }
  }
  const brand = await readBrand(id).catch(() => null);
  if (brand) await resyncOpenProjects(brand);
  return readBrandForUi(id);
}

export async function deleteBrandAsset(id: string, file: string): Promise<BrandDetail> {
  const absolute = resolveBrandFile(id, file);
  await fs.rm(absolute, { force: true });
  // And out of the manifest, or `components/brand.ts` keeps pointing at it.
  const current = await readBrand(id);
  const logos = current.logos.filter((l) => l.file !== file);
  // A family keeps its name when one of its weights is deleted: the name alone
  // is still usable, and dropping the family would lose the other files too.
  const fonts = current.fonts.map((f) => ({ ...f, files: f.files.filter((x) => x.file !== file) }));
  const changed =
    logos.length !== current.logos.length ||
    fonts.some((f, i) => f.files.length !== current.fonts[i]?.files.length);
  if (changed) await writeBrand(brandManifestSchema.parse({ ...current, logos, fonts }));
  const brand = await readBrand(id).catch(() => null);
  if (brand) await resyncOpenProjects(brand);
  return readBrandForUi(id);
}

/** Open the brand folder in Finder. The renderer names a brand, never a path. */
export async function revealBrand(id: string): Promise<{ ok: true }> {
  const dir = brandDir(id);
  const { shell } = await import("electron");
  shell.openPath(dir);
  return { ok: true };
}

/* ------------------------------------------------------------------ attach */

export interface AttachedBrandState {
  /** Null when the project has no brand. */
  brand: BrandSummary | null;
  /** `components/brand.ts` was the project's own, so it was left alone. */
  moduleSkipped?: boolean;
}

/**
 * Attach a brand to an open project, or detach with `null`.
 *
 * The sync runs here as well as on every turn, so the editor's code view shows
 * `components/brand.ts` the moment the brand is picked rather than after the
 * next message.
 */
export async function attachBrandToProject(
  session: ProjectSession,
  brandId: string | null,
): Promise<AttachedBrandState> {
  await attachBrand(session.dir, brandId);
  if (!brandId) return { brand: null };
  const brand = await readBrand(brandId);
  const sync = await syncBrandIntoProject(session.dir, brand, session.engine).catch(() => null);
  return {
    brand: await summariseBrand(brandId, Date.now()),
    ...(sync?.moduleSkipped ? { moduleSkipped: true } : {}),
  };
}

/** Which brand this project is being made for, for the composer's chip. */
export async function attachedBrandForProject(projectDir: string): Promise<AttachedBrandState> {
  const id = await attachedBrandId(projectDir);
  if (!id) return { brand: null };
  const brand = await summariseBrand(id).catch(() => null);
  return { brand };
}

/**
 * Push an edited brand into every project that is using it, now.
 *
 * Without this, changing a hex in the Brands tab shows up in an open project
 * only on its next turn, and the preview beside the chat keeps the old colour
 * — which reads as the edit not having worked.
 */
async function resyncOpenProjects(brand: BrandManifest): Promise<void> {
  const { listSessions } = await import("../session-registry");
  for (const session of listSessions()) {
    const attached = await attachedBrandId(session.dir).catch(() => null);
    if (attached !== brand.id) continue;
    await syncBrandIntoProject(session.dir, brand, session.engine).catch(() => {});
  }
}

/* ------------------------------------------------------------------ import */

export { inspectSite } from "./import";
export type { AcceptedInspection } from "./import";
