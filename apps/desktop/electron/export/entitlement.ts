import {
  isPaywallBody,
  trialEndedPaywall,
  type PaywallBody,
  type TrialState,
} from "@genmotion/shared";
import { desktopAuth } from "../auth";

/** What `POST /api/exports/claim` answers with when it allows the render. */
export interface ExportClaim {
  trial: TrialState;
}

/** Thrown by `claimExport` to refuse a render outright. */
export class ExportPaywallError extends Error {
  constructor(public readonly body: PaywallBody) {
    super(body.error);
  }
}

/**
 * The decision itself, pulled out of `claimExport` so it's testable without
 * mocking Electron's `safeStorage`/`app` (which `../auth` reaches for at
 * import time) or the network — this is the one part worth pinning down
 * exactly.
 *
 * The render is local, but the entitlement is not: the trial belongs to the
 * organization, and a clock kept on this machine would restart with a
 * reinstall. So the app asks the hosted API first, and this turns that answer
 * into "render" or a refusal. The video is the same either way — there is no
 * badge on a trial export — so the only question is whether it runs.
 *
 * `res: null` — unreachable, or the request failed — fails all the way open.
 * An export must not be blocked by a network blip, and local rendering has
 * never depended on the network before; that promise doesn't start breaking
 * here. The cost of failing open is that an offline user whose trial has ended
 * can still export, which is a far cheaper mistake than a paid export refused
 * on a train.
 */
export function decideClaim(
  res: { ok: boolean; status: number; body: unknown } | null,
): { trial: TrialState | null } {
  if (!res) return { trial: null };

  // An explicit 402 is the one answer confident enough to refuse on. The body
  // carries the org's own dates, so it is shown verbatim rather than reworded
  // here.
  if (res.status === 402) {
    throw new ExportPaywallError(
      isPaywallBody(res.body) ? res.body : trialEndedPaywall(),
    );
  }

  // Anything else that isn't a success — 401 signed out, 500, a proxy's HTML
  // error page — is uncertainty, not a "no". Same answer as unreachable.
  if (!res.ok) return { trial: null };

  return { trial: (res.body as Partial<ExportClaim> | null)?.trial ?? null };
}

/**
 * Ask whether this export may run, or refuse it.
 *
 * Called before a job exists, so a refusal costs nothing. The server records
 * the export at the same moment it allows it (see `claimExport` in
 * apps/api/src/limits.ts), which is deliberately before the render rather than
 * on completion: what the history is for is what people set out to make.
 */
export async function claimExport(detail: {
  format?: string;
  totalFrames?: number;
}): Promise<{ trial: TrialState | null }> {
  const res = await desktopAuth
    .request<unknown>("/api/exports/claim", { method: "POST", json: detail })
    .catch(() => null);
  return decideClaim(res);
}
