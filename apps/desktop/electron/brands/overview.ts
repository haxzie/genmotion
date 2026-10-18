import path from "node:path";
import fs from "node:fs/promises";
import { BRAND_DIRS, BRAND_DOC, type BrandDir } from "@genmotion/shared";
import { readBrandNotes } from "./manifest";
import { brandDir } from "./paths";
import { resolveBrand } from "./resolve";

/**
 * What the `brand_overview` and `use_brand_asset` tools do.
 *
 * Kept out of `agent/tools.ts` because that file is already 1800 lines and
 * because both of these are about a brand folder rather than about a turn.
 * Both answer in prose: the tool contract is that `text` has to stand alone,
 * since not every harness forwards anything else.
 */

/** 25MB, matching `MAX_ASSET_BYTES` in `agent/tools.ts`. */
const MAX_BRAND_ASSET_BYTES = 25 * 1024 * 1024;

/** Bytes as a brand's owner would read them, for a file list. */
function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The files in one of the brand's four subfolders, newest irrelevant, sorted by name. */
async function listDir(dir: string, sub: BrandDir): Promise<{ rel: string; bytes: number }[]> {
  const target = path.join(dir, sub);
  const entries = await fs.readdir(target, { withFileTypes: true }).catch(() => []);
  const files: { rel: string; bytes: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const stat = await fs.stat(path.join(target, entry.name)).catch(() => null);
    if (!stat) continue;
    files.push({ rel: `${sub}/${entry.name}`, bytes: stat.size });
  }
  return files.sort((a, b) => a.rel.localeCompare(b.rel));
}

export async function brandOverview(projectDir: string): Promise<string> {
  const attached = await resolveBrand(projectDir).catch(() => null);
  if (!attached) {
    // Said plainly, with the next move, because the agent cannot tell the
    // difference between "no brand" and "the tool failed" otherwise — and the
    // right behaviour without one is to ask, not to invent a palette.
    const out = ["No brand is attached to this project.", ""];
    // The brands this machine *has* matter here more than they look like they
    // should. The common case is a user who already set up their brand months
    // ago, says "make this for Acme", and gets asked for hex values anyway
    // because the chip was never set on this project. Naming the brand means
    // the agent can point at the one click that fixes it instead.
    const { listBrandIds, readBrand } = await import("./manifest");
    const ids = await listBrandIds().catch(() => []);
    const names = (await Promise.all(ids.map((id) => readBrand(id).catch(() => null))))
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .map((b) => b.name);
    if (names.length) {
      out.push(
        `This machine has ${names.length === 1 ? "a brand" : "brands"} set up: ${names.map((n) => `**${n}**`).join(", ")}. If the video is for one of them, say so and ask the user to pick it from the Brand control in the composer — then everything about its identity is exact and you do not have to ask for any of it.`,
        "",
      );
    }
    out.push(
      "Otherwise, if the video is for a specific company, ask the user for the real logo file and the exact hex values rather than guessing or sampling them from a screenshot.",
    );
    return out.join("\n");
  }

  const { brand } = attached;
  const dir = brandDir(brand.id);
  const out: string[] = [];

  out.push(`# ${brand.name}${brand.site ? ` — ${brand.site}` : ""}`);
  out.push("");
  out.push(`Folder: ${dir} (readable; you cannot write into it)`);
  out.push("");

  if (brand.colors.length) {
    out.push("## Colours — use these exactly");
    out.push("");
    for (const c of brand.colors) {
      out.push(`- \`${c.hex}\` — ${c.role}${c.name ? `, "${c.name}"` : ""}${c.source === "import" ? " (guessed from their site, so worth confirming)" : ""}`);
    }
    out.push("");
  } else {
    out.push("## Colours");
    out.push("");
    out.push("None recorded. Ask for them; do not sample a colour from a screenshot.");
    out.push("");
  }

  if (brand.fonts.length) {
    out.push("## Type");
    out.push("");
    for (const f of brand.fonts) {
      const files = f.files
        .map((x) => `\`${x.file}\`${x.variable ? " (variable)" : x.weight ? ` (${x.weight}${x.style === "italic" ? " italic" : ""})` : ""}`)
        .join(", ");
      out.push(
        `- **${f.role}**: ${f.family}${
          files
            ? ` — real files: ${files}. Bring the weight you need in with \`use_brand_asset\` and load it with \`@font-face\`.`
            : " — no file here; load it the usual way, or set the name as type"
        }`,
      );
    }
    out.push("");
  }

  if (brand.logos.length) {
    out.push("## Logos");
    out.push("");
    for (const l of brand.logos) out.push(`- \`${l.file}\` — ${l.variant}, for a ${l.on} ground`);
    out.push("");
    out.push(
      "These are already copied into the project under `assets/brand/` and are in `components/brand.ts` as `LOGO`. Use one. Never redraw, trace or generate a mark.",
    );
    out.push("");
  } else {
    out.push("## Logos");
    out.push("");
    out.push("None. Set the brand's name as a wordmark in the display face, and say that is what you did.");
    out.push("");
  }

  if (brand.voice) {
    out.push("## Voice");
    out.push("");
    out.push(brand.voice);
    out.push("");
  }

  const notes = await readBrandNotes(brand.id).catch(() => "");
  if (notes.trim()) {
    out.push(`## Their own notes (from ${BRAND_DOC})`);
    out.push("");
    out.push("These outrank everything above.");
    out.push("");
    out.push(notes.trim());
    out.push("");
  }

  out.push("## Files in the brand folder");
  out.push("");
  let any = false;
  for (const { dir: sub, label, what } of BRAND_DIRS) {
    const files = await listDir(dir, sub);
    if (files.length === 0) continue;
    any = true;
    out.push(`**${label}** — ${what}`);
    out.push("");
    for (const f of files) out.push(`- \`${f.rel}\` (${size(f.bytes)})`);
    out.push("");
  }
  if (!any) out.push("Empty apart from the brand's own record. Nothing to bring in.", "");

  if (brand.thirdParty) {
    out.push(
      "> This brand belongs to someone else. The video is reference work: never write copy that claims to come from them, and never invent a quote, a figure or an announcement they did not make.",
    );
    out.push("");
  }

  out.push(
    "Bring any of these into the project with `use_brand_asset`, then import the path it returns. Do not reach across to the brand folder from scene code.",
  );
  return out.join("\n");
}

/**
 * Copy one file out of the brand folder into the project.
 *
 * Validated at both ends: the brand-folder path must stay inside the brand
 * folder and must name one of the four subfolders, and the project-side write
 * goes through the same `saveAssetBytes` every other asset does, so the
 * filename sanitising, the collision loop and the containment check are the
 * ones already in use rather than a second copy of them.
 */
export async function useBrandAsset(
  projectDir: string,
  file: string,
  filename?: string,
): Promise<string> {
  const attached = await resolveBrand(projectDir);
  if (!attached) throw new Error("No brand is attached to this project, so there is nothing to copy from.");

  // Normalised before it is judged, so `logos/../../.ssh/id_rsa` is rejected
  // as what it resolves to rather than accepted as what it is spelled.
  const rel = path.normalize(file).split(path.sep).join("/");
  const top = rel.split("/")[0];
  if (!BRAND_DIRS.some(({ dir }) => dir === top)) {
    throw new Error(
      `${file} is not in the brand folder. Paths look like "logos/mark.svg" — one of ${BRAND_DIRS.map(({ dir }) => `${dir}/`).join(", ")}, as brand_overview lists them.`,
    );
  }
  const dir = brandDir(attached.brand.id);
  const source = path.resolve(dir, rel);
  if (path.relative(dir, source).startsWith("..")) throw new Error("That path is outside the brand folder.");

  const stat = await fs.stat(source).catch(() => null);
  if (!stat?.isFile()) throw new Error(`There is no file at ${rel} in the brand folder.`);
  // The same ceiling every other asset writer uses. A reference video larger
  // than this belongs on the timeline through the editor, not through a tool
  // call that buffers it whole.
  if (stat.size > MAX_BRAND_ASSET_BYTES) {
    throw new Error(
      `${rel} is ${Math.round(stat.size / (1024 * 1024))}MB, over the ${Math.round(MAX_BRAND_ASSET_BYTES / (1024 * 1024))}MB limit for this tool. Ask the user to add it to the project from the editor instead.`,
    );
  }

  const body = await fs.readFile(source);
  const { saveBrandAssetBytes } = await import("../agent/asset-writer");
  return saveBrandAssetBytes(projectDir, body, filename || path.basename(rel), path.extname(rel));
}

