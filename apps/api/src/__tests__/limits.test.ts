import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@genmotion/db";
import { FREE_LIMITS, LIMITS_LIVE_AT } from "@genmotion/shared";
import { checkLimit, limitSnapshot, usageCountsFrom } from "../limits";
import { dbReady, truncateAll } from "./helpers/db";
import {
  createChatMessage,
  createExportJob,
  createOrg,
  createProject,
  setSubscription,
} from "./helpers/factories";

const HOUR = 3600 * 1000;

/** Dates either side of the boundaries, derived so they never go stale. */
const countedFlow = () => new Date(usageCountsFrom().getTime() + HOUR);
const beforeFlowCutoff = () => new Date(usageCountsFrom().getTime() - HOUR);
const countedProject = () => new Date(LIMITS_LIVE_AT.getTime() + HOUR);
const beforeProjectCutoff = () => new Date(LIMITS_LIVE_AT.getTime() - HOUR);

async function freeOrg() {
  const { orgId, ownerId } = await createOrg();
  return { orgId, ownerId };
}

describe.skipIf(!dbReady)("checkLimit — projects", () => {
  beforeEach(truncateAll);

  it("allows up to the cap", async () => {
    const { orgId, ownerId } = await freeOrg();
    for (let i = 0; i < FREE_LIMITS.projects - 1; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    }
    expect(await checkLimit(orgId, "projects")).toBeNull();
  });

  it("blocks at the cap with a 402 body", async () => {
    const { orgId, ownerId } = await freeOrg();
    for (let i = 0; i < FREE_LIMITS.projects; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    }
    const blocked = await checkLimit(orgId, "projects");
    expect(blocked).not.toBeNull();
    expect(blocked!.limit).toEqual({
      kind: "projects",
      used: FREE_LIMITS.projects,
      max: FREE_LIMITS.projects,
    });
  });

  // The grandfather rule: work that predates enforcement keeps existing.
  it("ignores projects created before the cutoff", async () => {
    const { orgId, ownerId } = await freeOrg();
    for (let i = 0; i < 20; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: beforeProjectCutoff() });
    }
    expect(await checkLimit(orgId, "projects")).toBeNull();
  });

  it("still blocks once post-cutoff projects reach the cap", async () => {
    const { orgId, ownerId } = await freeOrg();
    for (let i = 0; i < 20; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: beforeProjectCutoff() });
    }
    for (let i = 0; i < FREE_LIMITS.projects; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    }
    expect(await checkLimit(orgId, "projects")).not.toBeNull();
  });

  it("scopes counting to the organization", async () => {
    const a = await freeOrg();
    const b = await freeOrg();
    for (let i = 0; i < FREE_LIMITS.projects; i++) {
      await createProject(a.orgId, { userId: a.ownerId, createdAt: countedProject() });
    }
    expect(await checkLimit(b.orgId, "projects")).toBeNull();
  });
});

describe.skipIf(!dbReady)("checkLimit — exports", () => {
  beforeEach(truncateAll);

  async function orgWithExports(
    count: number,
    status: "done" | "failed" | "cancelled" = "done",
    createdAt = countedFlow(),
  ) {
    const { orgId, ownerId } = await freeOrg();
    const project = await createProject(orgId, {
      userId: ownerId,
      createdAt: countedProject(),
    });
    for (let i = 0; i < count; i++) {
      await createExportJob(project.id, { userId: ownerId, status, createdAt });
    }
    return orgId;
  }

  it("blocks at the cap", async () => {
    const orgId = await orgWithExports(FREE_LIMITS.exports);
    expect(await checkLimit(orgId, "exports")).not.toBeNull();
  });

  // A render that produced nothing must not consume the allowance.
  it("ignores failed and cancelled renders", async () => {
    const orgId = await orgWithExports(FREE_LIMITS.exports * 2, "failed");
    expect(await checkLimit(orgId, "exports")).toBeNull();

    const other = await orgWithExports(FREE_LIMITS.exports * 2, "cancelled");
    expect(await checkLimit(other, "exports")).toBeNull();
  });

  it("ignores exports from before the cutoff", async () => {
    const orgId = await orgWithExports(FREE_LIMITS.exports * 2, "done", beforeFlowCutoff());
    expect(await checkLimit(orgId, "exports")).toBeNull();
  });
});

describe.skipIf(!dbReady)("checkLimit — AI turns", () => {
  beforeEach(truncateAll);

  async function orgWithTurns(
    count: number,
    role: "user" | "assistant" = "user",
    createdAt = countedFlow(),
  ) {
    const { orgId, ownerId } = await freeOrg();
    const project = await createProject(orgId, {
      userId: ownerId,
      createdAt: countedProject(),
    });
    for (let i = 0; i < count; i++) {
      await createChatMessage(project.id, { role, createdAt });
    }
    return orgId;
  }

  it("blocks at the cap", async () => {
    expect(await checkLimit(await orgWithTurns(FREE_LIMITS.aiTurns), "aiTurns")).not.toBeNull();
  });

  // A turn is what the user sent; assistant replies and tool chatter are ours.
  it("counts only user messages", async () => {
    const orgId = await orgWithTurns(FREE_LIMITS.aiTurns * 2, "assistant");
    expect(await checkLimit(orgId, "aiTurns")).toBeNull();
  });

  it("ignores turns from before the cutoff", async () => {
    const orgId = await orgWithTurns(FREE_LIMITS.aiTurns * 2, "user", beforeFlowCutoff());
    expect(await checkLimit(orgId, "aiTurns")).toBeNull();
  });
});

describe.skipIf(!dbReady)("checkLimit — paid plans", () => {
  beforeEach(truncateAll);

  it("never blocks an org on Pro", async () => {
    const { orgId, ownerId } = await freeOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    for (let i = 0; i < FREE_LIMITS.projects * 3; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    }
    expect(await checkLimit(orgId, "projects")).toBeNull();
    expect(await checkLimit(orgId, "exports")).toBeNull();
    expect(await checkLimit(orgId, "aiTurns")).toBeNull();
  });

  it("blocks again once the subscription expires", async () => {
    const { orgId, ownerId } = await freeOrg();
    await setSubscription(orgId, {
      plan: "pro",
      status: "expired",
      currentPeriodEnd: new Date(Date.now() - HOUR),
    });
    for (let i = 0; i < FREE_LIMITS.projects; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    }
    expect(await checkLimit(orgId, "projects")).not.toBeNull();
  });

  /**
   * The short-circuit is a cost property, not just a behavioural one: an
   * unlimited org must not pay for a COUNT whose answer can't block it. One
   * select resolves the subscription; a second would mean the counter ran.
   */
  it("skips the usage query entirely on an unlimited plan", async () => {
    const { orgId } = await freeOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });

    const spy = vi.spyOn(db, "select");
    try {
      await checkLimit(orgId, "projects");
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("does run the usage query on Free", async () => {
    const { orgId } = await freeOrg();
    const spy = vi.spyOn(db, "select");
    try {
      await checkLimit(orgId, "projects");
      expect(spy).toHaveBeenCalledTimes(2); // subscription + count
    } finally {
      spy.mockRestore();
    }
  });
});

describe.skipIf(!dbReady)("limitSnapshot", () => {
  beforeEach(truncateAll);

  it("reports finite caps on Free", async () => {
    const { orgId, ownerId } = await freeOrg();
    await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    const snap = await limitSnapshot(orgId);
    expect(snap.projects).toEqual({
      used: 1,
      max: FREE_LIMITS.projects,
      remaining: FREE_LIMITS.projects - 1,
      unlimited: false,
    });
  });

  it("reports unlimited on a paid plan but still counts usage", async () => {
    const { orgId, ownerId } = await freeOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    const snap = await limitSnapshot(orgId);
    expect(snap.projects).toEqual({
      used: 1,
      max: null,
      remaining: null,
      unlimited: true,
    });
  });

  it("never reports negative remaining", async () => {
    const { orgId, ownerId } = await freeOrg();
    for (let i = 0; i < FREE_LIMITS.projects + 3; i++) {
      await createProject(orgId, { userId: ownerId, createdAt: countedProject() });
    }
    const snap = await limitSnapshot(orgId);
    expect(snap.projects.remaining).toBe(0);
  });
});
