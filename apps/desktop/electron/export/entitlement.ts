import {
  exportLimitPaywallUnmetered,
  isPaywallBody,
  type ExportUsage,
  type PaywallBody,
} from "@genmotion/shared";
import { desktopAuth } from "../auth";

/** What `POST /api/exports/claim` answers with when it allows the render. */
export interface ExportClaim {
  usage: ExportUsage;
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
 * The render is local, but the allowance is not: it belongs to the
 * organization, and a count kept on this machine would refill with a
 * reinstall. So the app asks the hosted API to spend one first, and this turns
 * that answer into "render" or a refusal. The video is the same either way —
 * there is no badge on a free export — so the only question is whether it runs.
 *
 * `res: null` — unreachable, or the request failed — fails all the way open.
 * An export must not be blocked by a network blip, and local rendering has
 * never depended on the network before; that promise doesn't start breaking
 * here. The cost of failing open is that an offline Free user can exceed five
 * in a month, which is a far cheaper mistake than a paid export refused on a
 * train.
 */
export function decideClaim(
  res: { ok: boolean; status: number; body: unknown } | null,
): { usage: ExportUsage | null } {
  if (!res) return { usage: null };

  // An explicit 402 is the one answer confident enough to refuse on. The body
  // carries the org's real counts and reset date, so it is shown verbatim
  // rather than reworded here.
  if (res.status === 402) {
    throw new ExportPaywallError(
      isPaywallBody(res.body) ? res.body : exportLimitPaywallUnmetered(),
    );
  }

  // Anything else that isn't a success — 401 signed out, 500, a proxy's HTML
  // error page — is uncertainty, not a "no". Same answer as unreachable.
  if (!res.ok) return { usage: null };

  return { usage: (res.body as Partial<ExportClaim> | null)?.usage ?? null };
}

/**
 * Spend one export off the account's monthly allowance, or refuse the render.
 *
 * Called before a job exists, so a refusal costs nothing and a render that
 * starts has already been paid for. Deliberately claimed up front rather than
 * on completion: a claim released on failure would be farmable by an export
 * cancelled at 99%, and the server takes the same position (see
 * `claimExport` in apps/api/src/export-usage.ts).
 */
export async function claimExport(detail: {
  format?: string;
  totalFrames?: number;
}): Promise<{ usage: ExportUsage | null }> {
  const res = await desktopAuth
    .request<unknown>("/api/exports/claim", { method: "POST", json: detail })
    .catch(() => null);
  return decideClaim(res);
}
