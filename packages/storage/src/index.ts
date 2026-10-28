import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import type { Readable } from "node:stream";

/**
 * How long to wait for a socket before giving up on the store.
 *
 * The SDK ships with NO timeouts at all — `connectionTimeout` and
 * `socketTimeout` both default to 0, meaning infinite. That is not a
 * theoretical problem: it is how a store that has become unreachable (DNS,
 * a firewall, an exhausted pool) turns into a route that hangs forever
 * instead of returning 502, and the API's streaming proxies all `await` the
 * fetch before they write a single header, so the client gets no response at
 * all — just a gateway timeout a hundred seconds later.
 *
 * `connectionTimeout` covers waiting for a socket from the agent's pool as
 * well as the TCP connect, because the handler only clears its timer once
 * the request has an attached, connected socket. That is the one that makes
 * pool starvation visible rather than silent.
 */
const CONNECTION_TIMEOUT_MS = 5_000;
/**
 * Inactivity, NOT total duration — the handler sets this on the socket, so it
 * fires only when a transfer stalls. Deliberately not `requestTimeout`, which
 * is a wall-clock cap on the whole request and would cut off a large object
 * mid-stream on a slow connection.
 */
const SOCKET_TIMEOUT_MS = 30_000;
/**
 * Node's default agent allows 50 sockets per origin, and a single gallery
 * page can start more video reads than that. Every one of them holds its
 * socket for as long as the read runs, so the default turns a busy page into
 * a queue that `CONNECTION_TIMEOUT_MS` then has to drain.
 */
const MAX_SOCKETS = 200;

const agentOptions = { keepAlive: true, maxSockets: MAX_SOCKETS };

/**
 * The MinIO dev default is right for a laptop and catastrophic in production:
 * unset in a container, every read goes to a localhost port nothing is
 * listening on. Same reasoning as the `API_URL` complaint below — say so at
 * boot rather than letting it surface as a route that does not work.
 *
 * Logged, not thrown: a hard failure here takes the whole API down, which
 * turns a storage misconfiguration into an outage of everything else too.
 */
if (process.env.NODE_ENV === "production" && !process.env.S3_ENDPOINT) {
  console.error(
    "[storage] S3_ENDPOINT is not set in production — falling back to the " +
      "MinIO dev default (http://localhost:9000). Every object read and " +
      "write from this process will fail.",
  );
}

/**
 * S3-compatible storage: MinIO in dev, Cloudflare R2 (or any S3) in prod.
 * Path-style addressing keeps MinIO URLs working; R2 accepts it too.
 *
 * Credentials read the standard AWS_* names first (what R2 dashboards hand
 * out), then the legacy S3_* names, then the MinIO dev defaults.
 */
const client = new S3Client({
  region:
    process.env.AWS_REGION ?? process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId:
      process.env.AWS_ACCESS_KEY_ID ??
      process.env.S3_ACCESS_KEY_ID ??
      "minioadmin",
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY ??
      process.env.S3_SECRET_ACCESS_KEY ??
      "minioadmin",
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    httpAgent: new HttpAgent(agentOptions),
    httpsAgent: new HttpsAgent(agentOptions),
  }),
});

const BUCKET = process.env.S3_BUCKET ?? "genmotion";

/**
 * The bucket holding things anyone may read — today, template video.
 *
 * Separate from `BUCKET` on purpose, and the separation is the security
 * boundary rather than a convention. The main bucket holds `projects/`,
 * `shares/` and `thumbnails/` alongside `templates/`, and the only thing
 * keeping a customer's project files private is that every read goes through
 * an authenticated, org-scoped API route. Putting a public hostname on that
 * bucket to serve templates from the edge would make all of it world-
 * readable off guessable keys. A bucket that holds nothing private cannot
 * leak anything private, however its hostname is configured.
 *
 * Defaults to the main bucket, which keeps dev (one MinIO, one bucket)
 * working and means an unset value is never a leak — only a missed
 * optimisation.
 *
 * If you do set it, it MUST be the bucket `TEMPLATES_CDN_URL`'s hostname
 * serves. `render-video.mjs` writes here, and with a CDN configured the API
 * only ever redirects — it never reads the bucket back — so pointing the two
 * at different buckets means re-rendered videos land somewhere the edge is
 * not serving from, and the old ones play forever with nothing in any log to
 * say why.
 */
export const PUBLIC_BUCKET = process.env.TEMPLATES_BUCKET ?? BUCKET;

/**
 * Base URL of the API server, which proxies object reads (R2 isn't public).
 *
 * This is load-bearing in a way that is easy to miss: `publicUrl()` bakes an
 * ABSOLUTE url into every row it produces — `projects.thumbnailUrl`,
 * `assets.url`, export urls — at write time. So an unset value here does not
 * degrade, it silently persists `http://localhost:4001/...` into the database
 * forever, and every one of those rows has to be rewritten to fix it.
 *
 * Hence: complain loudly rather than fall back silently. The env var is
 * optional in `apps/api/src/env.ts` and this package reads `process.env`
 * directly, so this is the only place it gets checked.
 *
 * This logs rather than throws on purpose: a hard failure here takes the API
 * down at boot, which turns a bad-URL problem into an outage. Once API_URL is
 * set everywhere, this is worth promoting to a throw in production.
 */
const API_URL_RAW = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

if (!API_URL_RAW) {
  console.error(
    "[storage] Neither API_URL nor NEXT_PUBLIC_API_URL is set — falling back " +
      "to http://localhost:4001. publicUrl() writes ABSOLUTE urls into the " +
      "database, so every thumbnail, asset and export saved from this process " +
      "will be permanently unreachable. Set API_URL.",
  );
}

const API_URL = (API_URL_RAW ?? "http://localhost:4001").replace(/\/$/, "");

/** Storage key prefix holding a project's user-facing + agent-generated files. */
export function projectFilesPrefix(projectId: string): string {
  return `projects/${projectId}/files/`;
}

/** Storage key for a named file inside a project's files folder. */
export function projectFileKey(projectId: string, name: string): string {
  return `${projectFilesPrefix(projectId)}${name.replace(/^\/+/, "")}`;
}

/**
 * URL a browser/renderer can fetch an object from. Project-scoped keys
 * (`projects/<id>/<rest>`) are routed through the API file proxy under the
 * `assets` namespace; anything else falls back to the raw endpoint (dev/MinIO).
 * Note `<rest>` typically starts with the `files/` folder, so a project upload
 * resolves to `/api/projects/<id>/assets/files/<name>`.
 */
export function publicUrl(key: string): string {
  const match = key.match(/^projects\/([^/]+)\/(.+)$/);
  if (match) {
    const [, projectId, rest] = match;
    const encoded = rest!.split("/").map(encodeURIComponent).join("/");
    // Rendered exports get their own /exports/ route; other project files
    // (uploads, generated media) go through the /assets/ proxy namespace.
    if (rest!.startsWith("exports/")) {
      return `${API_URL}/api/projects/${projectId}/${encoded}`;
    }
    return `${API_URL}/api/projects/${projectId}/assets/${encoded}`;
  }
  const endpoint = (process.env.S3_ENDPOINT ?? "http://localhost:9000").replace(
    /\/$/,
    "",
  );
  return `${endpoint}/${BUCKET}/${key}`;
}

/** Presigned PUT URL the browser uploads directly to. */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSeconds = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * A presigned GET, for handing a large object straight to the client.
 *
 * The counterpart to `presignUpload`, and used for the same reason: a file the
 * API would otherwise have to read into memory and pipe through itself. A
 * redirect costs us nothing and the bytes never touch the process.
 */
export async function presignDownload(
  key: string,
  expiresInSeconds = 600,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Size and type of a stored object, or null if it isn't there.
 *
 * Exists because an upload that went straight to storage never passed through
 * us: the only thing that said how big it would be was the client, and a
 * client's claim about what it just wrote is not a fact. This is how the
 * server checks.
 */
export async function headObject(
  key: string,
  bucket: string = BUCKET,
): Promise<{ sizeBytes: number; contentType?: string } | null> {
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      sizeBytes: res.ContentLength ?? 0,
      ...(res.ContentType ? { contentType: res.ContentType } : {}),
    };
  } catch {
    return null;
  }
}

/** Server-side upload (used by the render worker and the sandbox sync). */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  bucket: string = BUCKET,
): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrl(key);
}

/**
 * Server-side copy between buckets — the store moves the bytes, nothing is
 * downloaded. Used to seed the public bucket from the main one.
 */
export async function copyObject(
  key: string,
  fromBucket: string,
  toBucket: string,
): Promise<void> {
  await client.send(
    new CopyObjectCommand({
      Bucket: toBucket,
      Key: key,
      CopySource: `${fromBucket}/${key}`,
    }),
  );
}

/** The bucket everything private lives in. Exported for the bucket-split tooling. */
export const PRIVATE_BUCKET = BUCKET;

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export interface StoredObject {
  key: string;
  size: number;
  lastModified?: Date;
}

/** List every object under a key prefix (paginated). */
export async function listObjects(
  prefix: string,
  bucket: string = BUCKET,
): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      out.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified,
      });
    }
    continuationToken = res.IsTruncated
      ? res.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return out;
}

export interface FetchedObject {
  body: Readable;
  contentType?: string;
  /** Bytes in `body` — the slice length when a range was requested. */
  contentLength?: number;
  /** Set only for a satisfied range request, e.g. `bytes 0-1023/204800`. */
  contentRange?: string;
  acceptRanges?: string;
}

/**
 * Fetch an object as a stream plus metadata — used by the API file proxy.
 *
 * `range` is a raw HTTP Range header value (`bytes=0-1023`) forwarded to the
 * store; S3, R2 and MinIO all honour it. When it is satisfied the response
 * carries `contentRange` and the body is just that slice, which is what lets
 * the proxy answer 206 and browsers seek within a video.
 *
 * `signal` should be the incoming request's own (`c.req.raw.signal`), and
 * every streaming proxy is expected to pass it. Without it an abandoned read
 * — a gallery tile the pointer moved off, a tab closed mid-video — runs to
 * completion against the store with nobody at the other end, holding its
 * socket the whole time. At 50 sockets per origin that is how one page of
 * hover previews starves every other caller.
 */
export interface GetObjectOptions {
  /** A raw HTTP Range header value, forwarded to the store. */
  range?: string;
  /** The incoming request's signal — see the note on `getObject`. */
  signal?: AbortSignal;
  /** Defaults to the main bucket; `PUBLIC_BUCKET` for anything world-readable. */
  bucket?: string;
}

export async function getObject(
  key: string,
  { range, signal, bucket = BUCKET }: GetObjectOptions = {},
): Promise<FetchedObject> {
  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }),
    { abortSignal: signal },
  );
  const body = res.Body as Readable;
  // The signal above only covers reaching the point of a response. Tearing
  // the body down as well is what actually returns the socket, and whether
  // cancelling the web stream the proxy wraps this in propagates that far is
  // not something worth depending on.
  if (signal) {
    if (signal.aborted) body.destroy();
    else signal.addEventListener("abort", () => body.destroy(), { once: true });
  }
  return {
    body,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
    contentRange: res.ContentRange,
    acceptRanges: res.AcceptRanges,
  };
}

/**
 * True when the store answered "nothing is stored at that key".
 *
 * Worth distinguishing, because the proxies on top of this one used to turn
 * every failure into 404: a store that could not be reached at all reported
 * itself as a missing file, which is a plausible enough answer that nobody
 * looks further. Anything that is not this should be a 502 — it is the
 * server that is broken, not the request.
 */
export function isMissingObject(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === "NoSuchKey" ||
    e?.name === "NotFound" ||
    e?.$metadata?.httpStatusCode === 404
  );
}

/** Fetch an object fully into a Buffer (used to seed the sandbox). */
export async function getObjectBuffer(
  key: string,
  options: GetObjectOptions = {},
): Promise<Buffer> {
  const { body } = await getObject(key, options);
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * How long a read is worth waiting for when the object is only a cache.
 *
 * Short on purpose. The callers below all have a slower source of truth to
 * fall back to, so a store that is merely slow should cost a few seconds and
 * a re-fetch, not the whole request.
 */
const CACHE_READ_TIMEOUT_MS = 3_000;

/**
 * Read an object that is only ever a cache: null for a miss, and null for a
 * failure too.
 *
 * Exists because `getObjectBuffer(key).catch(() => null)` reads like it
 * already does this and does not. A `catch` only runs if the promise
 * rejects, and a store that has become unreachable does not reject — it
 * hangs, for as long as whatever is above it will wait. That is how an
 * unreachable bucket took out the voice picker's previews: the fallback that
 * would have fetched them from the source was sitting behind a read that
 * never finished.
 */
export async function getCachedObject(key: string): Promise<Buffer | null> {
  return getObjectBuffer(key, {
    signal: AbortSignal.timeout(CACHE_READ_TIMEOUT_MS),
  }).catch(() => null);
}
