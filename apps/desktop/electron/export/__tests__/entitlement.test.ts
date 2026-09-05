import { describe, expect, it } from "vitest";
import { PAYWALL_STATUS, isPaywallBody } from "@genmotion/shared";
import { ExportPaywallError, decideEntitlement } from "../entitlement";

/**
 * The plan-state decision an export makes before it starts: watermark, block,
 * or neither. Mirrors the hosted API's own gate — see `entitlement.ts`'s own
 * comment for exactly which server-side checks each case matches.
 */

describe("decideEntitlement", () => {
  it("neither watermarks nor blocks a paid account", () => {
    expect(
      decideEntitlement({ ok: true, body: { subscription: { paid: true }, trial: { active: false } } }),
    ).toEqual({ watermark: false });
    // Paid wins even if the trial window (irrelevantly) still shows active.
    expect(
      decideEntitlement({ ok: true, body: { subscription: { paid: true }, trial: { active: true } } }),
    ).toEqual({ watermark: false });
  });

  it("watermarks but does not block while the trial is still running", () => {
    expect(
      decideEntitlement({ ok: true, body: { subscription: { paid: false }, trial: { active: true } } }),
    ).toEqual({ watermark: true });
  });

  it("refuses outright once the trial has ended and nobody paid", () => {
    expect(() =>
      decideEntitlement({ ok: true, body: { subscription: { paid: false }, trial: { active: false } } }),
    ).toThrow(ExportPaywallError);
  });

  it("the refusal carries the same shape the export button already knows how to open", () => {
    try {
      decideEntitlement({ ok: true, body: { subscription: { paid: false }, trial: { active: false } } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ExportPaywallError);
      const { body } = err as ExportPaywallError;
      expect(isPaywallBody(body)).toBe(true);
      expect(body.paywall.reason).toBe("trial");
    }
  });

  it("fails open — no watermark, no block — when the billing check is unreachable or unhappy", () => {
    expect(decideEntitlement(null)).toEqual({ watermark: false });
    expect(decideEntitlement({ ok: false, body: {} })).toEqual({ watermark: false });
  });

  it("treats a missing trial field as active rather than ended", () => {
    // Absent, not false — an old or partial response shouldn't read as expired.
    expect(decideEntitlement({ ok: true, body: { subscription: { paid: false } } })).toEqual({
      watermark: true,
    });
  });
});

it("PAYWALL_STATUS is what the loopback route answers with", () => {
  expect(PAYWALL_STATUS).toBe(402);
});
