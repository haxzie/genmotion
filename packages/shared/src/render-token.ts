import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A tiny, dependency-free signed token (HMAC-SHA256) that authorizes a renderer
 * to act on exactly ONE export job for a short window. Minted by the render
 * worker when it dispatches a job to a remote sandbox; verified by the API's
 * render control-plane. This is NODE-ONLY (uses node:crypto) — imported via the
 * `@genmotion/shared/render-token` subpath so it never reaches the web bundle.
 */
interface RenderTokenClaims {
  /** export job id */
  jid: string;
  /** expiry, unix seconds */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function signRenderToken(
  jobId: string,
  secret: string,
  ttlSeconds = 30 * 60,
): string {
  const claims: RenderTokenClaims = {
    jid: jobId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

/** Returns the job id if the token is valid and unexpired, else null. */
export function verifyRenderToken(
  token: string,
  secret: string,
): { jobId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64url(createHmac("sha256", secret).update(body!).digest());
  const a = Buffer.from(sig!);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(body!, "base64url").toString(),
    ) as RenderTokenClaims;
    if (typeof claims.jid !== "string" || typeof claims.exp !== "number") {
      return null;
    }
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { jobId: claims.jid };
  } catch {
    return null;
  }
}
