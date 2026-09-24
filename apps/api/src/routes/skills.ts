import { Hono } from "hono";
import { SKILL_CATALOG } from "@genmotion/skills";
import { buildSkillBundle, pluginSkillsDir } from "@genmotion/skills/node";

/**
 * The GenMotion skill pack, served over HTTP.
 *
 * Public and anonymous like `/api/templates` and `/api/mcp`: the pack is the
 * same for every account and holds nothing private. Two routes, cheap first:
 *
 * - `GET /catalog` — metadata only (what `@genmotion/skills`' committed
 *   `dist/index.json` already carries). A client checks this first; its
 *   `revision` is what decides whether the heavier route is worth calling.
 * - `GET /bundle` — every file of every skill, ready to write straight to a
 *   local cache. This is not how the agent reads a skill live — the Claude
 *   Agent SDK only takes a plugin as a local path — it is how the desktop
 *   app refreshes that local copy without shipping a new build.
 *
 * Built from the running server's own `@genmotion/skills` install, so a
 * deploy is the only thing that changes what this serves — there is no
 * separate publish step, and the API can never drift from the package it
 * imports.
 */
export const skillsRoutes = new Hono();

skillsRoutes.get("/catalog", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(SKILL_CATALOG);
});

skillsRoutes.get("/bundle", (c) => {
  const { skills, totalBytes } = buildSkillBundle(pluginSkillsDir());
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ revision: SKILL_CATALOG.revision, skills, totalBytes });
});
