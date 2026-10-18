import path from "node:path";
import fs from "node:fs/promises";
import {
  BRAND_DIRS,
  BRAND_DOC,
  BRAND_FILE,
  brandManifestSchema,
  type BrandDir,
  type BrandManifest,
  type BrandSummary,
} from "@genmotion/shared";
import { brandDir, brandIdFor, brandsRoot } from "./paths";

/**
 * Reading, writing and scaffolding a brand folder.
 *
 * The folder is the source of truth, not a cache of something else: a brand
 * created here and a brand the user assembled by hand in Finder are the same
 * thing, and `list()` finds both. That is why nothing is indexed — the
 * directory listing *is* the index.
 */

export class BrandError extends Error {}

/** Only the two files the app owns are written; everything else is dropped in. */
const MANIFEST_HEADER = "https://genmotion.dev/schemas/brand.json";

function manifestPath(id: string): string {
  return path.join(brandDir(id), BRAND_FILE);
}

/**
 * Written through a temp file and renamed over, the way `writeManifest` writes
 * a project manifest: the user may have this folder open in an editor, and a
 * half-written JSON that the next read discards would take the whole brand
 * with it.
 */
async function writeJson(file: string, value: unknown): Promise<void> {
  const tmp = `${file}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function readBrand(id: string): Promise<BrandManifest> {
  const file = manifestPath(id);
  const raw = await fs.readFile(file, "utf8").catch(() => null);
  if (raw === null) throw new BrandError(`No brand at ${file}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BrandError(`${BRAND_FILE} is not valid JSON. Fix or delete it.`);
  }
  const result = brandManifestSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join(".") || BRAND_FILE;
    throw new BrandError(`${BRAND_FILE} is invalid: ${where} ${first?.message ?? "failed to parse"}`);
  }
  return result.data;
}

/** Write the manifest and regenerate `BRAND.md` from it. One call, so they cannot drift. */
export async function writeBrand(manifest: BrandManifest): Promise<BrandManifest> {
  const next = { ...manifest, $schema: MANIFEST_HEADER, updatedAt: Date.now() };
  await writeJson(manifestPath(next.id), next);
  await writeBrandDoc(next);
  return next;
}

export interface CreateBrandInput {
  name: string;
  site?: string;
  /** What the company does, from the site's own meta description. */
  description?: string;
  thirdParty?: boolean;
}

/**
 * What somebody types in a website field.
 *
 * `acme.com` is what a person writes, and the schema wants a URL, so a bare
 * domain is completed rather than refused. Anything that still will not parse
 * is dropped instead of failing the whole create: a brand is worth having
 * without a website, and a typo in an optional field should not be the thing
 * that stops one being made.
 */
export function normaliseSite(input: string | undefined): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Scaffold a brand folder: the manifest, the doc, and the four subfolders.
 *
 * The folder is removed if anything after the `mkdir` fails, the way
 * `remixTemplateAndOpen` removes a half-written project: `brandIdFor` had just
 * confirmed the id was free, so this can only ever delete what it just made.
 * Without it a failed create leaves a directory with no manifest, which
 * `listBrandIds` skips — an invisible folder that then takes the name.
 */
export async function createBrand(input: CreateBrandInput): Promise<BrandManifest> {
  const name = input.name.trim();
  if (!name) throw new BrandError("A brand needs a name.");
  const id = brandIdFor(name, await listBrandIds());
  const dir = brandDir(id);
  const now = Date.now();
  const site = normaliseSite(input.site);

  await fs.mkdir(dir, { recursive: true });
  try {
    // Made up front rather than on first upload, because they are the thing the
    // user is meant to drag files into: an empty folder with four labelled
    // drawers explains itself, where one that grows them silently does not.
    await Promise.all(BRAND_DIRS.map(({ dir: sub }) => fs.mkdir(path.join(dir, sub), { recursive: true })));

    return await writeBrand(
      brandManifestSchema.parse({
        id,
        name,
        ...(site ? { site } : {}),
        ...(input.description ? { description: input.description } : {}),
        thirdParty: input.thirdParty ?? false,
        createdAt: now,
        updatedAt: now,
      }),
    );
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * Remove a brand folder.
 *
 * Deliberately a real delete rather than a move to a trash directory, unlike
 * an asset inside a project: the folder is in the user's own home, visible in
 * Finder, and they have the system's own undo for it there. A shadow copy
 * under `userData` that nobody can see is the worse of the two.
 */
export async function deleteBrand(id: string): Promise<void> {
  await fs.rm(brandDir(id), { recursive: true, force: true });
}

/** Direct children of the brands root that hold a manifest, sorted. */
export async function listBrandIds(): Promise<string[]> {
  const entries = await fs.readdir(brandsRoot(), { withFileTypes: true }).catch(() => []);
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const has = await fs
      .access(path.join(brandsRoot(), entry.name, BRAND_FILE))
      .then(() => true)
      .catch(() => false);
    if (has) ids.push(entry.name);
  }
  return ids.sort();
}

async function countIn(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile() && !e.name.startsWith(".")).length;
}

export async function summariseBrand(id: string, lastUsedAt?: number): Promise<BrandSummary> {
  const manifest = await readBrand(id);
  const dir = brandDir(id);
  const counts = {} as Record<BrandDir, number>;
  await Promise.all(
    BRAND_DIRS.map(async ({ dir: sub }) => {
      counts[sub] = await countIn(path.join(dir, sub));
    }),
  );
  return { ...manifest, dir, counts, ...(lastUsedAt ? { lastUsedAt } : {}) };
}

/**
 * Every brand on this machine.
 *
 * A folder whose manifest will not parse is left out rather than failing the
 * list: one brand someone hand-edited badly must not be able to empty the
 * screen. The detail view reports the error for that brand alone.
 */
export async function listBrands(lastUsed: Record<string, number> = {}): Promise<BrandSummary[]> {
  const ids = await listBrandIds();
  const summaries = await Promise.all(ids.map((id) => summariseBrand(id, lastUsed[id]).catch(() => null)));
  return summaries.filter((b): b is BrandSummary => b !== null);
}

/* ---------------------------------------------------------------- BRAND.md */

/**
 * Everything above this line is ours to rewrite; everything below it is the
 * user's.
 *
 * The same contract a remixed template's `AGENTS.md` has, and for the same
 * reason: the generated half has to track `brand.json` on every edit, and the
 * half someone wrote about how their brand actually sounds must survive that.
 * An HTML comment because it is invisible wherever the file is rendered.
 */
const DOC_MARKER = "<!-- GENMOTION:END — your own notes go below this line and are never rewritten. -->";

function docPath(id: string): string {
  return path.join(brandDir(id), BRAND_DOC);
}

/** The prose half of a brand: what the agent reads when it opens the folder. */
function renderBrandDoc(brand: BrandManifest): string {
  const lines: string[] = [];
  lines.push(`# ${brand.name}`);
  lines.push("");
  lines.push(
    "The brand this video is for. Everything above the marker is generated from `brand.json` by the GenMotion app; notes below it are the user's own and outrank anything here.",
  );
  lines.push("");
  if (brand.site) lines.push(`Site: ${brand.site}`, "");
  if (brand.description) {
    lines.push("## What they do", "", brand.description, "");
  }

  if (brand.colors.length) {
    lines.push("## Colours");
    lines.push("");
    lines.push("| Role | Hex | Name |");
    lines.push("| --- | --- | --- |");
    for (const c of brand.colors) lines.push(`| ${c.role} | \`${c.hex}\` | ${c.name ?? ""} |`);
    lines.push("");
    lines.push("Use these exactly. A colour sampled from a screenshot is not one of these.");
    lines.push("");
  }

  if (brand.fonts.length) {
    lines.push("## Type");
    lines.push("");
    for (const f of brand.fonts) {
      const file = f.files.length
        ? ` — files: ${f.files.map((x) => `\`${x.file}\``).join(", ")}`
        : " — no file here, so load it the usual way or set the name as type";
      lines.push(`- **${f.role}**: ${f.family}${file}`);
    }
    lines.push("");
  }

  if (brand.logos.length) {
    lines.push("## Logos");
    lines.push("");
    for (const l of brand.logos) lines.push(`- \`${l.file}\` — ${l.variant}, for a ${l.on} ground`);
    lines.push("");
    lines.push(
      "These are the real files. Bring one into the project rather than reaching across to it, and never redraw or generate a mark: slightly wrong is worse than absent, and the name set as type is the correct substitute for a logo that is missing.",
    );
    lines.push("");
  }

  if (brand.voice) {
    lines.push("## Voice");
    lines.push("");
    lines.push(brand.voice);
    lines.push("");
  }

  lines.push("## What is in this folder");
  lines.push("");
  for (const { dir, what } of BRAND_DIRS) lines.push(`- \`${dir}/\` — ${what}`);
  lines.push("");
  if (brand.thirdParty) {
    lines.push(
      "> This brand belongs to someone else. The video is reference work, not something that may claim to be from them.",
    );
    lines.push("");
  }
  lines.push(DOC_MARKER);
  lines.push("");
  return lines.join("\n");
}

/** Regenerate the doc, keeping whatever the user wrote under the marker. */
export async function writeBrandDoc(brand: BrandManifest): Promise<void> {
  const file = docPath(brand.id);
  const existing = await fs.readFile(file, "utf8").catch(() => "");
  const at = existing.indexOf(DOC_MARKER);
  const theirs = at === -1 ? "" : existing.slice(at + DOC_MARKER.length).replace(/^\n+/, "");
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, theirs ? `${renderBrandDoc(brand)}\n${theirs}` : renderBrandDoc(brand), "utf8");
  await fs.rename(tmp, file);
}

/**
 * The user's half, for the guidelines editor in the detail panel.
 *
 * Trimmed at both ends so the round trip is stable: the file gets a trailing
 * newline because it is a text file, and returning that would make the editor
 * think the notes had changed every time it compared the textarea against
 * what it loaded.
 */
export async function readBrandNotes(id: string): Promise<string> {
  const existing = await fs.readFile(docPath(id), "utf8").catch(() => "");
  const at = existing.indexOf(DOC_MARKER);
  return at === -1 ? "" : existing.slice(at + DOC_MARKER.length).trim();
}

/**
 * The writer half of the marker contract.
 *
 * No editor calls it today: the detail page is being redesigned and shows only
 * what the import produces. It stays because the contract it implements is
 * still live — the agent reads whatever is below the marker, a user can put it
 * there from Finder, and `writeBrandDoc` has to not clobber it. The test for
 * that is what this is for.
 */
export async function writeBrandNotes(id: string, notes: string): Promise<void> {
  const brand = await readBrand(id);
  const trimmed = notes.trim();
  const file = docPath(id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, trimmed ? `${renderBrandDoc(brand)}\n${trimmed}\n` : renderBrandDoc(brand), "utf8");
  await fs.rename(tmp, file);
}
