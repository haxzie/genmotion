import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

/**
 * Short-lived, dependency-free signed token (HMAC-SHA256) that authorizes an
 * admin to call the `/api/admin/*` data APIs. Minted by `POST /api/admin/session`
 * after a Google-OAuth session's email domain is verified, and checked by the
 * `requireAdmin` middleware. Signed AND verified only here (the web treats it as
 * opaque), so it never needs to leave the API. Mirrors `render-token.ts`.
 */
interface AdminTokenClaims {
  /** user id */
  sub: string;
  /** admin email (re-checked against the allowlist on verify) */
  email: string;
  /** expiry, unix seconds */
  exp: number;
}

const TTL_SECONDS = 8 * 60 * 60; // 8 hours

const secret = () => env.ADMIN_JWT_SECRET ?? env.BETTER_AUTH_SECRET;
const b64url = (buf: Buffer) => buf.toString("base64url");

export function signAdminToken(user: { id: string; email: string }): string {
  const claims: AdminTokenClaims = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

/** Returns { userId, email } if the token is valid and unexpired, else null. */
export function verifyAdminToken(
  token: string,
): { userId: string; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64url(createHmac("sha256", secret()).update(body!).digest());
  const a = Buffer.from(sig!);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(body!, "base64url").toString(),
    ) as AdminTokenClaims;
    if (
      typeof claims.sub !== "string" ||
      typeof claims.email !== "string" ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}
