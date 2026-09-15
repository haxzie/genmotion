import { Hono } from "hono";
import { getObjectBuffer, putObject } from "@genmotion/storage";
import { MCP_CATALOG } from "../mcp-catalog/index";
import { env } from "../env";

/**
 * The MCP marketplace, and the icons for servers that are not in it.
 *
 * Public and anonymous like `/api/templates`: the list is the same for every
 * account, holds nothing private, and the desktop app browses it through its
 * loopback proxy without attaching a session. Short cache — the list only
 * changes on deploy, but a client that just missed one should not wait long.
 */
export const mcpCatalogRoutes = new Hono();

mcpCatalogRoutes.get("/catalog", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(MCP_CATALOG);
});

/**
 * A custom server's icon: the favicon of the domain it lives on.
 *
 * Fetched once from Google's resolver — which already handles the dozen ways
 * a site can declare an icon — and kept in object storage under the domain,
 * so a second desktop asking for `linear.app` costs a bucket read and nobody
 * hits Google twice for the same site. Refetched after the TTL by way of the
 * key carrying the week it was stored in.
 */
const FAVICON_RESOLVER = "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=";
const FAVICON_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FAVICON_MAX_BYTES = 256 * 1024;
/** A hostname: labels of letters, digits and hyphens, at least one dot. */
const DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** Icons still being fetched, so a burst of requests for one domain is one fetch. */
const inflight = new Map<string, Promise<Buffer | null>>();

async function fetchFavicon(domain: string): Promise<Buffer | null> {
  const res = await fetch(`${FAVICON_RESOLVER}https://${domain}`, {
    signal: AbortSignal.timeout(8_000),
    redirect: "follow",
  }).catch(() => null);
  if (!res?.ok) return null;
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length > 0 && bytes.length <= FAVICON_MAX_BYTES ? bytes : null;
}

function faviconKey(domain: string): string {
  const week = Math.floor(Date.now() / FAVICON_TTL_MS);
  return `favicons/${domain.toLowerCase()}/${week}.png`;
}

async function favicon(domain: string): Promise<Buffer | null> {
  const key = faviconKey(domain);
  const cached = await getObjectBuffer(key).catch(() => null);
  if (cached) return cached;

  const running = inflight.get(key);
  if (running) return running;
  const task = fetchFavicon(domain)
    .then(async (bytes) => {
      // Best effort: a bucket that is down costs one Google fetch per request,
      // not the icon.
      if (bytes) await putObject(key, bytes, "image/png").catch(() => {});
      return bytes;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}

mcpCatalogRoutes.get("/favicon/:domain", async (c) => {
  const domain = c.req.param("domain");
  if (!DOMAIN.test(domain)) return c.json({ error: "Not a domain" }, 400);
  const bytes = await favicon(domain);
  if (!bytes) return c.json({ error: "No icon for that domain" }, 404);
  c.header("Cache-Control", "public, max-age=86400");
  c.header("Content-Type", "image/png");
  return c.body(new Uint8Array(bytes));
});

/**
 * The desktop app's OAuth client, as a document.
 *
 * Some MCP vendors (ElevenLabs, for one) do not register clients on the fly
 * but accept an HTTPS URL as the client id and fetch the metadata behind it
 * — SEP-991. This is that document; its `client_id` is its own address. The
 * redirect is the desktop's loopback — the fixed port it asks for first, and
 * the port-less form RFC 8252 tells authorization servers to accept for a
 * launch that had to take another. Static, public, the same for every
 * install.
 */
mcpCatalogRoutes.get("/oauth-client", (c) => {
  // The id has to be the very URL the authorization server fetched, so it is
  // read off the request — through whatever proxy or tunnel is in front.
  const url = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") ?? url.protocol.replace(/:$/, "");
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? url.host;
  const clientId = `${proto}://${host}${url.pathname}`;
  c.header("Cache-Control", "public, max-age=3600");
  return c.json({
    client_id: clientId,
    client_name: "GenMotion",
    client_uri: env.WEB_URL,
    logo_uri: `${env.WEB_URL}/logo.svg`,
    // The port the desktop tries first, then the port-less form RFC 8252
    // says a loopback redirect may take — for a launch that got another.
    redirect_uris: ["http://127.0.0.1:41297/mcp-oauth/callback", "http://127.0.0.1/mcp-oauth/callback"],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
});
