import { serve } from "@hono/node-server";
import { env } from "./env";
import { app } from "./app";

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`GenMotion API listening on http://localhost:${info.port}`);
});
