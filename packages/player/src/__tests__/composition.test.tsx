import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useCurrentFrame, useVideoConfig } from "@genmotion/motion";
import { Composition } from "../composition";
import type { CompiledScene } from "../types";

function Probe() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <span data-probe={`${frame}/${durationInFrames}`} />;
}

function render(scenes: CompiledScene[], frame: number): string {
  const html = renderToStaticMarkup(
    <Composition scenes={scenes} frame={frame} fps={30} width={100} height={100} mode="render" />,
  );
  return /data-probe="([^"]+)"/.exec(html)?.[1] ?? "";
}

describe("Composition", () => {
  const whole: CompiledScene = { id: "a.tsx", name: "A", durationInFrames: 100, component: Probe };

  it("hands a scene its own frame and length", () => {
    expect(render([whole], 42)).toBe("42/100");
  });

  it("plays a split scene's halves as windows of the whole", () => {
    const halves: CompiledScene[] = [
      { ...whole, durationInFrames: 40, sourceDurationInFrames: 100 },
      { ...whole, id: "a-2.tsx", startFrom: 40, durationInFrames: 60, sourceDurationInFrames: 100 },
    ];
    // Same picture at every global frame as the unsplit scene gave.
    expect(render(halves, 10)).toBe("10/100");
    expect(render(halves, 39)).toBe("39/100");
    expect(render(halves, 40)).toBe("40/100");
    expect(render(halves, 99)).toBe("99/100");
  });
});
