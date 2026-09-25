import { describe, expect, it } from "vitest";
import { PAYWALL_STATUS, exportLimitPaywall, isPaywallBody } from "@genmotion/shared";
import { ExportPaywallError, decideClaim } from "../entitlement";

/**
 * The decision an export makes before it starts: render, or refuse. The count
 * itself lives on the server (a local tally would refill with a reinstall), so
 * all this does is read the claim's answer — and the interesting half is what
 * it does when there is no clear answer to read.
 */

const meter = {
  period: { start: "2026-09-01T00:00:00.000Z", end: "2026-10-01T00:00:00.000Z" },
  used: 3,
  limit: 5,
  remaining: 2,
};

describe("decideClaim", () => {
  it("carries the meter back so the panel can say what is left", () => {
    // Without a second round trip: the claim already knows the new count.
    const decision = decideClaim({ ok: true, status: 201, body: { usage: meter } });
    expect(decision.usage).toEqual(meter);
  });

  it("reports an uncapped plan's meter as having no ceiling", () => {
    const uncapped = { ...meter, limit: null, remaining: null };
    expect(decideClaim({ ok: true, status: 201, body: { usage: uncapped } }).usage).toEqual(
      uncapped,
    );
  });

  it("refuses outright on an explicit 402", () => {
    const body = exportLimitPaywall({ used: 5, limit: 5, resetsAt: meter.period.end });
    expect(() => decideClaim({ ok: false, status: PAYWALL_STATUS, body })).toThrow(
      ExportPaywallError,
    );
  });

  it("the refusal carries the same shape the export button already knows how to open", () => {
    const body = exportLimitPaywall({ used: 5, limit: 5, resetsAt: meter.period.end });
    try {
      decideClaim({ ok: false, status: PAYWALL_STATUS, body });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ExportPaywallError);
      const refusal = (err as ExportPaywallError).body;
      expect(isPaywallBody(refusal)).toBe(true);
      expect(refusal.paywall.reason).toBe("exports");
      // The org's real numbers, not a generic message: the user is told how
      // many they used and when the allowance comes back.
      expect(refusal.paywall.exports).toEqual({ used: 5, limit: 5, resetsAt: meter.period.end });
    }
  });

  it("still refuses on a 402 whose body is unreadable, with the plan's own wording", () => {
    // A proxy can replace the body with HTML. The status is the part worth
    // trusting, so the refusal stands and says what Free includes instead of
    // what this org has spent.
    try {
      decideClaim({ ok: false, status: PAYWALL_STATUS, body: "<html>nope</html>" });
      expect.unreachable();
    } catch (err) {
      const refusal = (err as ExportPaywallError).body;
      expect(refusal.paywall.reason).toBe("exports");
      expect(refusal.paywall.exports).toBeUndefined();
    }
  });

  it("fails open — no block — when the claim is unreachable or unhappy", () => {
    // An export must never be refused by a network blip, and local rendering
    // has never needed the network before. The cost is that an offline Free
    // user can exceed the allowance, which is the cheaper mistake.
    expect(decideClaim(null)).toEqual({ usage: null });
    expect(decideClaim({ ok: false, status: 500, body: {} })).toEqual({ usage: null });
    expect(decideClaim({ ok: false, status: 401, body: {} })).toEqual({ usage: null });
  });

  it("renders anyway when a success carries no meter to read", () => {
    expect(decideClaim({ ok: true, status: 201, body: {} })).toEqual({ usage: null });
  });
});

it("PAYWALL_STATUS is what the loopback route answers with", () => {
  expect(PAYWALL_STATUS).toBe(402);
});
