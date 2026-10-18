import type { BrandManifest } from "@genmotion/shared";
import type { ProjectEngine } from "@genmotion/project";
import { readBrand } from "./manifest";
import { brandDir } from "./paths";
import type { BrandPrompt } from "./prompt-input";
import { syncBrandIntoProject } from "./project-sync";
import { attachedBrandId, forgetBrand } from "./store";

/**
 * The brand a turn is running against, resolved once per turn.
 *
 * Every caller wants the same two things together — the manifest and the
 * absolute folder — and every caller has to survive the brand having been
 * deleted or hand-broken since it was attached. Doing that in one place is
 * what keeps a missing brand from becoming a failed turn: the agent is told
 * about the brand it has, or about no brand at all, and never about a read
 * root that does not exist.
 */

export interface ResolvedBrand {
  brand: BrandManifest;
  /** Absolute, for the read grant and for the folder line in the prompt. */
  dir: string;
}

export async function resolveBrand(projectDir: string): Promise<ResolvedBrand | null> {
  const id = await attachedBrandId(projectDir).catch(() => null);
  if (!id) return null;
  const brand = await readBrand(id).catch(() => null);
  if (!brand) {
    // The folder is gone, or its manifest no longer parses. Drop the
    // attachment rather than handing the agent a path to nothing on every
    // turn from here on.
    await forgetBrand(id).catch(() => {});
    return null;
  }
  return { brand, dir: brandDir(id) };
}

/**
 * The attached brand as a turn needs it: resolved, synced into the project,
 * and shaped for the prompt.
 *
 * The sync runs here rather than only at attach time because it has to be
 * true on *every* turn, not just the one after the user picked the brand. A
 * brand edited in the Brands tab while a project is open, a logo dropped into
 * the folder in Finder, a `components/brand.ts` the agent deleted: each of
 * those should be fixed by the next message, and each is cheap to re-apply
 * (a few small copies and one file write) because it is idempotent.
 *
 * Never throws. A brand is an enhancement to a turn; it must not be able to
 * stop one.
 */
export async function brandForTurn(
  projectDir: string,
  engine: ProjectEngine,
): Promise<BrandPrompt | null> {
  const attached = await resolveBrand(projectDir).catch(() => null);
  if (!attached) return null;
  const sync = await syncBrandIntoProject(projectDir, attached.brand, engine).catch(() => null);
  return {
    manifest: attached.brand,
    dir: attached.dir,
    logos: sync?.logos ?? [],
    ...(sync?.moduleSkipped ? { moduleSkipped: true } : {}),
  };
}
