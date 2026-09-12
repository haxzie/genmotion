import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { planAudioMix } from "../hyperframes-audio";

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-hf-audio-"));
  await fs.mkdir(path.join(dir, "assets"));
  await fs.writeFile(path.join(dir, "assets/bgm.mp3"), "");
  await fs.writeFile(path.join(dir, "assets/vo.mp3"), "");
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const fps = 30;
const bgm = { id: "bgm", src: "assets/bgm.mp3", start: 0, duration: 4, mediaStart: 0, volume: 0.4 };

/** A page that reported the same gain every frame. */
function flat(frames: number, levels: Record<string, number>) {
  return Array.from({ length: frames }, () => ({ ...levels }));
}

describe("planAudioMix", () => {
  it("returns null when nothing is mixable", () => {
    expect(planAudioMix(dir, [], [], fps, 120)).toBeNull();
    expect(
      planAudioMix(dir, [{ ...bgm, src: "assets/missing.mp3" }], flat(120, { bgm: 0.4 }), fps, 120),
    ).toBeNull();
  });

  it("uses a constant volume when the page reported one", () => {
    const plan = planAudioMix(dir, [bgm], flat(120, { bgm: 0.4 }), fps, 120);
    expect(plan?.streams).toBe(1);
    expect(plan?.inputs).toEqual(["-i", path.join(dir, "assets/bgm.mp3")]);
    expect(plan?.filterComplex).toContain("atrim=duration=4.000,volume=0.400,adelay=0|0[a1]");
    expect(plan?.filterComplex).toContain("amix=inputs=1");
  });

  it("falls back to data-volume when the page never listed the element", () => {
    const plan = planAudioMix(dir, [bgm], flat(120, {}), fps, 120);
    expect(plan?.filterComplex).toContain("volume=0.400");
  });

  it("turns a timeline fade into a piecewise envelope in the clip's own time", () => {
    // Full for a second, then a one-second linear fade to silence, then silence.
    const samples = Array.from({ length: 120 }, (_, f) => {
      const t = f / fps;
      const v = t < 1 ? 0.4 : t < 2 ? 0.4 * (2 - t) : 0;
      return { bgm: v };
    });
    const plan = planAudioMix(dir, [bgm], samples, fps, 120);
    const filter = plan?.filterComplex ?? "";
    expect(filter).toContain("eval=frame");
    // Breakpoints at 0s, 1s, 2s: the flat run, the ramp, the tail.
    expect(filter).toMatch(/if\(lt\(t,1\.0000\),\(0\.4000\+\(0\.4000-0\.4000\)/);
    expect(filter).toMatch(/if\(lt\(t,2\.0000\),\(0\.4000\+\(0\.0000-0\.4000\)\*\(t-1\.0000\)\/1\.0000\)/);
  });

  it("re-applies a boost above unity, which the element clamps away", () => {
    const loud = { ...bgm, volume: 2 };
    const plan = planAudioMix(dir, [loud], flat(120, { bgm: 1 }), fps, 120);
    expect(plan?.filterComplex).toContain("volume=2.000");
  });

  it("offsets into the source and delays onto the timeline", () => {
    const vo = { id: "vo", src: "assets/vo.mp3", start: 1.5, duration: 2, mediaStart: 0.25, volume: 1 };
    const plan = planAudioMix(dir, [bgm, vo], flat(120, { bgm: 0.4, vo: 1 }), fps, 120);
    expect(plan?.inputs).toEqual([
      "-i", path.join(dir, "assets/bgm.mp3"),
      "-ss", "0.250", "-i", path.join(dir, "assets/vo.mp3"),
    ]);
    expect(plan?.filterComplex).toContain("[2:a]atrim=duration=2.000,volume=1.000,adelay=1500|1500[a2]");
    expect(plan?.filterComplex).toContain("amix=inputs=2");
  });

  it("runs an open-ended clip to the end of the video", () => {
    const plan = planAudioMix(dir, [{ ...bgm, duration: null }], flat(90, { bgm: 0.4 }), fps, 90);
    expect(plan?.filterComplex).toContain("atrim=duration=3.000");
  });
});
