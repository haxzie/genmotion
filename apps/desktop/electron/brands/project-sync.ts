import path from "node:path";
import fs from "node:fs/promises";
import type { BrandManifest } from "@genmotion/shared";
import type { ProjectEngine } from "@genmotion/project";
import { brandDir } from "./paths";

/**
 * Put the attached brand *into* the project, before the agent's first turn.
 *
 * This is the part that makes the feature worth building rather than a filing
 * cabinet. The desktop system prompt already tells the agent that a brand's
 * identity is law and that `components/brand.ts` is where a video re-skins
 * from — and 26 templates follow that convention by hand — but nothing has
 * ever written that file. So the agent's options were to ask, or to guess.
 *
 * Attaching a brand writes it: the palette, the type and the real logo paths,
 * in the shape the templates already use. The opening turn of "a 20s feature
 * announcement" then finds the tokens sitting in the file its own instructions
 * name, and comes back on-brand without a question or a tool call.
 *
 * Two deliberate limits:
 *
 * - **Only logos are copied in.** They are small, there are few, and "use the
 *   real file" is a rule the agent cannot follow if the file is across a
 *   boundary it may not write through. Fonts, references and product shots are
 *   situational and can be large, so those stay in the brand folder until the
 *   agent asks for one with `use_brand_asset`.
 * - **A `components/brand.ts` we did not write is never touched.** A remixed
 *   template's brand module is real code — geometry, SVG paths, helpers — and
 *   overwriting it to install a palette would destroy the video the user chose.
 */

/** Where a brand's files land inside the project, so provenance stays visible. */
const PROJECT_BRAND_DIR = "assets/brand";

/**
 * Everything above this is regenerated whenever the brand changes; everything
 * below it belongs to whoever wrote it. Same contract as `BRAND.md`, and as a
 * remixed template's `AGENTS.md`.
 */
const MARKER = "/* GENMOTION:END — tokens you add go below. The block above is regenerated from the attached brand. */";

const LOGO_EXT = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif"]);

/** A hex map key: `C.primary`, `C.volt`. Falls back to the role. */
function tokenName(name: string | undefined, role: string, taken: Set<string>): string {
  const base =
    (name ?? role)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((word, i) => (i === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
      .join("") || role;
  // A leading digit is not an identifier, and a duplicate would silently drop
  // a colour from the generated object.
  let key = /^[0-9]/.test(base) ? `c${base}` : base;
  for (let n = 2; taken.has(key); n++) key = `${base}${n}`;
  taken.add(key);
  return key;
}

function quote(value: string): string {
  return JSON.stringify(value);
}

/**
 * The generated half of `components/brand.ts`.
 *
 * `C` and `FONT` are named as the templates name them, so a scene borrowed
 * from the scene library or forked from a template needs no renaming to read
 * from this file.
 */
function renderBrandModule(brand: BrandManifest, logos: { variant: string; file: string }[]): string {
  const lines: string[] = [];
  lines.push("/**");
  lines.push(` * ${brand.name} — generated from the brand attached to this project.`);
  lines.push(" *");
  lines.push(" * Change these values by editing the brand in GenMotion, not here: this");
  lines.push(" * block is rewritten whenever the brand changes. Tokens of your own go");
  lines.push(" * below the marker at the bottom, where nothing rewrites them.");
  lines.push(" *");
  lines.push(" * Import from here everywhere. One file is what lets the whole video");
  lines.push(" * re-skin at once, and it is why a colour must never be written inline.");
  lines.push(" */");
  lines.push("");

  const taken = new Set<string>();
  lines.push("export const C = {");
  if (brand.colors.length === 0) {
    lines.push("  // The brand has no colours set yet. Add them in GenMotion rather than");
    lines.push("  // sampling them out of a screenshot, which is never exact.");
  }
  for (const c of brand.colors) {
    const key = tokenName(c.name, c.role, taken);
    const note = c.name && c.name.toLowerCase() !== key.toLowerCase() ? ` // ${c.name} (${c.role})` : ` // ${c.role}`;
    lines.push(`  ${key}: ${quote(c.hex)},${note}`);
  }
  lines.push("};");
  lines.push("");

  lines.push("export const FONT = {");
  if (brand.fonts.length === 0) {
    lines.push("  // No brand face recorded. Pick one and say so in your notes.");
  }
  const seenRoles = new Set<string>();
  for (const f of brand.fonts) {
    // One entry per role: `FONT.display` has to mean something, and a
    // duplicate key would silently drop the first face.
    if (seenRoles.has(f.role)) continue;
    seenRoles.add(f.role);
    // The whole CSS stack is one string. A family name on its own is not a
    // usable stack, and a missing face falling back to Times is the most
    // visible way a video goes off-brand.
    const fallback = f.role === "mono" ? '"SF Mono", Menlo, monospace' : 'Inter, "Helvetica Neue", Arial, sans-serif';
    const family = /[^a-zA-Z0-9-]/.test(f.family) ? `"${f.family.replace(/"/g, "")}"` : f.family;
    const file = f.files.length
      ? ` // ${f.files.length} real file${f.files.length === 1 ? "" : "s"} in the brand folder`
      : " // no file: load it, or set the name as type";
    lines.push(`  ${f.role}: ${quote(`${family}, ${fallback}`)},${file}`);
  }
  lines.push("};");
  lines.push("");

  lines.push("/**");
  lines.push(" * The real logo files, copied into the project.");
  lines.push(" *");
  lines.push(" * Use one of these. Never redraw a mark, never generate one, and never");
  lines.push(" * hot-link one: a traced logo reads as nearly right, which is worse than");
  lines.push(" * absent, and the brand's name set as type is the correct substitute for a");
  lines.push(" * file that is missing.");
  lines.push(" */");
  lines.push("export const LOGO = {");
  if (logos.length === 0) {
    lines.push("  // No logo file in the brand yet. Set the name as a wordmark in FONT.display.");
  }
  for (const l of logos) lines.push(`  ${l.variant}: ${quote(`../${l.file}`)},`);
  lines.push("} as const;");
  lines.push("");

  lines.push("export const BRAND = {");
  lines.push(`  name: ${quote(brand.name)},`);
  if (brand.site) lines.push(`  site: ${quote(brand.site)},`);
  lines.push("} as const;");
  lines.push("");
  lines.push(MARKER);
  lines.push("");
  return lines.join("\n");
}

/**
 * Copy, unless the destination already holds those exact bytes.
 *
 * This runs on every turn and every project open, and the editor watches the
 * project folder: a `copyFile` that rewrites an identical logo would bump its
 * mtime, which the watcher reads as a change, which reloads the preview. Doing
 * nothing has to actually be nothing.
 *
 * Compared by content rather than by mtime because the source is a file the
 * user edits in Finder, where a touch without an edit is ordinary.
 */
async function copyIfChanged(source: string, destination: string): Promise<boolean> {
  const body = await fs.readFile(source).catch(() => null);
  if (!body) return false;
  const existing = await fs.readFile(destination).catch(() => null);
  if (existing && existing.equals(body)) return true;
  await fs.writeFile(destination, body);
  return true;
}

/** Copy the brand's logo files into `assets/brand/`, returning project paths. */
async function copyLogos(
  projectDir: string,
  brand: BrandManifest,
): Promise<{ variant: string; file: string }[]> {
  if (brand.logos.length === 0) return [];
  const dest = path.join(projectDir, PROJECT_BRAND_DIR);
  await fs.mkdir(dest, { recursive: true });

  const taken = new Set<string>();
  const copied: { variant: string; file: string }[] = [];
  for (const logo of brand.logos) {
    const ext = path.extname(logo.file).toLowerCase();
    // The manifest is hand-editable, so a `file` that is not an image is a
    // typo rather than an attack, but either way it has no business being
    // imported by a scene.
    if (!LOGO_EXT.has(ext)) continue;
    const source = path.join(brandDir(brand.id), logo.file);
    // `on` is part of the name because a dark-ground and a light-ground mark
    // are two different files that are both "the logo".
    const stem = logo.on === "any" ? logo.variant : `${logo.variant}-on-${logo.on}`;
    let name = `${stem}${ext}`;
    for (let n = 2; taken.has(name); n++) name = `${stem}-${n}${ext}`;
    taken.add(name);
    const ok = await copyIfChanged(source, path.join(dest, name));
    // A logo listed in the manifest whose file has been deleted is the user's
    // folder to fix. Skipping it keeps the rest of the brand working.
    if (!ok) continue;
    // One key per variant: a scene asks for `LOGO.mark`, and the first entry
    // for a variant is the one the brand lists first.
    const key = logo.variant;
    if (copied.some((c) => c.variant === key)) continue;
    copied.push({ variant: key, file: `${PROJECT_BRAND_DIR}/${name}` });
  }
  return copied;
}

export interface BrandSyncResult {
  /** Logo files now in the project, as project-relative paths. */
  logos: string[];
  /**
   * Set when `components/brand.ts` existed and was not ours, so it was left
   * alone. The prompt says so, and the agent folds the brand in by hand
   * instead of the file appearing to be wrong.
   */
  moduleSkipped?: boolean;
}

/**
 * Bring the brand into the project. Idempotent: safe on every project open.
 */
export async function syncBrandIntoProject(
  projectDir: string,
  brand: BrandManifest,
  engine: ProjectEngine,
): Promise<BrandSyncResult> {
  const logos = await copyLogos(projectDir, brand);

  // HyperFrames has no `components/` directory — a composition is HTML, and
  // its tokens are CSS custom properties the agent writes into `index.html`.
  // The prompt block and `BRAND.md` carry the brand there instead.
  if (engine === "hyperframes") return { logos: logos.map((l) => l.file) };

  const file = path.join(projectDir, "components", "brand.ts");
  const existing = await fs.readFile(file, "utf8").catch(() => null);
  const at = existing?.indexOf(MARKER) ?? -1;
  if (existing !== null && at === -1) {
    return { logos: logos.map((l) => l.file), moduleSkipped: true };
  }

  const theirs = at === -1 ? "" : existing!.slice(at + MARKER.length).replace(/^\n+/, "");
  const body = renderBrandModule(brand, logos);
  const next = theirs ? `${body}\n${theirs}` : body;
  // Same reason as the logo copy above: this runs on every turn, and an
  // identical rewrite would still reload the preview beside the chat.
  if (existing === next) return { logos: logos.map((l) => l.file) };

  const tmp = `${file}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tmp, next, "utf8");
  await fs.rename(tmp, file);

  return { logos: logos.map((l) => l.file) };
}
