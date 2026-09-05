import { z } from "zod";
import { projectManifestSchema } from "@genmotion/project/schema";
import type { TemplateMeta, TemplateTag } from "./schema";

/**
 * The wire format, shared by the API, the Electron main process and the
 * renderer. Kept free of node imports so Vite can bundle it: the catalog reader
 * next door touches the filesystem, and this half must not drag that in.
 *
 * `projectManifestSchema` comes from `@genmotion/project`'s `./schema`
 * subpath specifically, not its main barrel — the barrel also re-exports
 * `bundle.ts`, which imports the native `esbuild` package. That's fine for
 * every other consumer of this package (all node-side), but this file is the
 * one piece of `@genmotion/templates` the renderer imports directly, and
 * `esbuild` cannot run in a browser at all. Vite's dependency cache can mask
 * this for a while — it only breaks the moment something forces a re-crawl —
 * so the barrel import is a landmine, not a working shortcut.
 *
 * No payload here carries an absolute URL. Every asset reference is a path the
 * client joins onto whatever API base it used, which is what lets the desktop
 * renderer reach all of it through the loopback server on its own origin — the
 * only source its CSP allows for `connect-src` and `media-src` alike.
 */

export type TemplateCategory = TemplateMeta["category"];
export type { TemplateTag };

/** What the gallery needs to draw a card, without opening a scene. */
export interface TemplateSummary {
  id: string;
  title: string;
  description: string;
  /** Resolved — the sidecar's `metaTitle` when set, else a derived default. */
  metaTitle: string;
  category: TemplateCategory;
  tags: TemplateTag[];
  /** From project.json, so the card draws at the template's real ratio. */
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  sceneCount: number;
  /** Join onto the API base — "/api/templates/<id>/poster". */
  posterPath: string;
  /**
   * Join onto the API base — "/api/templates/<id>/video". A pre-rendered MP4
   * in R2, proxied through this route rather than linked directly: R2 isn't
   * public, and routing it through the API keeps this a relative path a
   * player can reach the same way it reaches the poster — including through
   * the desktop app's loopback server, whose CSP wouldn't allow a raw R2 URL.
   * 404s until `pnpm --filter @genmotion/templates render-video` has run for
   * this template at least once — see the `templates` skill.
   */
  videoPath: string;
  /** Content hash of the folder. The ETag, the cache key, and the bundle stamp. */
  revision: string;
}

/** Default and ceiling for `GET /api/templates`'s `?limit=`. */
export const TEMPLATE_PAGE_SIZE = 12;
export const TEMPLATE_PAGE_SIZE_MAX = 48;

export interface TemplateCatalog {
  templates: TemplateSummary[];
  /** Pass back as `?cursor=` for the next page. Null once there is no more. */
  nextCursor: string | null;
}

/**
 * Every client used to preview a template by live-compiling its scenes and
 * evaluating them in the browser — the same machinery a real project's editor
 * uses. That's gone from every *public* surface now: `render-video.mjs`
 * renders each template to an MP4 once, offline, and every gallery/detail
 * page just plays that (`videoPath`, above). The one place scene bundling
 * still matters is `render-video.mjs` itself and `/api/templates/:id/files`
 * (a remix genuinely needs the raw source) — neither goes over this wire
 * format, so `TemplateScene`/`TemplateAudioClip`/`TemplateDetail` and the
 * `assetBasePath`-joining contract they existed for are gone with them.
 *
 * `TRIPWIRE_PREFIX` is what's left of that: the placeholder
 * `createSceneBundler` leaves for an asset it couldn't inline as a data URL
 * (an oversized image, or any audio/video, which never inlines regardless of
 * size). Nothing serves that scheme — `render-video.mjs` reads straight off
 * disk instead of resolving it, and treats a non-audio one turning up as a
 * curation bug (see its own comment) rather than something to rewrite.
 */
export const TRIPWIRE_PREFIX = "gm-template-asset://";

// ── Remix ──────────────────────────────────────────────────────────────────

/**
 * Ceiling for a whole remix bundle, decoded.
 *
 * It is a budget as much as a guard: the gallery live-compiles what it shows,
 * so a template heavy enough to strain this is a template that plays badly.
 * A CI check holds every catalog entry under it.
 */
export const MAX_REMIX_BYTES = 12 * 1024 * 1024;

/** Ceiling on the number of files, so a malformed bundle can't fan out on disk. */
export const MAX_REMIX_FILES = 200;

export const remixFileSchema = z.object({
  /** Project-relative and forward-slashed. Re-validated by the client. */
  path: z.string().min(1),
  encoding: z.enum(["text", "base64"]),
  contents: z.string(),
});

/**
 * Everything a remix needs, in one document.
 *
 * Binaries are base64 inside it rather than a list of URLs to fetch: one
 * request either yields the whole template or none of it. A list of URLs is N
 * downloads that can half-fail, and half of them failing leaves a project on
 * disk whose manifest points at an asset that never arrived. The size cap is
 * what makes inlining affordable — templates are text, plus the occasional
 * logo, where base64's third costs a few tens of kilobytes.
 */
export const remixBundleSchema = z.object({
  id: z.string().min(1),
  revision: z.string().min(1),
  /** Re-serialized from the parsed manifest, not raw project.json bytes. */
  manifest: projectManifestSchema,
  files: z.array(remixFileSchema).max(MAX_REMIX_FILES),
  /** Decoded byte total, so a client can refuse before it decodes anything. */
  totalBytes: z.number().int().nonnegative(),
});

export type TemplateRemixFile = z.infer<typeof remixFileSchema>;
export type TemplateRemixBundle = z.infer<typeof remixBundleSchema>;
