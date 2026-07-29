import { randomUUID } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import { db, schema } from "@genmotion/db";
import { env } from "../../env";
import { app } from "../../app";

/**
 * Authenticated requests for the integration suite.
 *
 * Sessions are minted by inserting a `session` row and signing the cookie with
 * better-auth's own `makeSignature` (a public export of `better-auth/crypto`),
 * rather than reimplementing the HMAC. That keeps the helper correct if the
 * signing scheme changes, while avoiding the mailer/verification round-trip a
 * real magic-link sign-in would need.
 *
 * The request still travels the full production path: `requireAuth` calls
 * `auth.api.getSession`, which parses and verifies this cookie and loads the
 * row below — nothing about auth is stubbed.
 */

const COOKIE_NAME = "better-auth.session_token";

export interface TestSession {
  cookie: string;
  userId: string;
  token: string;
}

export async function createSession(
  userId: string,
  activeOrganizationId?: string,
): Promise<TestSession> {
  const token = randomUUID().replace(/-/g, "");
  await db.insert(schema.session).values({
    id: randomUUID(),
    token,
    userId,
    activeOrganizationId: activeOrganizationId ?? null,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });
  const signature = await makeSignature(token, env.BETTER_AUTH_SECRET);
  return { cookie: `${COOKIE_NAME}=${token}.${signature}`, userId, token };
}

/** Spread into a fetch init to authenticate as this session. */
export function asUser(session: TestSession): { headers: Record<string, string> } {
  return { headers: { cookie: session.cookie } };
}

interface RequestOptions {
  as?: TestSession;
  json?: unknown;
  method?: string;
  headers?: Record<string, string>;
}

/** `app.request` with cookie + JSON plumbing folded in. */
export async function request(
  path: string,
  { as, json, method, headers = {} }: RequestOptions = {},
): Promise<Response> {
  const init: RequestInit = {
    method: method ?? (json !== undefined ? "POST" : "GET"),
    headers: {
      ...(as ? { cookie: as.cookie } : {}),
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  };
  return app.request(path, init);
}

/** Convenience: perform the request and parse the body in one step. */
export async function requestJson<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<{ status: number; body: T }> {
  const res = await request(path, options);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body: body as T };
}
