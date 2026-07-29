import { describe, expect, it } from "vitest";
import { FREE_LIMITS, type LimitKind } from "../limits";
import {
  LIMITS_LIVE_AT,
  PLANS,
  PLAN_IDS,
  TEAM_SEATS,
  isPlanId,
  isUnlimited,
  planLimit,
} from "../plans";

const KINDS = Object.keys(FREE_LIMITS) as LimitKind[];

describe("PLANS", () => {
  it("defines every quota for every plan", () => {
    for (const id of PLAN_IDS) {
      for (const kind of KINDS) {
        expect(PLANS[id].limits).toHaveProperty(kind);
      }
    }
  });

  // Guards against the two exports drifting apart — PLANS.free is meant to be
  // FREE_LIMITS wearing a different shape, not a second copy of the numbers.
  it("keeps the free plan in step with FREE_LIMITS", () => {
    for (const kind of KINDS) {
      expect(PLANS.free.limits[kind]).toBe(FREE_LIMITS[kind]);
    }
  });

  it("makes every paid quota unlimited", () => {
    for (const kind of KINDS) {
      expect(PLANS.pro.limits[kind]).toBeNull();
      expect(PLANS.team.limits[kind]).toBeNull();
    }
  });

  it("gives Pro a single seat and no invites", () => {
    expect(PLANS.pro.seats).toBe(1);
    expect(PLANS.pro.canInvite).toBe(false);
  });

  it("gives Team ten seats and invites", () => {
    expect(PLANS.team.seats).toBe(10);
    expect(PLANS.team.canInvite).toBe(true);
    expect(PLANS.team.prioritySupport).toBe(true);
  });

  it("only offers the paid plans for purchase", () => {
    expect(PLANS.free.purchasable).toBe(false);
    expect(PLANS.pro.purchasable).toBe(true);
    expect(PLANS.team.purchasable).toBe(true);
  });

  it("exposes the membership ceiling as the largest plan's seats", () => {
    expect(TEAM_SEATS).toBe(PLANS.team.seats);
    for (const id of PLAN_IDS) {
      expect(PLANS[id].seats).toBeLessThanOrEqual(TEAM_SEATS);
    }
  });

  it("describes every plan with at least one feature bullet", () => {
    for (const id of PLAN_IDS) {
      expect(PLANS[id].features.length).toBeGreaterThan(0);
    }
  });
});

describe("planLimit / isUnlimited", () => {
  it("reports finite caps for free", () => {
    expect(planLimit("free", "projects")).toBe(FREE_LIMITS.projects);
    expect(isUnlimited("free", "projects")).toBe(false);
  });

  it("reports unlimited for paid plans", () => {
    expect(planLimit("team", "exports")).toBeNull();
    expect(isUnlimited("team", "exports")).toBe(true);
  });
});

describe("isPlanId", () => {
  it("accepts the known plans", () => {
    for (const id of PLAN_IDS) expect(isPlanId(id)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of ["enterprise", "", null, undefined, 3, {}, []]) {
      expect(isPlanId(value)).toBe(false);
    }
  });
});

describe("LIMITS_LIVE_AT", () => {
  it("is a valid instant", () => {
    expect(Number.isNaN(LIMITS_LIVE_AT.getTime())).toBe(false);
  });
});
