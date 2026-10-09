import { describe, expect, it } from "vitest";
import { PAYWALL_STATUS, isPaywallBody, trialEndedPaywall } from "@genmotion/shared";
import { ExportPaywallError, decideClaim } from "../entitlement";

/**
 * The decision an export makes before it starts: render, or refuse. The clock
 * itself lives on the server (one kept here would restart with a reinstall),
 * so all this does is read the claim's answer — and the interesting half is
 * what it does when there is no clear answer to read.
 */

const trial = { active: true, daysLeft: 4, endsAt: "2026-10-13T00:00:00.000Z" };

describe("decideClaim", () => {
  it("carries the trial back so the app can say how long is left", () => {
    // Without a second round trip: the claim already knows.
    const decision = decideClaim({ ok: true, status: 201, body: { ok: true, trial } });
    expect(decision.trial).toEqual(trial);
  });

  it("refuses outright on an explicit 402", () => {
    const body = trialEndedPaywall(new Date("2026-10-01T00:00:00.000Z"));
    expect(() => decideClaim({ ok: false, status: PAYWALL_STATUS, body })).toThrow(
      ExportPaywallError,
    );
  });

  it("the refusal carries the same shape the export button already knows how to open", () => {
    const endedAt = new Date("2026-10-01T00:00:00.000Z");
    try {
      decideClaim({ ok: false, status: PAYWALL_STATUS, body: trialEndedPaywall(endedAt) });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ExportPaywallError);
      const refusal = (err as ExportPaywallError).body;
      expect(isPaywallBody(refusal)).toBe(true);
      expect(refusal.paywall.reason).toBe("trial");
      expect(refusal.paywall.trial).toEqual({ endedAt: endedAt.toISOString() });
    }
  });

  it("still refuses on a 402 whose body is unreadable, with the plan's own wording", () => {
    // A proxy can replace the body with HTML. The status is the part worth
    // trusting, so the refusal stands and says what the trial is rather than
    // when this org's ran out.
    try {
      decideClaim({ ok: false, status: PAYWALL_STATUS, body: "<html>nope</html>" });
      expect.unreachable();
    } catch (err) {
      const refusal = (err as ExportPaywallError).body;
      expect(refusal.paywall.reason).toBe("trial");
      expect(refusal.paywall.trial).toEqual({ endedAt: null });
    }
  });

  it("fails open — no block — when the claim is unreachable or unhappy", () => {
    // An export must never be refused by a network blip, and local rendering
    // has never needed the network before. The cost is that an offline user
    // past the trial can still export, which is the cheaper mistake.
    expect(decideClaim(null)).toEqual({ trial: null });
    expect(decideClaim({ ok: false, status: 500, body: {} })).toEqual({ trial: null });
    expect(decideClaim({ ok: false, status: 401, body: {} })).toEqual({ trial: null });
  });

  it("renders anyway when a success carries no trial to read", () => {
    expect(decideClaim({ ok: true, status: 201, body: {} })).toEqual({ trial: null });
  });
});

it("PAYWALL_STATUS is what the loopback route answers with", () => {
  expect(PAYWALL_STATUS).toBe(402);
});
