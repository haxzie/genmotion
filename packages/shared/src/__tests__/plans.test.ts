import { describe, expect, it } from "vitest";
import {
  FREE_EXPORTS_PER_MONTH,
  PLANS,
  PLAN_IDS,
  SEAT_PRICE_USD,
  exportAllowance,
  isPlanId,
  monthlyTotalUsd,
  pluginAllowance,
  planPrice,
} from "../plans";

describe("plans", () => {
  it("offers exactly one paid plan", () => {
    expect(PLAN_IDS).toEqual(["free", "pro"]);
    expect(PLAN_IDS.filter((id) => PLANS[id].purchasable)).toEqual(["pro"]);
  });

  it("prices Pro per person", () => {
    expect(PLANS.pro.priceUsd).toBe(SEAT_PRICE_USD);
    expect(planPrice("pro")).toBe("$19");
    expect(planPrice("free")).toBe("$0");
  });

  it("carries one seat before add-ons", () => {
    expect(PLANS.pro.includedSeats).toBe(1);
    expect(PLANS.free.includedSeats).toBe(1);
  });

  it("prices a plan whole, whatever the headcount within it", () => {
    expect(monthlyTotalUsd("pro")).toBe(19);
    expect(monthlyTotalUsd("max")).toBe(199);
    expect(monthlyTotalUsd("free")).toBe(0);
  });

  it("only lets Max invite — Pro is one person", () => {
    expect(PLANS.free.canInvite).toBe(false);
    expect(PLANS.pro.canInvite).toBe(false);
    expect(PLANS.max.canInvite).toBe(true);
    expect(PLANS.pro.includedSeats).toBe(1);
    expect(PLANS.max.includedSeats).toBe(5);
  });

  it("gives Max five Pro allowances, pooled", () => {
    const pro = pluginAllowance("pro");
    const max = pluginAllowance("max");
    expect(pro).toEqual({ characters: 15_000, sfx: 60, images: 100 });
    expect(max).toEqual({ characters: 75_000, sfx: 300, images: 500 });
    expect(pluginAllowance("free")).toEqual({ characters: 0, sfx: 0, images: 0 });
  });

  it("recognises plan ids and rejects the plan that no longer exists", () => {
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("free")).toBe(true);
    expect(isPlanId("team")).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });
});

describe("export allowance", () => {
  it("caps Free and nothing else", () => {
    expect(exportAllowance("free")).toBe(FREE_EXPORTS_PER_MONTH);
    expect(exportAllowance("pro")).toBeNull();
    expect(exportAllowance("max")).toBeNull();
  });

  it("returns null rather than Infinity for an uncapped plan", () => {
    // A meter rendering "3 of Infinity" is the bug this guards against: the
    // caller has to branch on null, and cannot accidentally do arithmetic.
    expect(Number.isFinite(exportAllowance("pro") as number)).toBe(false);
    expect(exportAllowance("pro")).not.toBe(Infinity);
  });

  it("does not expire, so Free has no clock to run out", () => {
    // The whole point of the tier: there is no date anywhere in a plan
    // definition, and nothing here takes a "now" to compare against.
    expect(PLANS.free.purchasable).toBe(false);
    expect(PLANS.free.priceUsd).toBe(0);
    expect(PLANS.free.allowanceMultiplier).toBe(0);
  });
});
