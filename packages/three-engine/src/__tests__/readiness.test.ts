import { describe, expect, it } from "vitest";
import { createLoadingTracker, createMediaReadinessController } from "../readiness";

describe("createMediaReadinessController", () => {
  it("resolves immediately with no registered checks", async () => {
    const controller = createMediaReadinessController();
    await expect(controller.waitForReady()).resolves.toBeUndefined();
  });

  it("awaits every registered check", async () => {
    const controller = createMediaReadinessController();
    let resolved = false;
    controller.register(() => new Promise((resolve) => setTimeout(() => {
      resolved = true;
      resolve();
    }, 10)));

    await controller.waitForReady();
    expect(resolved).toBe(true);
  });

  it("stops awaiting a check once it is unregistered", async () => {
    const controller = createMediaReadinessController();
    let called = false;
    const unregister = controller.register(async () => {
      called = true;
    });
    unregister();

    await controller.waitForReady();
    expect(called).toBe(false);
  });
});

describe("createLoadingTracker", () => {
  it("is idle before anything starts loading", async () => {
    const { waitForIdle } = createLoadingTracker();
    // False is load-bearing: it is how the render host knows it can skip the
    // second draw it would otherwise make in case an asset had landed.
    await expect(waitForIdle()).resolves.toBe(false);
  });

  it("stays pending between onStart and onLoad", async () => {
    const { manager, waitForIdle } = createLoadingTracker();
    manager.onStart?.("url", 0, 1);

    let settled = false;
    const pending = waitForIdle().then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    manager.onLoad?.();
    await pending;
    expect(settled).toBe(true);
  });

  it("reports that it waited, so the host knows to draw again", async () => {
    const { manager, waitForIdle } = createLoadingTracker();
    manager.onStart?.("url", 0, 1);
    const pending = waitForIdle();
    manager.onLoad?.();
    await expect(pending).resolves.toBe(true);
    // And back to idle once that stretch has settled.
    await expect(waitForIdle()).resolves.toBe(false);
  });
});
