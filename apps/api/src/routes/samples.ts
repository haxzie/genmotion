import { Hono } from "hono";
import { and, eq, isNull, db, schema } from "@genmotion/db";
import {
  TemplateError,
  buildRemixBundle,
  getSample,
  listSamples,
  toSampleSummary,
  type SampleList,
} from "@genmotion/templates";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

/**
 * The sample projects a new account's workspace starts with.
 *
 * Three finished videos, written into the desktop app's projects folder the
 * first time an account signs in and has nothing there — something to open,
 * pick apart and ask the agent about before the user has made anything.
 * Ordinary projects once on disk: editable, deletable, and never restored.
 *
 * Session-authed, unlike templates: the point is *once per account*, and
 * `samples_claimed_at` on the user row is what makes that true across
 * installs. The desktop reads `eligible`, fetches every bundle, writes them,
 * and only then claims — so a download that fails halfway leaves the account
 * still eligible rather than stranded with nothing.
 */
export const sampleRoutes = new Hono<AuthEnv>();

sampleRoutes.use(requireAuth);

async function claimedAt(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ samplesClaimedAt: schema.user.samplesClaimedAt })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return row?.samplesClaimedAt ?? null;
}

sampleRoutes.get("/", async (c) => {
  const [claimed, samples] = await Promise.all([claimedAt(c.get("user").id), listSamples()]);
  const body: SampleList = { eligible: claimed === null, samples: samples.map(toSampleSummary) };
  return c.json(body);
});

/**
 * Same bundle shape a remix uses, so the desktop writes it through the same
 * checked path. Served regardless of eligibility: the list is the gate, and
 * a bundle is only files that ship in the image.
 */
sampleRoutes.get("/:id/files", async (c) => {
  const record = await getSample(c.req.param("id")).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);
  try {
    return c.json(await buildRemixBundle(record));
  } catch (err) {
    if (err instanceof TemplateError) return c.json({ error: err.message }, 500);
    throw err;
  }
});

/**
 * The account has its samples. Idempotent, and first-write-wins: two
 * installs racing each other both see it done, and the stamp records the
 * earlier of them.
 */
sampleRoutes.post("/claim", async (c) => {
  const userId = c.get("user").id;
  await db
    .update(schema.user)
    .set({ samplesClaimedAt: new Date() })
    .where(and(eq(schema.user.id, userId), isNull(schema.user.samplesClaimedAt)));
  return c.json({ claimed: true });
});
