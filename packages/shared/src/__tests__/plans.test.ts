import { describe, expect, it } from "vitest";
import {
  PLANS,
  PLAN_IDS,
  SEAT_PRICE_USD,
  TRIAL_DAYS,
  isPlanId,
  isTrialActive,
  monthlyTotalUsd,
  planPrice,
  trialDaysLeft,
  trialEndsAt,
} from "../plans";

const DAY = 86_400_000;
const CREATED = new Date("2026-08-01T00:00:00.000Z");

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

  it("totals a team at the per-seat price", () => {
    expect(monthlyTotalUsd(1)).toBe(19);
    expect(monthlyTotalUsd(5)).toBe(95);
    // A nonsensical seat count still costs at least one seat rather than zero.
    expect(monthlyTotalUsd(0)).toBe(19);
  });

  it("only lets Pro invite", () => {
    expect(PLANS.free.canInvite).toBe(false);
    expect(PLANS.pro.canInvite).toBe(true);
  });

  it("recognises plan ids and rejects the plan that no longer exists", () => {
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("free")).toBe(true);
    expect(isPlanId("team")).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });
});

describe("trial", () => {
  it("runs for TRIAL_DAYS from when the org was created", () => {
    expect(trialEndsAt(CREATED).toISOString()).toBe("2026-08-08T00:00:00.000Z");
    expect(TRIAL_DAYS).toBe(7);
  });

  it("is active right up to the boundary and not past it", () => {
    expect(isTrialActive(CREATED, new Date(CREATED.getTime() + 6 * DAY))).toBe(true);
    // One millisecond before expiry is still inside the trial.
    expect(isTrialActive(CREATED, new Date(CREATED.getTime() + 7 * DAY - 1))).toBe(true);
    expect(isTrialActive(CREATED, new Date(CREATED.getTime() + 7 * DAY))).toBe(false);
    expect(isTrialActive(CREATED, new Date(CREATED.getTime() + 30 * DAY))).toBe(false);
  });

  it("rounds the days left up, so a part-day never reads as zero", () => {
    expect(trialDaysLeft(CREATED, CREATED)).toBe(7);
    expect(trialDaysLeft(CREATED, new Date(CREATED.getTime() + 6 * DAY))).toBe(1);
    // Four hours left is still a day to a reader.
    expect(trialDaysLeft(CREATED, new Date(CREATED.getTime() + 7 * DAY - 4 * 3600_000))).toBe(1);
  });

  it("floors at zero rather than counting backwards", () => {
    expect(trialDaysLeft(CREATED, new Date(CREATED.getTime() + 7 * DAY))).toBe(0);
    expect(trialDaysLeft(CREATED, new Date(CREATED.getTime() + 90 * DAY))).toBe(0);
  });
});
