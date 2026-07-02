import { describe, it, expect } from "vitest";
import {
  resolveProviderKind,
  pickRenderEnv,
  type RenderProvider,
} from "../providers/types";

// Note: these cover the switchable core (env → provider kind, env forwarding)
// and the interface contract without pulling in Playwright/E2B/DB, so they run
// fast and hermetically.

describe("resolveProviderKind", () => {
  it("defaults to local when unset or empty", () => {
    expect(resolveProviderKind({})).toBe("local");
    expect(resolveProviderKind({ RENDER_PROVIDER: "" })).toBe("local");
    expect(resolveProviderKind({ RENDER_PROVIDER: "   " })).toBe("local");
  });

  it("selects the named provider (case/whitespace-insensitive)", () => {
    expect(resolveProviderKind({ RENDER_PROVIDER: "local" })).toBe("local");
    expect(resolveProviderKind({ RENDER_PROVIDER: "e2b" })).toBe("e2b");
    expect(resolveProviderKind({ RENDER_PROVIDER: "E2B" })).toBe("e2b");
    expect(resolveProviderKind({ RENDER_PROVIDER: "  e2b  " })).toBe("e2b");
  });

  it("throws on an unknown provider", () => {
    expect(() => resolveProviderKind({ RENDER_PROVIDER: "cloudflare" })).toThrow(
      /Invalid RENDER_PROVIDER/,
    );
  });
});

describe("pickRenderEnv", () => {
  it("forwards only the set render/storage keys", () => {
    const env = {
      DATABASE_URL: "postgres://x",
      S3_BUCKET: "genmotion",
      AWS_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "", // empty → dropped
      UNRELATED: "nope",
    };
    const picked = pickRenderEnv(env);
    expect(picked).toEqual({
      DATABASE_URL: "postgres://x",
      S3_BUCKET: "genmotion",
      AWS_ACCESS_KEY_ID: "key",
    });
    expect(picked).not.toHaveProperty("UNRELATED");
    expect(picked).not.toHaveProperty("S3_SECRET_ACCESS_KEY");
  });

  it("returns an empty object when nothing is set", () => {
    expect(pickRenderEnv({})).toEqual({});
  });
});

describe("RenderProvider contract", () => {
  it("a provider can implement the interface and be driven uniformly", async () => {
    const calls: string[] = [];
    const fake: RenderProvider = {
      async warmup() {
        calls.push("warmup");
      },
      async renderJob(id) {
        calls.push(`render:${id}`);
      },
      async renderThumbnail(id) {
        calls.push(`thumb:${id}`);
      },
      async dispose() {
        calls.push("dispose");
      },
    };

    await fake.warmup?.();
    await fake.renderJob("job-1");
    await fake.renderThumbnail("proj-1");
    await fake.dispose();

    expect(calls).toEqual(["warmup", "render:job-1", "thumb:proj-1", "dispose"]);
  });
});
