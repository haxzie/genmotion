import { describe, expect, it } from "vitest";
import { readTimeline, splitAudioClip } from "../index";

const INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1280" data-height="720" data-duration="10">
      <section id="title-card" class="clip" data-start="0" data-duration="10"><h1>Hi</h1></section>
      <audio id="music" src="assets/music.mp3" data-start="1" data-duration="6" data-volume="0.4" data-media-start="2"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>`;

describe("splitAudioClip", () => {
  it("cuts the clip into two adjacent <audio> elements", () => {
    const before = readTimeline(INDEX);
    const clip = before.audio.find((c) => c.id === "music")!;
    expect(clip).toBeTruthy();

    const { html, newId } = splitAudioClip(INDEX, "music", 2.5, {
      start: clip.start,
      duration: clip.duration!,
      mediaStart: clip.mediaStart,
    });

    expect(newId).not.toBe("music");

    const after = readTimeline(html);
    const first = after.audio.find((c) => c.id === "music")!;
    const second = after.audio.find((c) => c.id === newId)!;
    expect(after.audio).toHaveLength(2);

    // First half: same start, shortened to the cut.
    expect(first.start).toBeCloseTo(1);
    expect(first.duration).toBeCloseTo(2.5);
    expect(first.mediaStart).toBeCloseTo(2);

    // Second half: starts where the first left off, resumes the source
    // where the first would have continued playing it.
    expect(second.start).toBeCloseTo(1 + 2.5);
    expect(second.duration).toBeCloseTo(6 - 2.5);
    expect(second.mediaStart).toBeCloseTo(2 + 2.5);
    expect(second.src).toBe(first.src);
    expect(second.volume).toBeCloseTo(first.volume);

    // Untouched siblings survive.
    expect(after.scenes).toEqual(before.scenes);
  });

  it("rejects a cut outside the clip", () => {
    const before = readTimeline(INDEX);
    const clip = before.audio.find((c) => c.id === "music")!;
    expect(() =>
      splitAudioClip(INDEX, "music", 6, { start: clip.start, duration: clip.duration!, mediaStart: clip.mediaStart }),
    ).toThrow();
    expect(() =>
      splitAudioClip(INDEX, "music", 0, { start: clip.start, duration: clip.duration!, mediaStart: clip.mediaStart }),
    ).toThrow();
  });

  it("rejects an unknown clip id", () => {
    expect(() => splitAudioClip(INDEX, "nope", 1, { start: 0, duration: 4, mediaStart: 0 })).toThrow();
  });
});
