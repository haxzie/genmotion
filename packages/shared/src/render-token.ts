import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A tiny, dependency-free signed token (HMAC-SHA256) that authorizes a renderer
 * to act on exactly ONE subject (an export job, or a project's thumbnail) for a
 * short window. Minted by the render worker when it dispatches to a remote
 * sandbox; verified by the API's render control-plane. NODE-ONLY (node:crypto) —
 * imported via `@genmotion/shared/render-token` so it never reaches the web
 * bundle.
 */
export type RenderTokenScope = "render" | "thumbnail";

interface RenderTokenClaims {
  /** subject id (export job id for render, project id for thumbnail) */
  sub: string;
  /** scope */
  scp: RenderTokenScope;
  /** expiry, unix seconds */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function signRenderToken(
  id: string,
  secret: string,
  opts: { scope?: RenderTokenScope; ttlSeconds?: number } = {},
): string {
  const claims: RenderTokenClaims = {
    sub: id,
    scp: opts.scope ?? "render",
    exp: Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 30 * 60),
  };
  const body = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

/** Returns { id, scope } if the token is valid and unexpired, else null. */
export function verifyRenderToken(
  token: string,
  secret: string,
): { id: string; scope: RenderTokenScope } | null {
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
    if (
      typeof claims.sub !== "string" ||
      (claims.scp !== "render" && claims.scp !== "thumbnail") ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: claims.sub, scope: claims.scp };
  } catch {
    return null;
  }
}
