import fs from "node:fs/promises";
import path from "node:path";
import { readSettings, update } from "../settings-store";

/**
 * Which brand each project is being made for.
 *
 * This is app state, not project state, and the distinction is the same one
 * `agent/read-roots.ts` makes at length: a brand is a folder on *this* machine.
 * Recording the attachment in the project's own `project.json` would ship a
 * path, or an id, that means nothing to whoever the folder is shared with or
 * cloned by — at best noise, at worst a video that silently loses its brand
 * and nobody can tell why.
 *
 * It lives in `settings.json` rather than a file of its own, for the reason
 * `skills/store.ts` and `mcp/store.ts` both give: a second file racing the
 * serialised writer would lose whatever the other one wrote. There is no
 * "current brand" either — a brand attaches per project, because the app
 * deliberately has no current project (`session-registry.ts`) and two tabs may
 * be two different companies' videos.
 */

export interface BrandSettings {
  /** Project folder (realpath'd) to brand id. */
  attached?: Record<string, string>;
  /** Brand id to the epoch ms it was last attached, for the "last used" line. */
  lastUsed?: Record<string, number>;
}

/**
 * Keys are symlink-resolved, because a tab opened as `/tmp/promo` and the same
 * project opened as `/private/tmp/promo` are one project — `resolveDir` in the
 * session registry already takes that view, and a second opinion here would
 * mean a brand that disappears depending on which path you arrived by.
 */
async function resolveDir(dir: string): Promise<string> {
  return fs.realpath(path.resolve(dir)).catch(() => path.resolve(dir));
}

async function readBrandSettings(): Promise<BrandSettings> {
  return (await readSettings()).brands ?? {};
}

/** The brand id attached to a project, or null. */
export async function attachedBrandId(projectDir: string): Promise<string | null> {
  const { attached = {} } = await readBrandSettings();
  return attached[await resolveDir(projectDir)] ?? null;
}

/** Attach a brand to a project, or detach with `null`. */
export async function attachBrand(projectDir: string, brandId: string | null): Promise<void> {
  const key = await resolveDir(projectDir);
  await update((settings) => {
    const brands = settings.brands ?? {};
    const attached = { ...(brands.attached ?? {}) };
    const lastUsed = { ...(brands.lastUsed ?? {}) };
    if (brandId === null) delete attached[key];
    else {
      attached[key] = brandId;
      lastUsed[brandId] = Date.now();
    }
    return { ...settings, brands: { ...brands, attached, lastUsed } };
  });
}

/** When each brand was last attached to anything, for the cards. */
export async function lastUsedByBrand(): Promise<Record<string, number>> {
  return (await readBrandSettings()).lastUsed ?? {};
}

/**
 * Drop every trace of a brand that has been deleted.
 *
 * Without this, a project stays attached to an id whose folder is gone, and
 * every turn afterwards hands the agent a read root that does not exist.
 */
export async function forgetBrand(brandId: string): Promise<void> {
  await update((settings) => {
    const brands = settings.brands ?? {};
    const attached = Object.fromEntries(
      Object.entries(brands.attached ?? {}).filter(([, id]) => id !== brandId),
    );
    const lastUsed = { ...(brands.lastUsed ?? {}) };
    delete lastUsed[brandId];
    return { ...settings, brands: { attached, lastUsed } };
  });
}
