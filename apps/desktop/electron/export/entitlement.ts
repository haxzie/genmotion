import { trialEndedPaywall, type PaywallBody } from "@genmotion/shared";
import { desktopAuth } from "../auth";

/** The one shape `/api/billing/limits` actually has to answer for an export. */
interface ExportLimits {
  subscription?: { paid?: boolean };
  trial?: { active?: boolean };
}

/** Thrown by `checkExportEntitlement` to refuse a render outright. */
export class ExportPaywallError extends Error {
  constructor(public readonly body: PaywallBody) {
    super(body.error);
  }
}

/**
 * The decision itself, pulled out of `checkExportEntitlement` so it's
 * testable without mocking Electron's `safeStorage`/`app` (which `../auth`
 * reaches for at import time) or the network — this is the one part worth
 * pinning down exactly.
 *
 * Mirrors the hosted API's own gate (`checkPaywall()` in `apps/api/src/limits.ts`,
 * `watermark: !entitlements.paid` in `apps/api/src/routes/exports.ts`) so the
 * same account is blocked, watermarked, or neither the same way whether a
 * video renders locally or through the hosted studio.
 *
 * `res: null` — unreachable, or the request failed — fails all the way open:
 * no watermark, no refusal. A paying customer's export must not be branded
 * *or* blocked by a network blip, and local rendering has never depended on
 * the network before; that promise doesn't start breaking here. This is a
 * deliberate departure from the server's own "can't tell means treat as
 * expired" stance, which is about a row it can never read (no creation date
 * on record) rather than a request that merely didn't answer this time.
 */
export function decideEntitlement(res: { ok: boolean; body: ExportLimits } | null): {
  watermark: boolean;
} {
  if (!res || !res.ok) return { watermark: false };
  if (res.body?.subscription?.paid) return { watermark: false };
  // Blocks only on an explicit "no" — a malformed or missing `trial` field on
  // an otherwise-successful response is the same kind of uncertainty as an
  // unreachable one, and gets the same answer: not confirmed paid still earns
  // the badge, but nothing here is confident enough to refuse the export.
  if (res.body?.trial?.active === false) throw new ExportPaywallError(trialEndedPaywall());
  return { watermark: true };
}

/** Fetches the account's plan state and applies `decideEntitlement` to it. */
export async function checkExportEntitlement(): Promise<{ watermark: boolean }> {
  const res = await desktopAuth.request<ExportLimits>("/api/billing/limits").catch(() => null);
  return decideEntitlement(res);
}
