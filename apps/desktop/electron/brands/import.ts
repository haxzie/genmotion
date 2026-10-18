import path from "node:path";
import fs from "node:fs/promises";
import {
  brandManifestSchema,
  type BrandFontFile,
  type BrandInspection,
  type InspectedColor,
  type InspectedFont,
  type InspectedLogo,
} from "@genmotion/shared";
import { readBrand, writeBrand } from "./manifest";
import { brandDir } from "./paths";

/**
 * Building a brand from the company's own website.
 *
 * This is what makes a brand folder a ten-minute job rather than an afternoon,
 * and it is the only part of the feature that can be confidently wrong. So it
 * is split in two deliberately: `inspectSite` reads a page and **writes
 * nothing**, and `applyInspection` writes only what the user ticked. A brand
 * that silently populated itself with the wrong blue is worse than an empty
 * one, because an empty one gets filled in and a wrong one never gets checked.
 *
 * The reading half is not done here. It runs on the API, against Firecrawl's
 * branding extraction, because that key is billable and bundling it into this
 * build would hand a credential to every user. This module is the client and
 * the half that puts files on disk.
 */

/** A logo. Anything bigger is a hero image that happened to be in a link tag. */
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
/** A webfont. A variable woff2 is a few hundred KB; an OTF can be larger. */
const MAX_FONT_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

export class BrandImportError extends Error {}

/**
 * Ask the API what a website looks like it says about a brand.
 *
 * Writes nothing. Everything it returns is labelled as a guess, and stays
 * labelled: what the user accepts is recorded with `source: "import"` so the
 * detail panel can go on saying so long after the import.
 */
export async function inspectSite(site: string): Promise<BrandInspection> {
  const { desktopAuth } = await import("../auth");
  const res = await desktopAuth.request<BrandInspection | { error?: string }>("/api/brands/inspect", {
    json: { url: site },
  });

  if (!res.ok) {
    const message = (res.body as { error?: string })?.error;
    if (res.status === 401) {
      throw new BrandImportError("Sign in to read a site. You can still add the details by hand.");
    }
    throw new BrandImportError(message || `Could not read that site (${res.status}).`);
  }
  return res.body as BrandInspection;
}

/* ----------------------------------------------------------------- writing */

/**
 * What the user ticked.
 *
 * Only the lists. The name, the site and the description are identity, set
 * once when the brand is created — carrying them here as well meant two places
 * could decide what a brand is called, and the second one silently won.
 */
export interface AcceptedInspection {
  colors?: InspectedColor[];
  fonts?: InspectedFont[];
  /** The candidates the user ticked; each is fetched into `logos/`. */
  logos?: InspectedLogo[];
}

const LOGO_MIME: Record<string, string> = {
  "image/svg+xml": ".svg",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

/**
 * An inline SVG, which is the best logo a page can give up.
 *
 * Firecrawl returns the mark it found in the markup as a `data:` URI rather
 * than a link, so this is the real vector at full quality rather than whatever
 * the favicon happens to be. Both encodings appear in the wild.
 */
export function decodeDataUri(src: string): { body: Buffer; ext: string } | null {
  // The header is `<mime>[;param]*[;base64]`, and the parameters are not just
  // `base64`: Firecrawl returns `data:image/svg+xml;utf8,…`, which a pattern
  // that only tolerated `;base64` rejected outright. That silently dropped
  // every inline logo — the best one a page has.
  const comma = src.indexOf(",");
  if (comma === -1) return null;
  const [mime, ...params] = src.slice("data:".length, comma).split(";");
  const ext = LOGO_MIME[(mime ?? "").trim().toLowerCase()];
  if (!ext) return null;

  const payload = src.slice(comma + 1);
  const isBase64 = params.some((p) => p.trim().toLowerCase() === "base64");
  let body: Buffer;
  try {
    body = isBase64
      ? Buffer.from(payload, "base64")
      : // Percent-encoded by whoever wrote the URI. A payload that is not
        // encoded at all decodes to itself, so this is safe either way.
        Buffer.from(decodeURIComponent(payload), "utf8");
  } catch {
    return null;
  }
  return body.byteLength > 0 && body.byteLength <= MAX_LOGO_BYTES ? { body, ext } : null;
}

async function fetchRemote(src: string): Promise<{ body: Buffer; ext: string } | null> {
  const url = new URL(src);
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!res?.ok) return null;
  const mime = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const ext = LOGO_MIME[mime] ?? path.extname(url.pathname).toLowerCase();
  // An extension this does not recognise is not something a scene can import,
  // and a content-type that is not an image means the link was not a logo.
  if (!Object.values(LOGO_MIME).includes(ext)) return null;
  const body = Buffer.from(await res.arrayBuffer());
  return body.byteLength > 0 && body.byteLength <= MAX_LOGO_BYTES ? { body, ext } : null;
}

/** Put one accepted logo in the brand's `logos/`, returning its relative path. */
async function saveLogo(id: string, candidate: InspectedLogo): Promise<string | null> {
  const file = candidate.src.startsWith("data:")
    ? decodeDataUri(candidate.src)
    : await fetchRemote(candidate.src).catch(() => null);
  if (!file) return null;

  const dir = path.join(brandDir(id), "logos");
  await fs.mkdir(dir, { recursive: true });
  for (let n = 0; n < 50; n++) {
    const rel = `logos/${candidate.variant}${n === 0 ? "" : `-${n + 1}`}${file.ext}`;
    const absolute = path.join(brandDir(id), rel);
    const taken = await fs
      .access(absolute)
      .then(() => true)
      .catch(() => false);
    if (taken) continue;
    await fs.writeFile(absolute, file.body);
    return rel;
  }
  return null;
}

const FONT_EXT: Record<string, string> = {
  woff2: ".woff2",
  woff: ".woff",
  otf: ".otf",
  ttf: ".ttf",
};

/** A readable filename for a weight and style: `Inter-700-italic.woff2`. */
function fontFilename(family: string, file: { weight?: number; style: string; variable: boolean }): string {
  const stem = family.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "font";
  const weight = file.variable ? "variable" : file.weight ? String(file.weight) : "regular";
  return `${stem}-${weight}${file.style === "italic" ? "-italic" : ""}`;
}

/**
 * Fetch one family's files into the brand's `fonts/`.
 *
 * A family name on its own is what produces a video set in Helvetica, which is
 * the most visible way a brand video goes wrong. The bytes are the point.
 *
 * Downloaded here rather than on the API so the files never pass through our
 * server: these are public URLs off the company's own CDN, and the desktop can
 * reach them directly.
 */
async function saveFontFiles(id: string, font: InspectedFont): Promise<BrandFontFile[]> {
  if (font.files.length === 0) return [];
  const dir = path.join(brandDir(id), "fonts");
  await fs.mkdir(dir, { recursive: true });

  const saved: BrandFontFile[] = [];
  const taken = new Set<string>();
  for (const candidate of font.files.slice(0, 12)) {
    const ext = FONT_EXT[candidate.format];
    if (!ext) continue;
    const url = new URL(candidate.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;

    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
    if (!res?.ok) continue;
    const body = Buffer.from(await res.arrayBuffer());
    if (body.byteLength === 0 || body.byteLength > MAX_FONT_BYTES) continue;

    const stem = fontFilename(font.family, candidate);
    let name = `${stem}${ext}`;
    for (let n = 2; taken.has(name); n++) name = `${stem}-${n}${ext}`;
    taken.add(name);
    await fs.writeFile(path.join(dir, name), body);
    saved.push({
      file: `fonts/${name}`,
      ...(candidate.weight ? { weight: candidate.weight } : {}),
      style: candidate.style,
      variable: candidate.variable,
    });
  }
  return saved;
}

/**
 * Write the parts of an inspection the user accepted.
 *
 * Everything lands with `source: "import"`, which the detail panel shows as a
 * guess until someone edits it. A logo that cannot be fetched is skipped
 * rather than failing the import: the rest of the brand is still worth having.
 */
export async function applyInspection(id: string, accepted: AcceptedInspection): Promise<void> {
  const current = await readBrand(id);

  const logos = [...current.logos];
  for (const candidate of accepted.logos ?? []) {
    const file = await saveLogo(id, candidate).catch(() => null);
    if (file) logos.push({ file, variant: candidate.variant, on: "any", source: "import" });
  }

  // A family whose files will not download is still worth recording: the name
  // alone lets the agent set type, and a missing file is visible in the panel.
  const fonts = [];
  for (const font of accepted.fonts ?? []) {
    const files = await saveFontFiles(id, font).catch(() => []);
    fonts.push({ role: font.role, family: font.family, files, source: "import" as const });
  }

  await writeBrand(
    brandManifestSchema.parse({
      ...current,
      colors: [
        ...current.colors,
        ...(accepted.colors ?? []).map((c) => ({
          hex: c.hex,
          role: c.role,
          ...(c.label ? { name: c.label } : {}),
          source: "import" as const,
        })),
      ],
      fonts: [...current.fonts, ...fonts],
      logos,
    }),
  );
}
