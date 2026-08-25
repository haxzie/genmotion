import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, schema } from "@genmotion/db";
import { DESKTOP_CLIENT_ID, DESKTOP_SCOPE } from "@genmotion/shared";
import { signAdminToken } from "../admin/token";
import { env } from "../env";
import { dbReady, truncateAll } from "./helpers/db";
import { createSession, request, requestJson, type TestSession } from "./helpers/http";
import { createOrg, createUser } from "./helpers/factories";

/**
 * The desktop sign-in flow, end to end (RFC 8628).
 *
 * Three parties are involved and only two of them are the browser, so the
 * tests mirror that split: calls the desktop app makes carry no cookie and no
 * Origin (it is a Node process), while calls the web page makes carry both.
 * better-auth's CSRF check keys off exactly that difference, so getting it
 * wrong here would hide a real failure.
 */

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

/** As the desktop app: no cookie, no Origin. */
function requestDeviceCode(clientId: string = DESKTOP_CLIENT_ID) {
  return requestJson<DeviceCodeResponse>("/api/auth/device/code", {
    json: { client_id: clientId, scope: DESKTOP_SCOPE },
  });
}

function pollForToken(deviceCode: string) {
  return requestJson<Record<string, string>>("/api/auth/device/token", {
    json: { grant_type: GRANT_TYPE, device_code: deviceCode, client_id: DESKTOP_CLIENT_ID },
  });
}

/**
 * As the web page. The Origin header is not decoration: better-auth only runs
 * its origin check on cookie-bearing requests, and a browser always sends one.
 */
function asBrowser(session: TestSession) {
  return { headers: { cookie: session.cookie, origin: env.WEB_URL } };
}

/** Claim the code for the signed-in user — what GET /device does on page load. */
function claim(userCode: string, session: TestSession) {
  return requestJson(`/api/auth/device?user_code=${userCode}`, asBrowser(session));
}

function approve(userCode: string, session: TestSession) {
  return requestJson("/api/auth/device/approve", { ...asBrowser(session), json: { userCode } });
}

function bearer(token: string) {
  return { headers: { authorization: `Bearer ${token}` } };
}

/**
 * Pretend the last poll was a while ago. The rate limiter compares against
 * `lastPolledAt`, so this is how a second poll is tested without spending the
 * interval sleeping.
 */
function agePoll(deviceCode: string) {
  return db
    .update(schema.deviceCode)
    .set({ lastPolledAt: new Date(Date.now() - 60_000) })
    .where(eq(schema.deviceCode.deviceCode, deviceCode));
}

/** A user with an org, plus a browser session for them. */
async function signedInUser() {
  const { orgId, ownerId } = await createOrg();
  return { orgId, ownerId, session: await createSession(ownerId, orgId) };
}

describe.skipIf(!dbReady)("device authorization", () => {
  beforeEach(truncateAll);

  it("issues a code pointing at the web verification page", async () => {
    const { status, body } = await requestDeviceCode();
    expect(status).toBe(200);
    expect(body.user_code).toHaveLength(8);
    expect(body.verification_uri).toBe(`${env.WEB_URL}/device`);
    expect(body.verification_uri_complete).toBe(
      `${env.WEB_URL}/device?user_code=${body.user_code}`,
    );
    expect(body.interval).toBe(3);
  });

  it("rejects a client id that is not the desktop app", async () => {
    const { status, body } = await requestDeviceCode("someone-elses-app");
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: "invalid_client" });
  });

  it("signs the desktop in and hands back a working Bearer token", async () => {
    const { orgId, ownerId, session } = await signedInUser();
    const { body: device } = await requestDeviceCode();

    expect((await claim(device.user_code, session)).status).toBe(200);
    expect((await approve(device.user_code, session)).status).toBe(200);

    const { status, body } = await pollForToken(device.device_code);
    expect(status).toBe(200);
    expect(body.token_type).toBe("Bearer");
    expect(body.access_token).toBeTruthy();

    // The token is a real session, org-scoped by the same hook the web app uses.
    const me = await requestJson<{ user: { id: string }; organization: { id: string } }>(
      "/api/desktop/session",
      bearer(body.access_token!),
    );
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(ownerId);
    expect(me.body.organization.id).toBe(orgId);

    // Single use: the row is consumed, so a replayed device code buys nothing.
    expect((await pollForToken(device.device_code)).status).toBe(400);
  });

  it("tells the app to keep waiting until the browser approves", async () => {
    const { session } = await signedInUser();
    const { body: device } = await requestDeviceCode();

    const pending = await pollForToken(device.device_code);
    expect(pending.status).toBe(400);
    expect(pending.body).toMatchObject({ error: "authorization_pending" });

    await claim(device.user_code, session);
    await agePoll(device.device_code);
    // Claimed but not approved is still pending — opening the link is not consent.
    expect((await pollForToken(device.device_code)).body).toMatchObject({
      error: "authorization_pending",
    });
  });

  it("asks the app to slow down when it polls faster than the interval", async () => {
    const { body: device } = await requestDeviceCode();
    await pollForToken(device.device_code);
    const { body } = await pollForToken(device.device_code);
    expect(body).toMatchObject({ error: "slow_down" });
  });

  it("refuses approval from a user who did not claim the code", async () => {
    const { session: claimer } = await signedInUser();
    const { session: stranger } = await signedInUser();
    const { body: device } = await requestDeviceCode();

    await claim(device.user_code, claimer);
    const { status } = await approve(device.user_code, stranger);
    expect(status).toBe(403);
  });

  it("refuses approval from a signed-out browser", async () => {
    const { body: device } = await requestDeviceCode();
    const { status } = await requestJson("/api/auth/device/approve", {
      json: { userCode: device.user_code },
    });
    expect(status).toBe(401);
  });

  it("expires a code that sat unused", async () => {
    const { session } = await signedInUser();
    const { body: device } = await requestDeviceCode();
    await db
      .update(schema.deviceCode)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.deviceCode.deviceCode, device.device_code));

    expect((await claim(device.user_code, session)).body).toMatchObject({
      error: "expired_token",
    });
    expect((await pollForToken(device.device_code)).body).toMatchObject({
      error: "expired_token",
    });
  });

  it("stops honouring the token once the desktop signs out", async () => {
    const { session } = await signedInUser();
    const { body: device } = await requestDeviceCode();
    await claim(device.user_code, session);
    await approve(device.user_code, session);
    const { body } = await pollForToken(device.device_code);
    const token = body.access_token!;

    expect((await requestJson("/api/desktop/session", bearer(token))).status).toBe(200);
    expect(
      (await requestJson("/api/auth/sign-out", { method: "POST", ...bearer(token) })).status,
    ).toBe(200);
    expect((await requestJson("/api/desktop/session", bearer(token))).status).toBe(401);
  });
});

describe.skipIf(!dbReady)("desktop session route", () => {
  beforeEach(truncateAll);

  /** Straight to a Bearer credential, skipping the browser half of the dance. */
  async function desktopToken() {
    const { orgId, ownerId, session } = await signedInUser();
    const { body: device } = await requestDeviceCode();
    await claim(device.user_code, session);
    await approve(device.user_code, session);
    const { body } = await pollForToken(device.device_code);
    return { token: body.access_token!, orgId, ownerId };
  }

  it("rejects an unauthenticated request", async () => {
    expect((await requestJson("/api/desktop/session")).status).toBe(401);
  });

  it("still refuses an admin token on a product route", async () => {
    const user = await createUser({ email: `admin-${Date.now()}@genmotion.dev` });
    const { status } = await requestJson("/api/desktop/session", {
      headers: { authorization: `Bearer ${signAdminToken({ id: user.id, email: user.email })}` },
    });
    expect(status).toBe(401);
  });

  it("names the session so the device is recognisable in the account", async () => {
    const { token } = await desktopToken();
    const { status } = await requestJson("/api/desktop/session", {
      ...bearer(token),
      json: { deviceName: "Kestrel · darwin" },
    });
    expect(status).toBe(200);

    const [row] = await db
      .select({ userAgent: schema.session.userAgent })
      .from(schema.session)
      .where(eq(schema.session.token, token));
    expect(row?.userAgent).toBe("Kestrel · darwin");
  });
});

describe.skipIf(!dbReady)("bearer plugin exposure", () => {
  beforeEach(truncateAll);

  /**
   * Enabling the bearer plugin makes better-auth echo the raw session token
   * back in a `set-auth-token` header and expose it to cross-origin JS. The web
   * app is cross-origin to the API, so leaving that in place would put the
   * session token within reach of any script on the page — exactly what the
   * httpOnly cookie is there to prevent.
   */
  it("never returns the session token in a response header", async () => {
    const { ownerId, session } = await signedInUser();
    const { body: device } = await requestDeviceCode();
    await claim(device.user_code, session);
    await approve(device.user_code, session);

    // The one response that mints a session, and so the one most likely to
    // carry the header.
    const minted = await request("/api/auth/device/token", {
      json: {
        grant_type: GRANT_TYPE,
        device_code: device.device_code,
        client_id: DESKTOP_CLIENT_ID,
      },
    });
    expect(minted.headers.get("set-auth-token")).toBeNull();
    expect(minted.headers.get("access-control-expose-headers") ?? "").not.toContain(
      "set-auth-token",
    );

    // And on an ordinary cookie-authenticated read.
    const read = await request("/api/auth/get-session", { as: session });
    expect(read.headers.get("set-auth-token")).toBeNull();
    expect(ownerId).toBeTruthy();
  });
});
