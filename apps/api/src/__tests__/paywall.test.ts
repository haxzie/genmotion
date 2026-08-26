import { beforeEach, describe, expect, it } from "vitest";
import { eq, db, schema } from "@genmotion/db";
import { TRIAL_DAYS, isPaywallBody } from "@genmotion/shared";
import { checkPaywall, trialState } from "../limits";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, setSubscription } from "./helpers/factories";

/**
 * The paywall.
 *
 * There is nothing metered any more, so these cover the only two facts that
 * decide whether an org may work: is it inside its free week, and is it
 * paying. The trial is anchored on the organization's `created_at`, so the
 * tests move that column rather than mocking a clock — it is the same thing
 * the gate reads in production.
 */

const DAY = 86_400_000;

/** Backdate an org so its trial has already run for `days`. */
async function ageOrg(orgId: string, days: number) {
  await db
    .update(schema.organization)
    .set({ createdAt: new Date(Date.now() - days * DAY) })
    .where(eq(schema.organization.id, orgId));
}

describe.skipIf(!dbReady)("checkPaywall", () => {
  beforeEach(truncateAll);

  it("lets a brand-new org through on its trial", async () => {
    const { orgId } = await createOrg();
    expect(await checkPaywall(orgId)).toBeNull();
  });

  it("still lets it through on the last day of the trial", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, TRIAL_DAYS - 1);
    expect(await checkPaywall(orgId)).toBeNull();
  });

  it("blocks once the trial has run out", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, TRIAL_DAYS + 1);
    const blocked = await checkPaywall(orgId);
    expect(blocked).not.toBeNull();
    expect(blocked!.paywall.reason).toBe("trial");
    // The desktop app shows this string verbatim, so it has to stand alone.
    expect(blocked!.paywall.message).toContain("Upgrade");
  });

  it("returns a body the client can recognise as a paywall", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, TRIAL_DAYS + 1);
    expect(isPaywallBody(await checkPaywall(orgId))).toBe(true);
  });

  it("never blocks a paying org, however old", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, 400);
    await setSubscription(orgId, { plan: "pro", status: "active" });
    expect(await checkPaywall(orgId)).toBeNull();
  });

  it("blocks again once the subscription expires", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, 400);
    await setSubscription(orgId, { plan: "pro", status: "expired" });
    expect(await checkPaywall(orgId)).not.toBeNull();
  });

  it("keeps a cancelled org working until its paid period runs out", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, 400);
    await setSubscription(orgId, {
      plan: "pro",
      status: "cancelled",
      currentPeriodEnd: new Date(Date.now() + 5 * DAY),
    });
    expect(await checkPaywall(orgId)).toBeNull();
  });

  it("fails closed on an organization it cannot date", async () => {
    // Nothing should ever be entitled by a row we failed to read.
    const blocked = await checkPaywall("org-that-does-not-exist");
    expect(blocked).not.toBeNull();
    expect(blocked!.paywall.reason).toBe("trial");
  });
});

describe.skipIf(!dbReady)("trialState", () => {
  beforeEach(truncateAll);

  it("reports the full window for a new org", async () => {
    const { orgId } = await createOrg();
    const trial = await trialState(orgId);
    expect(trial.active).toBe(true);
    expect(trial.daysLeft).toBe(TRIAL_DAYS);
    expect(trial.endsAt).toBeInstanceOf(Date);
  });

  it("counts down as the window is used up", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, 5);
    const trial = await trialState(orgId);
    expect(trial.active).toBe(true);
    expect(trial.daysLeft).toBe(2);
  });

  it("reports zero days left rather than a negative number", async () => {
    const { orgId } = await createOrg();
    await ageOrg(orgId, 90);
    const trial = await trialState(orgId);
    expect(trial.active).toBe(false);
    expect(trial.daysLeft).toBe(0);
  });
});
