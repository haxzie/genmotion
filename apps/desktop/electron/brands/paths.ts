import path from "node:path";
import { app } from "electron";
import { BRAND_ID_PATTERN } from "@genmotion/shared";

/**
 * Where brands live.
 *
 * Beside `~/.genmotion/projects` rather than inside Electron's `userData`, and
 * for the same reason that folder is there: a brand is the user's own material.
 * Dropping a logo into it should be something they can do in Finder, and the
 * folder should be somewhere they can find, back up, and point their own tools
 * at. `userData` is where *app state* goes — which attachment belongs to which
 * project, and that does live there.
 *
 * `GM_BRANDS_ROOT` points it elsewhere for tests, matching `GM_PROJECTS_ROOT`
 * and `GM_TEMPLATES_DIR`. `app.getPath("home")` rather than `os.homedir()`
 * because on macOS the latter does not follow `$HOME`, which a test needs.
 */
export function brandsRoot(): string {
  return process.env.GM_BRANDS_ROOT ?? path.join(app.getPath("home"), ".genmotion", "brands");
}

/**
 * The folder for one brand, with the id checked first.
 *
 * Every route takes the id from a URL, so this is the choke point: an id that
 * is not a plain slug never becomes a path at all. Checking the pattern is
 * what makes the `path.join` below safe, rather than a containment check
 * afterwards that someone later forgets to copy.
 */
export function brandDir(id: string): string {
  if (!BRAND_ID_PATTERN.test(id)) throw new Error(`Not a brand id: ${id}`);
  return path.join(brandsRoot(), id);
}

/**
 * A filesystem-safe brand id for `name`, suffixed if it is taken.
 *
 * Mirrors `allocateProjectDir`: naming a brand should not involve thinking
 * about folders.
 */
export function brandIdFor(name: string, taken: readonly string[]): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "brand";
  if (!taken.includes(slug)) return slug;
  for (let n = 2; n < 500; n++) {
    const candidate = `${slug}-${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

/** A brand's own skills, which travel with the brand rather than the project. */
export function brandSkillsRoot(id: string): string {
  return path.join(brandDir(id), "skills");
}
