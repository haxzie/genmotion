import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileProject, lintProject, readTimeline, rewriteCdnScripts } from "../index";

const INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>#root { position: relative; width: 1280px; height: 720px; overflow: hidden; }</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1280" data-height="720" data-duration="6">
      <section id="title-card" class="clip" data-start="0" data-duration="2" data-track-index="0"><h1 id="title">Hi</h1></section>
      <div id="hero-slot" class="clip" data-composition-src="scenes/02-hero.html" data-composition-id="hero" data-start="2" data-duration="4" data-track-index="1"></div>
      <audio id="music" src="assets/music.mp3" data-start="1" data-duration="4" data-volume="0.4" data-media-start="2"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.from("#title", { y: 48, opacity: 0, duration: 0.6 }, 0.2);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>`;

const HERO = `<template>
  <div data-composition-id="hero" data-width="1280" data-height="720" data-duration="4">
    <h2 id="hero-title" class="clip" data-start="0.5" data-duration="3">Hero</h2>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.from("#hero-title", { opacity: 0, duration: 0.5 }, 0.5);
      window.__timelines["hero"] = tl;
    </script>
  </div>
</template>`;

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-hf-"));
  await fs.mkdir(path.join(dir, "scenes"), { recursive: true });
  await fs.mkdir(path.join(dir, "assets"), { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), INDEX);
  await fs.writeFile(path.join(dir, "scenes/02-hero.html"), HERO);
  await fs.writeFile(path.join(dir, "assets/music.mp3"), "");
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("compileProject", () => {
  it("inlines sub-compositions, swaps the runtime slot and the GSAP CDN", async () => {
    const compiled = await compileProject(dir, {
      runtime: { url: "/rt.js" },
      gsapUrl: "/gsap.js",
      probeMediaDuration: async () => 30,
    });
    expect(compiled.width).toBe(1280);
    expect(compiled.height).toBe(720);
    expect(compiled.durationSeconds).toBe(6);
    expect(compiled.html).toContain('src="/rt.js"');
    expect(compiled.html).toContain('src="/gsap.js"');
    expect(compiled.html).not.toContain("jsdelivr");
    expect(compiled.html).toContain('id="hero-title"');
  });

  it("reads clips, scenes and audio in root time", async () => {
    const compiled = await compileProject(dir, { runtime: { inline: "/*rt*/" }, gsapUrl: "/gsap.js" });
    const { timeline } = compiled;
    expect(timeline.scenes).toEqual([
      { id: "hero-slot", label: "Hero", file: "scenes/02-hero.html", start: 2, duration: 4 },
    ]);
    const hero = timeline.clips.find((c) => c.id === "hero-title");
    expect(hero?.start).toBe(2.5);
    expect(hero?.depth).toBe(1);
    expect(timeline.audio).toEqual([
      { id: "music", src: "assets/music.mp3", start: 1, duration: 4, mediaStart: 2, volume: 0.4 },
    ]);
    expect(compiled.html).toContain("<script data-hyperframes-preview-runtime=\"1\">/*rt*/</script>");
  });

  it("infers the duration from clips when the root declares none", () => {
    const tl = readTimeline(`<div data-composition-id="main"><p id="a" data-start="1" data-duration="2.5"></p></div>`);
    expect(tl.durationSeconds).toBe(3.5);
  });

  it("rewrites every CDN host GSAP is served from", () => {
    const html = [
      '<script src="https://unpkg.com/gsap@3.12.5/dist/gsap.min.js"></script>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>',
      '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/ScrollTrigger.min.js"></script>',
    ].join("");
    const out = rewriteCdnScripts(html, "/g.js");
    expect(out.match(/\/g\.js/g)).toHaveLength(2);
    expect(out).toContain("ScrollTrigger.min.js");
  });
});

describe("lintProject", () => {
  it("lints the root and every scene, naming the file", async () => {
    const report = await lintProject(dir);
    for (const f of report.findings) expect(["index.html", "scenes/02-hero.html"]).toContain(f.file);
    expect(report.ok).toBe(true);
  });

  it("catches a standalone root wrapped in a template", async () => {
    const bad = await fs.mkdtemp(path.join(os.tmpdir(), "gm-hf-bad-"));
    await fs.writeFile(path.join(bad, "index.html"), `<template>${INDEX}</template>`);
    const report = await lintProject(bad);
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.severity === "error")).toBe(true);
    await fs.rm(bad, { recursive: true, force: true });
  });
});
