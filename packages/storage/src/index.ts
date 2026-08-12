import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

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
});

const BUCKET = process.env.S3_BUCKET ?? "genmotion";

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

/** Server-side upload (used by the render worker and the sandbox sync). */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export interface StoredObject {
  key: string;
  size: number;
  lastModified?: Date;
}

/** List every object under a key prefix (paginated). */
export async function listObjects(prefix: string): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
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
 */
export async function getObject(
  key: string,
  range?: string,
): Promise<FetchedObject> {
  const res = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }),
  );
  return {
    body: res.Body as Readable,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
    contentRange: res.ContentRange,
    acceptRanges: res.AcceptRanges,
  };
}

/** Fetch an object fully into a Buffer (used to seed the sandbox). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const { body } = await getObject(key);
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
