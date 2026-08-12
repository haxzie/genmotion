import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameContext, VideoConfigContext } from "../context";
import { AbsoluteFill } from "../components/layout";
import { Camera, Layer, Overlay } from "../components/camera";
import { TextAnimation } from "../components/text-animation";
import { Confetti } from "../components/confetti";
import { Easing } from "../easing";

/**
 * The AI validator smoke-renders every scene with react-dom/server at three
 * frames before it reaches the DB (see packages/ai/src/tools.ts). If <Camera>
 * throws or needs the DOM during render, every camera scene the agent writes
 * fails validation — so this mirrors that path exactly.
 */
function ssr(node: React.ReactNode, frame: number, durationInFrames = 120) {
  return renderToStaticMarkup(
    <VideoConfigContext.Provider
      value={{ fps: 30, width: 1920, height: 1080, durationInFrames }}
    >
      <FrameContext.Provider value={frame}>{node}</FrameContext.Provider>
    </VideoConfigContext.Provider>,
  );
}

const KEYFRAMES = [
  { at: 0, x: 0.5, y: 0.5, zoom: 1 },
  { at: 45, x: 0.7, y: 0.35, zoom: 2.2, ease: Easing.inOutCubic },
  { at: 100, zoom: 1.3 },
];

/** Default lens is 2× frame width, so this plane travels at half speed. */
const HALF_SPEED_Z = 3840;

describe("<Camera> under SSR", () => {
  it("renders at the frames the validator samples", () => {
    for (const frame of [0, 60, 119]) {
      const html = ssr(
        <Camera world={2} keyframes={KEYFRAMES} style={{ background: "#0a0a0c" }}>
          <h1 id="hero">Ship it</h1>
        </Camera>,
        frame,
      );
      expect(html).toContain("matrix(");
      expect(html).toContain("Ship it");
    }
  });

  it("emits a transform without needing the DOM, even with focus keyframes", () => {
    const html = ssr(
      <Camera
        world={2}
        keyframes={[
          { at: 0, x: 0.5, y: 0.5, zoom: 1 },
          { at: 40, x: 0.8, y: 0.3, zoom: 2, focus: "card" },
        ]}
      >
        <div id="card">card</div>
      </Camera>,
      40,
    );
    // Falls back to the declared x/y/zoom because nothing can be measured here.
    expect(html).toContain("matrix(");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("is a visual no-op at its defaults", () => {
    const html = ssr(
      <Camera>
        <span>plain</span>
      </Camera>,
      0,
    );
    expect(html).toContain("matrix(1,0,0,1,0,0)");
  });

  it("survives drift and shake", () => {
    const html = ssr(
      <Camera
        world={1.5}
        keyframes={[{ at: 0, zoom: 1.2 }]}
        drift={{ amount: 12, speed: 0.4 }}
        shake={{ at: 10, amount: 30, duration: 12 }}
      >
        <span>steady</span>
      </Camera>,
      14,
    );
    expect(html).toContain("matrix(");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("nests inside AbsoluteFill without depending on flex layout", () => {
    const html = ssr(
      <AbsoluteFill style={{ background: "#000" }}>
        <Camera world={2} keyframes={KEYFRAMES}>
          <span>inner</span>
        </Camera>
      </AbsoluteFill>,
      45,
    );
    expect(html).toContain("inner");
    expect(html).toContain("matrix(");
  });

  it("never emits a non-finite matrix component", () => {
    for (let frame = 0; frame < 120; frame++) {
      const html = ssr(
        <Camera world={2} keyframes={KEYFRAMES} drift={{ amount: 8 }}>
          <span>f</span>
        </Camera>,
        frame,
      );
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe("<Layer> and <Overlay>", () => {
  it("tags each plane with its z, in document order", () => {
    const html = ssr(
      <Camera world={2} keyframes={[{ at: 0, x: 0.7, y: 0.3, zoom: 2 }]}>
        <Layer z={HALF_SPEED_Z}>
          <span>bg</span>
        </Layer>
        <Layer>
          <span>mid</span>
        </Layer>
        <Overlay>
          <span>hud</span>
        </Overlay>
      </Camera>,
      0,
    );
    expect(html).toContain(`data-camera-z="${HALF_SPEED_Z}"`);
    expect(html).toContain('data-camera-z="0"');
    expect(html).toContain("data-camera-overlay");
    expect(html.indexOf("bg")).toBeLessThan(html.indexOf("mid"));
    expect(html.indexOf("mid")).toBeLessThan(html.indexOf("hud"));
  });

  it("moves a distant plane less than the screen plane", () => {
    const html = ssr(
      <Camera world={2} keyframes={[{ at: 0, x: 0.8, y: 0.5, zoom: 1 }]}>
        <Layer z={HALF_SPEED_Z}>
          <span>far</span>
        </Layer>
        <Layer>
          <span>near</span>
        </Layer>
      </Camera>,
      0,
    );
    const matrices = [...html.matchAll(/matrix\(([^)]*)\)/g)].map((m) =>
      m[1]!.split(",").map(Number),
    );
    // The far plane covers less ground for the same camera offset.
    expect(Math.abs(matrices[0]![4]!)).toBeLessThan(Math.abs(matrices[1]![4]!));
  });

  it("makes an Overlay frame-sized and never transforms it", () => {
    const at = (frame: number) =>
      ssr(
        <Camera world={2} keyframes={KEYFRAMES}>
          <Overlay>
            <span>hud</span>
          </Overlay>
        </Camera>,
        frame,
      );
    // Frame-sized, not world-sized (3840x2160 at world=2), so `bottom`/`right`
    // anchor to the picture edge as an author expects.
    for (const frame of [0, 20, 45, 80, 119]) {
      const tag = at(frame).match(/<div data-camera-overlay[^>]*>/)![0];
      expect(tag).toContain("width:1920px;height:1080px");
      expect(tag).not.toContain("3840");
      expect(tag).not.toContain("matrix(");
    }
  });

  it("wraps loose children in an implicit z=0 plane, preserving order", () => {
    const html = ssr(
      <Camera world={2}>
        <span>before</span>
        <Overlay>
          <span>hud</span>
        </Overlay>
        <span>after</span>
      </Camera>,
      0,
    );
    expect(html.indexOf("before")).toBeLessThan(html.indexOf("hud"));
    expect(html.indexOf("hud")).toBeLessThan(html.indexOf("after"));
    expect(html.match(/data-camera-z/g)).toHaveLength(2);
    expect(html.match(/data-camera-overlay/g)).toHaveLength(1);
  });
});

describe("raster hints under a camera", () => {
  it("TextAnimation drops will-change inside a Camera but keeps it outside", () => {
    const inside = ssr(
      <Camera world={2} keyframes={KEYFRAMES}>
        <TextAnimation text="Ship it faster" by="word" preset="blurUp" />
      </Camera>,
      10,
    );
    const outside = ssr(
      <AbsoluteFill>
        <TextAnimation text="Ship it faster" by="word" preset="blurUp" />
      </AbsoluteFill>,
      10,
    );
    // `will-change:auto` on the plane boxes is fine and expected; it is the
    // raster-PINNING hint that must not survive under a camera.
    expect(inside).not.toContain("will-change:transform");
    expect(outside).toContain("will-change:transform");
  });

  it("Confetti does the same", () => {
    const inside = ssr(
      <Camera world={2} keyframes={KEYFRAMES}>
        <Confetti count={6} />
      </Camera>,
      10,
    );
    const outside = ssr(
      <AbsoluteFill>
        <Confetti count={6} />
      </AbsoluteFill>,
      10,
    );
    expect(inside).not.toContain("will-change:transform");
    expect(outside).toContain("will-change:transform");
  });

  it("never promotes the plane boxes themselves", () => {
    const html = ssr(
      <Camera world={2} keyframes={KEYFRAMES}>
        <span>x</span>
      </Camera>,
      45,
    );
    expect(html).toContain("will-change:auto");
  });
});

describe("perspective tilt", () => {
  const TILTED = [
    { at: 0, x: 0.5, y: 0.5, zoom: 1, tilt: { x: 0, y: 0 } },
    { at: 60, x: 0.5, y: 0.5, zoom: 1.4, tilt: { x: 14, y: -8 } },
  ];

  it("puts perspective on the world container, not the viewport", () => {
    const html = ssr(
      <Camera world={2} perspective={2} keyframes={TILTED}>
        <span>x</span>
      </Camera>,
      60,
    );
    // `perspective` only reaches an element's DIRECT children, and the planes
    // are children of the world div — so it has to live there.
    const world = html.match(
      /<div style="position:absolute;left:0;top:0;width:3840px[^"]*"/,
    )![0];
    expect(world).toContain("perspective:3840px");
    expect(world).toContain("perspective-origin:960px 540px");
  });

  it("does not establish a 3D context when nothing tilts", () => {
    const html = ssr(
      <Camera world={2} keyframes={KEYFRAMES}>
        <span>x</span>
      </Camera>,
      45,
    );
    expect(html).not.toContain("perspective");
  });

  it("emits rotations on the plane, pivoting about frame centre", () => {
    const html = ssr(
      <Camera world={2} keyframes={TILTED}>
        <span>x</span>
      </Camera>,
      60,
    );
    expect(html).toContain("translate(960px,540px)");
    expect(html).toContain("rotateX(14deg)");
    expect(html).toContain("rotateY(-8deg)");
  });

  it("leaves an Overlay untilted", () => {
    const html = ssr(
      <Camera world={2} keyframes={TILTED}>
        <Overlay>
          <span>hud</span>
        </Overlay>
      </Camera>,
      60,
    );
    const tag = html.match(/<div data-camera-overlay[^>]*>/)![0];
    expect(tag).not.toContain("rotateX");
    expect(tag).not.toContain("rotateY");
  });

  it("tilts a distant plane less than the screen plane", () => {
    const html = ssr(
      <Camera world={2} keyframes={TILTED}>
        <Layer z={HALF_SPEED_Z}>
          <span>far</span>
        </Layer>
        <Layer>
          <span>near</span>
        </Layer>
      </Camera>,
      60,
    );
    const angles = [...html.matchAll(/rotateX\(([-\d.]+)deg\)/g)].map((m) =>
      Number(m[1]),
    );
    expect(angles).toHaveLength(2);
    expect(Math.abs(angles[0]!)).toBeLessThan(Math.abs(angles[1]!));
  });

  it("stays finite across the whole tilt move", () => {
    for (let frame = 0; frame <= 60; frame += 4) {
      const html = ssr(
        <Camera world={2} keyframes={TILTED}>
          <Layer z={HALF_SPEED_Z}>
            <span>bg</span>
          </Layer>
          <Layer>
            <span>mid</span>
          </Layer>
        </Camera>,
        frame,
      );
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });
});
