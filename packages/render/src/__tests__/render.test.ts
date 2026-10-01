import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProject } from "@genmotion/project";
import { findChromium } from "../browser";
import { checkProject } from "../check";
import { renderProject, renderStills } from "../render";
import { runFfmpeg } from "../ffmpeg";

/**
 * The real pipeline against a real browser: scaffold, check, capture, encode.
 * Skipped where no Chromium is installed (`npx genmotion browser install`).
 */
const chromium = findChromium().path;
let dir: string;

beforeAll(async () => {
  dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "genmotion-render-")), "video");
  await createProject({ dir, engine: "three", width: 320, height: 180, fps: 12 });
});

afterAll(async () => {
  await fs.rm(path.dirname(dir), { recursive: true, force: true });
});

describe.skipIf(!chromium)("headless render (three engine)", () => {
  it("checks the starter scene clean", async () => {
    const result = await checkProject({ projectDir: dir });
    expect(result.findings.filter((f) => f.level === "error")).toEqual([]);
    expect(result.scenes[0]!.sampled).toHaveLength(3);
  }, 120_000);

  it("captures a non-empty still", async () => {
    const [still] = await renderStills({ projectDir: dir, at: "1s", write: false });
    expect(still!.frame).toBe(12);
    expect(still!.image.subarray(1, 4).toString()).toBe("PNG");
  }, 120_000);

  it("renders the same frames whether chunked or not", async () => {
    const serial = await renderProject({ projectDir: dir, output: path.join(dir, "a.mp4"), frames: "0-59", concurrency: 1, crf: 0 });
    const chunked = await renderProject({ projectDir: dir, output: path.join(dir, "b.mp4"), frames: "0-59", concurrency: 2, crf: 0 });
    expect(serial.frames).toBe(60);
    expect(chunked.concurrency).toBe(2);
    const hashes = async (file: string) => {
      const out = path.join(dir, `${path.basename(file)}.md5`);
      await runFfmpeg(["-y", "-i", file, "-f", "framemd5", out]);
      return (await fs.readFile(out, "utf8")).split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split(",").pop()!.trim());
    };
    const [a, b] = await Promise.all([hashes(serial.output), hashes(chunked.output)]);
    expect(a).toHaveLength(60);
    expect(b).toEqual(a);
  }, 240_000);
});
