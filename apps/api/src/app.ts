import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";
import { auth } from "./auth";
import { projectRoutes } from "./routes/projects";
import { chatRoutes } from "./routes/chat";
import { assetRoutes } from "./routes/assets";
import { exportRoutes } from "./routes/exports";
import { fileRoutes } from "./routes/files";
import { renderRoutes } from "./routes/render";
import { billingRoutes } from "./routes/billing";
import { desktopRoutes } from "./routes/desktop";
import { eventRoutes } from "./routes/events";
import { dodoWebhookRoutes } from "./routes/webhooks/dodo";

export const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: env.WEB_URL,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const res = await auth.handler(c.req.raw);
  // The bearer plugin echoes the raw session token back as `set-auth-token`,
  // and exposes it cross-origin — which would hand page JS the very value the
  // httpOnly session cookie exists to keep away from it. Nothing needs it: the
  // desktop app reads its token from the device-grant response body. So it is
  // stripped unconditionally rather than on a guess about who is calling.
  if (!res.headers.has("set-auth-token")) return res;
  const headers = new Headers(res.headers);
  headers.delete("set-auth-token");
  const exposed = headers
    .get("access-control-expose-headers")
    ?.split(",")
    .map((h) => h.trim())
    .filter((h) => h && h.toLowerCase() !== "set-auth-token");
  if (exposed?.length) headers.set("Access-Control-Expose-Headers", exposed.join(", "));
  else headers.delete("access-control-expose-headers");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
});

// Project file proxy/list/delete — registered first so /:id/files* resolves
// before the generic project routes.
app.route("/api/projects", fileRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/assets", assetRoutes);
app.route("/api/exports", exportRoutes);
app.route("/api/billing", billingRoutes);
// Desktop app bootstrap — session-authed, but reached with a Bearer token
// rather than a cookie (see the bearer plugin in auth.ts).
app.route("/api/desktop", desktopRoutes);
// Product analytics forwarded to PostHog; the key stays server-side.
app.route("/api/events", eventRoutes);
// Render control-plane — token-authed (not requireAuth); used by remote renderers.
app.route("/api/render", renderRoutes);
// Payment webhooks — signature-authed (not requireAuth); called by the provider.
app.route("/api/webhooks/dodo", dodoWebhookRoutes);
