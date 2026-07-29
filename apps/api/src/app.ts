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
import { adminRoutes } from "./routes/admin";
import { billingRoutes } from "./routes/billing";
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

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Project file proxy/list/delete — registered first so /:id/files* resolves
// before the generic project routes.
app.route("/api/projects", fileRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/assets", assetRoutes);
app.route("/api/exports", exportRoutes);
app.route("/api/billing", billingRoutes);
// Render control-plane — token-authed (not requireAuth); used by remote renderers.
app.route("/api/render", renderRoutes);
// Payment webhooks — signature-authed (not requireAuth); called by the provider.
app.route("/api/webhooks/dodo", dodoWebhookRoutes);
// Admin console — /session is session-gated; everything else needs an admin token.
app.route("/api/admin", adminRoutes);
