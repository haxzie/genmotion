import fs from "node:fs/promises";
import type { SampleList } from "@genmotion/templates/types";
import { desktopAuth } from "./auth";
import { track } from "./analytics";
import { listRecents, rememberProject } from "./recents";
import { allocateProjectDir, hasAnyProject } from "./projects-dir";
import { checkRemixBundle, writeBundle, type RemixError } from "./remix";
import { captureThumbnail } from "./export/thumbnail";
import { closeSession, openSession } from "./session-registry";

/**
 * Seeding a new account's workspace with the sample projects.
 *
 * A first sign-in lands on an empty start screen, and an empty start screen
 * is a blank page: nothing to open, nothing to ask the agent about, no sense
 * of what a finished project even looks like. So an account that has nothing
 * gets three finished videos, once. They are ordinary projects the moment
 * they are written — edit them, delete them, nothing brings them back.
 *
 * Two conditions, and both have to hold:
 *
 * - **The workspace is empty.** Nothing in the projects folder and nothing in
 *   the recents index, which also covers projects opened from elsewhere. An
 *   existing user's workspace is never added to.
 * - **The account has never had them.** The API keeps that score on the user
 *   row (`samples_claimed_at`), so a second machine, a reinstall, or deleting
 *   all three does not seed again. The claim is made *after* every project
 *   is on disk: a download that fails halfway leaves the account eligible,
 *   not stranded.
 *
 * Fetch everything first, then write. Three bundles either all arrive or the
 * workspace stays untouched — a half-seeded folder would count as "not empty"
 * next time and never be finished.
 */

export interface SeededSample {
  dir: string;
  name: string;
}

/** One seed at a time. The renderer may ask more than once; the answer is shared. */
let inFlight: Promise<SeededSample[]> | null = null;

export function seedSampleProjects(): Promise<SeededSample[]> {
  inFlight ??= seed().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function seed(): Promise<SeededSample[]> {
  // The cheap, local checks first: for every launch after the first, this is
  // the whole cost — a readdir and a few stats.
  if (await hasAnyProject()) return [];
  if ((await listRecents({ offset: 0, limit: 0 })).total > 0) return [];

  const list = await desktopAuth.request<SampleList>("/api/samples").catch(() => null);
  if (!list?.ok || !list.body.eligible || list.body.samples.length === 0) return [];

  // All of them, before any of them touch disk.
  const bundles = await Promise.all(
    list.body.samples.map(async (sample) => {
      const res = await desktopAuth.request<unknown>(
        `/api/samples/${encodeURIComponent(sample.id)}/files`,
      );
      if (!res.ok) throw new Error(`sample ${sample.id} could not be fetched (${res.status})`);
      return { sample, bundle: checkRemixBundle(res.body) };
    }),
  );

  const written: SeededSample[] = [];
  try {
    for (const { sample, bundle } of bundles) {
      const name = bundle.title ?? sample.title;
      const dir = await allocateProjectDir(name);
      try {
        await writeBundle(dir, name, bundle);
      } catch (err) {
        // The folder was allocated a moment ago and holds only what this
        // write put there — see `remixTemplateAndOpen` for the same reasoning.
        await fs.rm(dir, { recursive: true, force: true });
        throw err as RemixError | Error;
      }
      written.push({ dir, name });
    }
  } catch (err) {
    // Leave nothing behind: a partial set would block the next attempt.
    await Promise.all(written.map((p) => fs.rm(p.dir, { recursive: true, force: true })));
    throw err;
  }

  // Into the recents index so the start screen shows them, last one first so
  // the list reads in the samples' own order.
  for (const project of [...written].reverse()) await rememberProject(project.dir, project.name);

  // A card's picture is normally taken the first time its project is opened.
  // These have never been opened, and three blank cards are a poor first
  // screen — so photograph each one now, before the start screen hears of
  // them. Best-effort: a project whose capture fails still shows, with the
  // placeholder the card has for exactly that case.
  for (const project of written) {
    try {
      const { session } = await openSession(project.dir);
      await captureThumbnail(session);
    } catch {
      /* the card can do without */
    } finally {
      await closeSession(project.dir, { force: true }).catch(() => {});
    }
  }

  // Only now is the account done with them. A failure here is not worth
  // failing the seed over — the projects are on disk; at worst the next empty
  // workspace this account signs into is offered them again.
  await desktopAuth.request("/api/samples/claim", { method: "POST" }).catch(() => null);
  track("samples_seeded", { count: written.length });
  return written;
}
