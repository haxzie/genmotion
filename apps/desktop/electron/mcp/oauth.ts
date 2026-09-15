import { randomBytes } from "node:crypto";
import { shell } from "electron";
import {
  discoverAuthorizationServerMetadata,
  discoverOAuthProtectedResourceMetadata,
  type OAuthClientProvider,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { checkResourceAllowed, resourceUrlFromServerUrl } from "@modelcontextprotocol/sdk/shared/auth-utils.js";
import { mainDomain } from "@genmotion/shared";
import { getSecrets, setSecrets } from "./store";

/**
 * OAuth for a remote MCP server, done the way a desktop app has to.
 *
 * The SDK drives the flow — discovery, dynamic client registration, PKCE,
 * refresh — and asks this provider for the parts only the app can answer:
 * where to send the browser, where the server should send it back, and where
 * to keep what comes out. The redirect lands on the loopback server; its
 * `state` is the only thing that ties the callback to a server, so it is
 * random per attempt and consumed once.
 *
 * The redirect URL changes every launch (the port is ephemeral), so a client
 * registered last week names a redirect the server would now reject. Every
 * user-initiated "Authenticate" therefore registers afresh; a refresh, which
 * carries no redirect, keeps the stored client.
 */

/** Thrown in place of opening the browser when nobody asked for it. */
export class AuthRequiredError extends Error {
  constructor() {
    super("This server needs you to authenticate.");
    this.name = "AuthRequiredError";
  }
}

/** Where the browser is sent back to. Set once the loopback server has a port. */
let callbackUrl: string | null = null;

export function setCallbackUrl(url: string): void {
  callbackUrl = url;
}

export function getCallbackUrl(): string {
  if (!callbackUrl) throw new Error("The MCP OAuth callback is not ready yet.");
  return callbackUrl;
}

interface PendingAuth {
  serverId: string;
  startedAt: number;
}

/** `state` → which server is waiting on the browser. */
const pending = new Map<string, PendingAuth>();

/** A browser tab left open for an hour is not coming back. */
const PENDING_TTL_MS = 60 * 60 * 1000;

function prunePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [state, entry] of pending) {
    if (entry.startedAt < cutoff) pending.delete(state);
  }
}

/** The server a callback belongs to, or null when the state is unknown. Consumes it. */
export function takePending(state: string): string | null {
  prunePending();
  const entry = pending.get(state);
  if (!entry) return null;
  pending.delete(state);
  return entry.serverId;
}

export function hasPendingAuth(serverId: string): boolean {
  prunePending();
  for (const entry of pending.values()) {
    if (entry.serverId === serverId) return true;
  }
  return false;
}

/**
 * Where an authorization server that takes URL client ids (SEP-991) fetches
 * our client metadata. Always the hosted API — the document has to be public
 * and HTTPS, which a local stack is not — unless a dev points it at a tunnel.
 */
const CLIENT_METADATA_URL =
  process.env.GM_MCP_CLIENT_METADATA_URL ?? "https://api.genmotion.dev/api/mcp/oauth-client";

/**
 * Whether to identify by URL client id rather than register.
 *
 * Registration is the better-trodden path — it names today's exact loopback
 * port, and every server that offers it accepted ours — so it wins whenever
 * the authorization server has a registration endpoint. The URL client id
 * is for the ones that have none (ElevenLabs). Any failure to find out
 * answers "register", which is what the SDK would have done anyway.
 */
export async function useUrlClientId(serverUrl: string): Promise<boolean> {
  try {
    const resource = await discoverOAuthProtectedResourceMetadata(serverUrl).catch(() => undefined);
    const authServer = resource?.authorization_servers?.[0] ?? new URL(serverUrl).origin;
    const metadata = await discoverAuthorizationServerMetadata(authServer);
    if (!metadata) return false;
    return !metadata.registration_endpoint && metadata.client_id_metadata_document_supported === true;
  } catch {
    return false;
  }
}

export function createProvider(
  serverId: string,
  options: { interactive: boolean; urlClientId?: boolean },
): OAuthClientProvider {
  const redirectUrl = getCallbackUrl();
  return {
    get redirectUrl() {
      return redirectUrl;
    },
    ...(options.urlClientId ? { clientMetadataUrl: CLIENT_METADATA_URL } : {}),
    get clientMetadata(): OAuthClientMetadata {
      return {
        client_name: "GenMotion",
        client_uri: "https://genmotion.dev",
        redirect_uris: [redirectUrl],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        // No `token_endpoint_auth_method`: servers differ — Figma issues a
        // secret and refuses `none`, others accept only `none` — and the SDK
        // picks from what the registration answers with. A secret ends up in
        // the same encrypted file as the tokens, so nothing is lost by taking
        // one.
      };
    },
    state() {
      const state = randomBytes(24).toString("base64url");
      pending.set(state, { serverId, startedAt: Date.now() });
      return state;
    },
    async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
      return (await getSecrets(serverId)).oauth?.clientInformation;
    },
    async saveClientInformation(clientInformation) {
      await setSecrets(serverId, (current) => ({
        ...current,
        oauth: { ...current.oauth, clientInformation },
      }));
    },
    async tokens(): Promise<OAuthTokens | undefined> {
      return (await getSecrets(serverId)).oauth?.tokens;
    },
    async saveTokens(tokens) {
      await setSecrets(serverId, (current) => ({
        ...current,
        oauth: {
          ...current.oauth,
          tokens,
          expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        },
      }));
    },
    async redirectToAuthorization(authorizationUrl) {
      // A probe on launch, or a turn about to start, must not throw a browser
      // window at the user. Only "Authenticate" may.
      if (!options.interactive) throw new AuthRequiredError();
      await shell.openExternal(authorizationUrl.toString());
    },
    async saveCodeVerifier(codeVerifier) {
      await setSecrets(serverId, (current) => ({
        ...current,
        oauth: { ...current.oauth, codeVerifier },
      }));
    },
    async codeVerifier() {
      const verifier = (await getSecrets(serverId)).oauth?.codeVerifier;
      if (!verifier) throw new Error("No authorization is in progress for this server.");
      return verifier;
    },
    /**
     * Which resource to ask a token for.
     *
     * The SDK's own check wants the server's protected-resource metadata to
     * name the URL we connected to, or its origin. A vendor that routes by
     * region — ElevenLabs answers on `api.elevenlabs.io` but names
     * `api.us.elevenlabs.io` as the resource — fails that check for no
     * reason a user could fix. So: the SDK's rule first, and failing that,
     * accept a resource on the same site (same registrable domain, same
     * path) — a token scoped to the vendor's own regional host is what they
     * asked for, not a token leaking to a stranger.
     */
    async validateResourceURL(serverUrl, resource) {
      const requested = resourceUrlFromServerUrl(serverUrl);
      if (!resource) return undefined;
      if (checkResourceAllowed({ requestedResource: requested, configuredResource: resource })) {
        return new URL(resource);
      }
      const configured = new URL(resource);
      const sameSite =
        configured.protocol === requested.protocol &&
        mainDomain(configured.hostname) !== null &&
        mainDomain(configured.hostname) === mainDomain(requested.hostname) &&
        configured.pathname.replace(/\/$/, "") === requested.pathname.replace(/\/$/, "");
      if (!sameSite) {
        throw new Error(`Protected resource ${resource} does not match expected ${requested} (or origin)`);
      }
      return configured;
    },
    async invalidateCredentials(scope) {
      await setSecrets(serverId, (current) => {
        const oauth = { ...current.oauth };
        if (scope === "all" || scope === "client") delete oauth.clientInformation;
        if (scope === "all" || scope === "tokens") {
          delete oauth.tokens;
          delete oauth.expiresAt;
        }
        if (scope === "all" || scope === "verifier") delete oauth.codeVerifier;
        return { ...current, oauth };
      });
    },
  };
}

/** Start over: a fresh registration against today's redirect, and no stale tokens. */
export async function resetOAuth(serverId: string): Promise<void> {
  await setSecrets(serverId, (current) => ({ ...current, oauth: undefined }));
}

/** Not "will it work", only "is it worth trying before the browser". */
export async function tokenLooksUsable(serverId: string): Promise<boolean> {
  const oauth = (await getSecrets(serverId)).oauth;
  if (!oauth?.tokens?.access_token) return false;
  // A minute of slack: a token that dies mid-turn is worse than one refresh.
  if (oauth.expiresAt && oauth.expiresAt < Date.now() + 60_000) {
    return Boolean(oauth.tokens.refresh_token);
  }
  return true;
}
