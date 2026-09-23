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
    await expect(waitForIdle()).resolves.toBeUndefined();
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
});
