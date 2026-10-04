import path from "node:path";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { getObject } from "@genmotion/storage";
import {
  TEMPLATE_PAGE_SIZE,
  TemplateError,
  buildRemixBundle,
  getTemplate,
  listTemplatesPage,
  templateAssetPath,
  templatePosterPath,
  toSummary,
} from "@genmotion/templates";
import { SCENE_BEATS, findScenes, parseAspect, getScene, getSceneFork, getSceneStill, type SceneBeat } from "@genmotion/templates/scenes";
import { anonymousDistinctId, clientIp, trackServer } from "../analytics";
import { notifyRemixIntent } from "../slack";

/**
 * The starter templates.
 *
 * Public and unauthenticated, like `/api/releases`: nothing here is anyone's
 * private data, it is byte-identical for every account, and the desktop app
 * browses the gallery before a project — or a session — exists. Keeping it
 * anonymous is also what lets a poster load from a plain `<img src>`.
 *
 * The files ship inside the API image, so every route below is a filesystem
 * read behind a process-lifetime cache rather than anything that touches the
 * database.
 */
export const templateRoutes = new Hono();

/** JSON is cheap to rebuild but changes only on deploy. */
const JSON_CACHE = "public, max-age=300";
/** Bytes are addressed by `?v=<revision>`, so a hit can be held indefinitely. */
const IMMUTABLE = "public, max-age=31536000, immutable";
const BYTES_CACHE = "public, max-age=3600";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

const mimeFor = (file: string) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

templateRoutes.get("/", async (c) => {
  const limitParam = Number(c.req.query("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : TEMPLATE_PAGE_SIZE;
  // `?featured=true` is the home page's curated strip; anything else (absent
  // included) is the whole catalog, which is what the gallery wants.
  const featured = c.req.query("featured") === "true" ? true : undefined;
  const { records, nextCursor } = await listTemplatesPage({
    cursor: c.req.query("cursor"),
    limit,
    featured,
  });
  c.header("Cache-Control", JSON_CACHE);
  return c.json({ templates: records.map(toSummary), nextCursor });
});

/**
 * The scene library: every template's scenes, one by one, for an agent
 * building a different video to borrow from. Registered before `/:id` so
 * "scenes" is never read as a template id.
 */
templateRoutes.get("/scenes", async (c) => {
  const beat = c.req.query("beat");
  if (beat && !(SCENE_BEATS as readonly string[]).includes(beat)) {
    return c.json({ error: `Unknown beat "${beat}"`, beats: SCENE_BEATS }, 400);
  }
  const aspect = parseAspect(c.req.query("aspect"));
  const limit = Number(c.req.query("limit"));
  const hits = await findScenes({
    query: c.req.query("q") ?? "",
    beat: beat as SceneBeat | undefined,
    videoType: c.req.query("videoType") || undefined,
    engine: c.req.query("engine") || undefined,
    technique: c.req.query("technique") || undefined,
    aspect,
    template: c.req.query("template") || undefined,
    preferEngine: c.req.query("preferEngine") || undefined,
    mood: c.req.query("mood") || undefined,
    includeFiller: c.req.query("includeFiller") === "true",
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  });
  c.header("Cache-Control", JSON_CACHE);
  return c.json({ scenes: hits });
});

templateRoutes.get("/scenes/:template/:scene", async (c) => {
  const scene = await getScene(`${c.req.param("template")}/${c.req.param("scene")}`);
  if (!scene) return c.json({ error: "Not found" }, 404);
  c.header("Cache-Control", JSON_CACHE);
  return c.json(scene);
});

/** The scene with its imports and assets, bytes included, for `forkScene`. */
templateRoutes.get("/scenes/:template/:scene/fork", async (c) => {
  const fork = await getSceneFork(`${c.req.param("template")}/${c.req.param("scene")}`);
  if (!fork) return c.json({ error: "Not found" }, 404);
  c.header("Cache-Control", JSON_CACHE);
  return c.json(fork);
});

templateRoutes.get("/scenes/:template/:scene/still", async (c) => {
  const still = await getSceneStill(`${c.req.param("template")}/${c.req.param("scene")}`);
  const jpeg = still ? await fs.readFile(still).catch(() => null) : null;
  if (!jpeg) return c.json({ error: "Not found" }, 404);
  c.header("Content-Type", "image/jpeg");
  c.header("Cache-Control", BYTES_CACHE);
  return c.body(new Uint8Array(jpeg));
});

templateRoutes.get("/:id", async (c) => {
  const record = await getTemplate(c.req.param("id")).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);

  // A client that already has this exact content needs none of it back.
  if (c.req.header("if-none-match") === `"${record.revision}"`) return c.body(null, 304);

  c.header("ETag", `"${record.revision}"`);
  c.header("Cache-Control", JSON_CACHE);
  return c.json(toSummary(record));
});

templateRoutes.get("/:id/files", async (c) => {
  const record = await getTemplate(c.req.param("id")).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);
  try {
    const bundle = await buildRemixBundle(record);
    const client = remixClient(c.req.raw.headers);
    const ip = clientIp(c.req.raw.headers);
    trackServer("template_remix_fetched", {
      distinctId: anonymousDistinctId(c.req.raw.headers),
      properties: {
        template_id: record.meta.id,
        template_title: record.meta.title,
        template_revision: record.revision,
        engine: record.manifest.engine ?? "react",
        file_count: bundle.files.length,
        total_bytes: bundle.totalBytes,
        client: client.name,
        ...(client.version ? { client_version: client.version } : {}),
        // Anonymous by design: no profile per hashed visitor. The address only
        // feeds PostHog's GeoIP, the same as a browser event's would.
        $process_person_profile: false,
        ...(ip ? { $ip: ip } : {}),
      },
    });
    // Short and private, unlike the catalog: a shared cache answering a
    // remix would also swallow the event that counts it.
    c.header("Cache-Control", "private, max-age=60");
    return c.json(bundle);
  } catch (err) {
    // A template that cannot be packaged is a catalog bug, not a bad request —
    // the CI check exists so this never reaches a user, and saying so plainly
    // is better than a 404 that reads as "no such template".
    if (err instanceof TemplateError) return c.json({ error: err.message }, 500);
    throw err;
  }
});

/**
 * Who is remixing: the desktop app and the CLI name themselves in
 * `X-GenMotion-Client` (`desktop/0.0.30`, `cli/0.3.0`); older builds are
 * recognised by their user agent where they have a telling one.
 */
export function remixClient(headers: Headers): { name: string; version?: string } {
  const declared = headers.get("x-genmotion-client")?.trim();
  if (declared) {
    const [name, version] = declared.split("/", 2);
    const known = name && /^(desktop|cli)$/.test(name) ? name : "other";
    return { name: known, ...(version ? { version: version.slice(0, 32) } : {}) };
  }
  const agent = headers.get("user-agent") ?? "";
  if (/genmotion-cli/i.test(agent)) return { name: "cli" };
  if (/Mozilla\//.test(agent)) return { name: "browser" };
  return { name: "other" };
}

/** The website's Remix menu options, as `template_remix_chosen` names them. */
const REMIX_OPTIONS = new Set(["agent_prompt", "cli_command", "desktop_app", "download"]);

/**
 * Per visitor and template, one Slack line per option per window: a person
 * clicking "Copy prompt" five times is one decision, not five.
 */
const INTENT_WINDOW_MS = 10 * 60_000;
/** And a ceiling for the whole feed, so a script hammering this can't flood the channel. */
const INTENT_HOURLY_CAP = 60;
const intentSeen = new Map<string, number>();
let intentHour = { start: 0, count: 0 };

/** Test hook: forget every throttle. */
export function resetRemixIntentThrottle(): void {
  intentSeen.clear();
  intentHour = { start: 0, count: 0 };
}

function intentAllowed(key: string, now = Date.now()): boolean {
  if (now - intentHour.start > 3_600_000) intentHour = { start: now, count: 0 };
  const last = intentSeen.get(key);
  if (last !== undefined && now - last < INTENT_WINDOW_MS) return false;
  if (intentHour.count >= INTENT_HOURLY_CAP) return false;
  intentSeen.set(key, now);
  intentHour.count++;
  if (intentSeen.size > 5_000) {
    for (const [k, at] of intentSeen) if (now - at >= INTENT_WINDOW_MS) intentSeen.delete(k);
  }
  return true;
}

/**
 * The website reports which Remix option someone picked, so it can be posted
 * to the team's Slack feed. Public like the rest of this router (most people
 * remixing have no account), which is why it accepts only a known template
 * and a known option, carries no free text into the message, and is
 * throttled. A signed-in visitor is named from their session cookie; the body
 * can't claim to be anyone.
 */
templateRoutes.post("/:id/remix-intent", async (c) => {
  const record = await getTemplate(c.req.param("id")).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);
  const body = (await c.req.json().catch(() => null)) as { option?: unknown } | null;
  const option = typeof body?.option === "string" ? body.option : "";
  if (!REMIX_OPTIONS.has(option)) return c.json({ error: "Unknown option" }, 400);

  const key = `${anonymousDistinctId(c.req.raw.headers)}|${record.meta.id}|${option}`;
  if (!intentAllowed(key)) return c.body(null, 204);

  // Lazily: the session lookup needs the database, which nothing else in this
  // router touches, and a visitor without a cookie never needs it.
  let user: { name?: string | null; email: string } | null = null;
  if (c.req.header("cookie")) {
    user = await import("../auth")
      .then(({ auth }) => auth.api.getSession({ headers: c.req.raw.headers }))
      .then((session) => session?.user ?? null)
      .catch(() => null);
  }
  notifyRemixIntent({
    user,
    templateId: record.meta.id,
    templateName: record.meta.title,
    option,
    country: c.req.header("cf-ipcountry") ?? c.req.header("x-vercel-ip-country") ?? null,
  });
  return c.body(null, 204);
});

templateRoutes.get("/:id/poster", async (c) => {
  const id = c.req.param("id");
  const record = await getTemplate(id).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);

  const jpeg = await fs.readFile(templatePosterPath(id)).catch(() => null);
  if (!jpeg) return c.json({ error: "Not found" }, 404);

  c.header("Content-Type", "image/jpeg");
  c.header("Cache-Control", c.req.query("v") ? IMMUTABLE : BYTES_CACHE);
  c.header("ETag", `"${record.revision}"`);
  return c.body(new Uint8Array(jpeg));
});

/**
 * The pre-rendered MP4 a gallery/detail page actually plays.
 *
 * Rendered offline by `pnpm --filter @genmotion/templates render-video` (see
 * the `templates` skill), not by this process — this route only ever fetches
 * whatever landed at `templates/<id>/video.mp4` in R2. A template that hasn't
 * been rendered yet 404s here rather than falling back to anything live; the
 * client's job is to hide the player, not paper over a missing render.
 *
 * Range requests are forwarded to the store, same as the project-files proxy
 * (`routes/files.ts`) — what lets a `<video>` seek instead of buffering the
 * whole file from the start.
 */
templateRoutes.get("/:id/video", async (c) => {
  const id = c.req.param("id");
  const record = await getTemplate(id).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);

  try {
    const { body, contentLength, contentRange } = await getObject(
      `templates/${id}/video.mp4`,
      c.req.header("range"),
    );
    const headers: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Cache-Control": c.req.query("v") ? IMMUTABLE : BYTES_CACHE,
      "Accept-Ranges": "bytes",
      ETag: `"${record.revision}"`,
    };
    if (contentLength !== undefined) headers["Content-Length"] = String(contentLength);
    if (contentRange) headers["Content-Range"] = contentRange;
    return new Response(Readable.toWeb(body) as ReadableStream, {
      status: contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "InvalidRange") {
      return c.json({ error: "Range not satisfiable" }, 416);
    }
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * An asset inside a template.
 *
 * Most templates need none of this — the bundler inlines every image a scene
 * imports — but a manifest-declared audio track is referenced by path rather
 * than imported, so the player has to be able to fetch it.
 */
templateRoutes.get("/:id/assets/*", async (c) => {
  const id = c.req.param("id");
  if (!(await getTemplate(id).catch(() => null))) return c.json({ error: "Not found" }, 404);

  // Hono's wildcard keeps the raw path; decode it before it reaches disk, and
  // let `templateAssetPath` be the one place containment is decided.
  const tail = decodeURIComponent(c.req.path.split("/assets/").slice(1).join("/assets/"));
  const absolute = tail ? templateAssetPath(id, tail) : null;
  if (!absolute) return c.json({ error: "Not found" }, 404);

  const bytes = await fs.readFile(absolute).catch(() => null);
  if (!bytes) return c.json({ error: "Not found" }, 404);

  c.header("Content-Type", mimeFor(absolute));
  c.header("Cache-Control", c.req.query("v") ? IMMUTABLE : BYTES_CACHE);
  // Whole-file only: these are small, and the player seeks audio by decoding
  // it rather than by range-requesting a stream.
  c.header("Accept-Ranges", "none");
  return c.body(new Uint8Array(bytes));
});
