import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { app, safeStorage, shell } from "electron";
import {
  DESKTOP_CLIENT_ID,
  DESKTOP_SCOPE,
  type DesktopAuthProvider,
} from "@genmotion/shared";
import type { AuthState, AuthUser, AuthOrganization } from "./shared";

/**
 * Signing the desktop app in, using the OAuth 2.0 Device Authorization Grant.
 *
 * The app cannot receive a redirect, so it asks the API for a code, sends the
 * user to the web app to sign in and approve it, and polls until a session
 * comes back. Everything here runs in the main process on purpose: it has no
 * cookie jar and sends no Origin, which keeps these calls clear of the CSRF
 * and CORS machinery the browser half of the flow lives under, and it keeps
 * the token out of a renderer that evaluates agent-authored scene code.
 *
 * The `genmotion://` deep link only raises the window. Polling is what
 * actually completes the sign-in, so an unregistered scheme — every `pnpm dev`
 * run, and any unsigned build — costs nothing but the wait.
 */

const API_URL = (process.env.GM_CLOUD_API_URL ?? "https://api.genmotion.dev").replace(/\/$/, "");
/** The hosted web app. Also where account pages (billing, settings) live. */
export const WEB_URL = (process.env.GM_CLOUD_WEB_URL ?? "https://genmotion.dev").replace(
  /\/$/,
  "",
);

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
/** RFC 8628's prescribed penalty for polling too eagerly. */
const SLOW_DOWN_STEP_MS = 5_000;

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface SessionResponse {
  user: AuthUser;
  organization: AuthOrganization | null;
}

/**
 * What lands on disk. The token is encrypted where the OS offers a keychain;
 * the flag is stored rather than inferred so a plaintext fallback is visible
 * on inspection instead of silently indistinguishable from ciphertext.
 */
interface StoredAuth {
  token: string;
  encrypted: boolean;
}

function authFile(): string {
  return path.join(app.getPath("userData"), "auth.json");
}

async function readStored(): Promise<string | null> {
  const raw = await fs.readFile(authFile(), "utf8").catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (typeof parsed?.token !== "string" || !parsed.token) return null;
    if (!parsed.encrypted) return parsed.token;
    return safeStorage.decryptString(Buffer.from(parsed.token, "base64"));
  } catch {
    // A token we cannot read is a token we do not have.
    return null;
  }
}

async function writeStored(token: string): Promise<void> {
  const encrypted = safeStorage.isEncryptionAvailable();
  const stored: StoredAuth = {
    token: encrypted ? safeStorage.encryptString(token).toString("base64") : token,
    encrypted,
  };
  await fs.writeFile(authFile(), JSON.stringify(stored), "utf8");
}

async function clearStored(): Promise<void> {
  await fs.rm(authFile(), { force: true });
}

/** How this machine will be labelled in the account's session list. */
function deviceName(): string {
  return `${os.hostname().replace(/\.local$/, "")} · ${os.platform()}`;
}

async function callApi<T>(
  path: string,
  init: { method?: string; json?: unknown; token?: string } = {},
): Promise<{ ok: boolean; status: number; body: T }> {
  // Node's fetch, deliberately — Electron's `net.fetch` carries a cookie jar,
  // which would put these requests back under better-auth's origin check.
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.json !== undefined ? "POST" : "GET"),
    headers: {
      ...(init.json !== undefined ? { "content-type": "application/json" } : {}),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
    ...(init.json !== undefined ? { body: JSON.stringify(init.json) } : {}),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body: body as T };
}

/**
 * Why sign-in could not even begin, in words that point at the actual problem.
 *
 * The failure worth naming is a 404: it means the API is reachable but predates
 * the device-grant endpoints, so every button on the login screen fails
 * identically. "Try again" would send the user in circles — nothing about
 * retrying fixes a deployment.
 */
function describeStartFailure(
  res: { status: number; body: unknown } | null,
): string {
  if (!res) return `Can't reach ${API_URL}. Check your connection.`;
  const described =
    typeof res.body === "object" && res.body !== null
      ? (res.body as { error_description?: string }).error_description
      : undefined;
  if (described) return described;
  if (res.status === 404) {
    return `${API_URL} doesn't support desktop sign-in yet — it needs a newer API deployed.`;
  }
  return `Couldn't start sign-in (HTTP ${res.status}). Try again.`;
}

/** One sign-in attempt. Replaced wholesale when the user starts another. */
interface Attempt {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  provider: DesktopAuthProvider;
  email?: string;
  expiresAt: number;
  intervalMs: number;
  timer: NodeJS.Timeout | null;
  cancelled: boolean;
}

export class DesktopAuth {
  private state: AuthState = { status: "loading" };
  private attempt: Attempt | null = null;
  private listeners = new Set<(state: AuthState) => void>();

  current(): AuthState {
    return this.state;
  }

  onChange(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * An authenticated call to the hosted API, for main-process callers.
   *
   * The token never leaves this class — callers hand over a path, not a
   * credential — which is what keeps it out of the agent tools that use this to
   * reach the chat-plugin endpoints, and out of the renderer entirely.
   *
   * `binary` is for the plugin routes, which answer with the generated media
   * rather than JSON.
   */
  async request<T>(
    path: string,
    init: { method?: string; json?: unknown } = {},
  ): Promise<{ ok: boolean; status: number; body: T }> {
    const token = await readStored();
    if (!token) return { ok: false, status: 401, body: null as T };
    return callApi<T>(path, { ...init, token });
  }

  /**
   * The same, for a response whose body is a file rather than JSON.
   *
   * A failure still parses as JSON, because that is what the API answers with
   * when it refuses — a paywall or a provider error — and the caller needs to
   * read the message out of it.
   */
  async requestBinary(
    path: string,
    init: { method?: string; json?: unknown } = {},
  ): Promise<
    | { ok: true; status: number; bytes: Buffer; mime: string }
    | { ok: false; status: number; body: unknown }
  > {
    const token = await readStored();
    if (!token) return { ok: false, status: 401, body: { error: "Not signed in." } };

    const res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.json !== undefined ? "POST" : "GET"),
      headers: {
        ...(init.json !== undefined ? { "content-type": "application/json" } : {}),
        authorization: `Bearer ${token}`,
      },
      ...(init.json !== undefined ? { body: JSON.stringify(init.json) } : {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        /* a non-JSON error body is still worth reporting verbatim */
      }
      return { ok: false, status: res.status, body };
    }

    return {
      ok: true,
      status: res.status,
      bytes: Buffer.from(await res.arrayBuffer()),
      mime: (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "",
    };
  }

  private set(state: AuthState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }

  /**
   * Check the stored token on launch. There is no refresh token, so a rejected
   * token means the login screen — not a retry.
   */
  async restore(): Promise<void> {
    const token = await readStored();
    if (!token) {
      this.set({ status: "signed-out" });
      return;
    }
    const res = await callApi<SessionResponse>("/api/desktop/session", { token }).catch(
      () => null,
    );
    if (res?.ok) {
      this.set({ status: "signed-in", user: res.body.user, organization: res.body.organization });
      return;
    }
    // Only a 401 means the token is genuinely dead. A network failure (null) or
    // a server-side problem says nothing about the token, and throwing it away
    // would force a browser round-trip the next time things are working.
    if (res?.status === 401) await clearStored();
    this.set({
      status: "signed-out",
      error: res ? undefined : `Can't reach ${API_URL}. Check your connection.`,
    });
  }

  /** Ask for a code, open the browser, and start polling. */
  async start(provider: DesktopAuthProvider, email?: string): Promise<AuthState> {
    this.clearAttempt();

    const res = await callApi<DeviceCodeResponse & { error_description?: string }>(
      "/api/auth/device/code",
      { json: { client_id: DESKTOP_CLIENT_ID, scope: DESKTOP_SCOPE } },
    ).catch(() => null);

    if (!res?.ok) {
      this.set({ status: "signed-out", error: describeStartFailure(res) });
      return this.state;
    }

    const url = new URL(res.body.verification_uri_complete);
    // The provider hint is what makes the button pressed here mean something
    // over there — without it the user picks a provider twice.
    url.searchParams.set("provider", provider);
    if (email) url.searchParams.set("email", email);

    this.attempt = {
      deviceCode: res.body.device_code,
      userCode: res.body.user_code,
      verificationUrl: url.toString(),
      provider,
      email,
      expiresAt: Date.now() + res.body.expires_in * 1000,
      intervalMs: Math.max(res.body.interval, 1) * 1000,
      timer: null,
      cancelled: false,
    };

    this.set({
      status: "pending",
      provider,
      userCode: res.body.user_code,
      verificationUrl: this.attempt.verificationUrl,
      email,
      expiresAt: this.attempt.expiresAt,
    });

    await shell.openExternal(this.attempt.verificationUrl);
    this.schedule(this.attempt.intervalMs);
    return this.state;
  }

  /** Reopen the browser for the attempt already in flight. */
  async openBrowser(): Promise<void> {
    if (this.attempt) await shell.openExternal(this.attempt.verificationUrl);
  }

  /** Stop polling without saying anything about it. */
  private clearAttempt(): void {
    if (!this.attempt) return;
    this.attempt.cancelled = true;
    if (this.attempt.timer) clearTimeout(this.attempt.timer);
    this.attempt = null;
  }

  /** The user backed out — drop the attempt and say so. */
  cancel(): void {
    const had = this.attempt !== null;
    this.clearAttempt();
    if (had && this.state.status === "pending") this.set({ status: "signed-out" });
  }

  /**
   * The deep link landed, so approval almost certainly just happened — poll now
   * rather than sitting out the rest of the interval.
   */
  pollNow(): void {
    if (this.attempt) this.schedule(0);
  }

  async signOut(): Promise<void> {
    const token = await readStored();
    if (token) {
      // Best effort: a network failure must not strand the user in a signed-in
      // shell they cannot leave.
      await callApi("/api/auth/sign-out", { method: "POST", token }).catch(() => null);
    }
    await clearStored();
    this.clearAttempt();
    this.set({ status: "signed-out" });
  }

  private schedule(delayMs: number): void {
    const attempt = this.attempt;
    if (!attempt) return;
    if (attempt.timer) clearTimeout(attempt.timer);
    attempt.timer = setTimeout(() => void this.poll(attempt), delayMs);
  }

  private async poll(attempt: Attempt): Promise<void> {
    if (attempt.cancelled || this.attempt !== attempt) return;

    if (Date.now() > attempt.expiresAt) {
      this.fail(attempt, "That code expired. Try signing in again.");
      return;
    }

    const res = await callApi<{ access_token?: string; error?: string }>(
      "/api/auth/device/token",
      {
        json: {
          grant_type: GRANT_TYPE,
          device_code: attempt.deviceCode,
          client_id: DESKTOP_CLIENT_ID,
        },
      },
    ).catch(() => null);

    if (attempt.cancelled || this.attempt !== attempt) return;

    // Network blip: keep waiting rather than throwing away a code the user may
    // be about to approve.
    if (!res) {
      this.schedule(attempt.intervalMs);
      return;
    }

    if (res.ok && res.body.access_token) {
      await this.adopt(res.body.access_token);
      return;
    }

    switch (res.body.error) {
      case "authorization_pending":
        this.schedule(attempt.intervalMs);
        return;
      case "slow_down":
        attempt.intervalMs += SLOW_DOWN_STEP_MS;
        this.schedule(attempt.intervalMs);
        return;
      case "access_denied":
        this.fail(attempt, "Sign-in was declined in the browser.");
        return;
      case "expired_token":
        this.fail(attempt, "That code expired. Try signing in again.");
        return;
      default:
        this.fail(attempt, "Sign-in failed. Try again.");
    }
  }

  private fail(attempt: Attempt, error: string): void {
    if (attempt.timer) clearTimeout(attempt.timer);
    this.attempt = null;
    this.set({ status: "signed-out", error });
  }

  /** Token in hand: persist it, name the session, and let the UI through. */
  private async adopt(token: string): Promise<void> {
    // clearAttempt, not cancel: broadcasting "signed-out" here would flash the
    // login screen in the instant between the token arriving and the profile.
    this.clearAttempt();
    await writeStored(token);
    const res = await callApi<SessionResponse>("/api/desktop/session", {
      token,
      json: { deviceName: deviceName() },
    }).catch(() => null);

    if (!res?.ok) {
      await clearStored();
      this.set({ status: "signed-out", error: "Signed in, but couldn't load your account." });
      return;
    }
    this.set({ status: "signed-in", user: res.body.user, organization: res.body.organization });
  }
}

export const desktopAuth = new DesktopAuth();
