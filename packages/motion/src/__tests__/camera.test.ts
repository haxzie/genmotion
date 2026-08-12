import { describe, expect, it } from "vitest";
import {
  CAMERA_DEFAULTS,
  cameraAt,
  cameraClampWarnings,
  cameraMatrix,
  cameraMatrixToCss,
  clampCamera,
  invertCameraMatrix,
  minZoomForWorld,
  resolveCameraKeyframes,
  cameraTransform,
  clampTilt,
  depthForZ,
  zForDepth,
  horizonHeadroom,
  zoomToFit,
  type CameraGeometry,
  type CameraState,
} from "../camera";
import { Easing } from "../easing";

const HD: CameraGeometry = { width: 1920, height: 1080, world: 1 };
const WIDE: CameraGeometry = { width: 1920, height: 1080, world: 1.5 };

const opts = (geometry: CameraGeometry, extra = {}) => ({
  geometry,
  fps: 30,
  ...extra,
});

describe("cameraMatrix", () => {
  it("is identity-ish at rest", () => {
    // world=1, centred, zoom 1: the world exactly covers the frame.
    expect(cameraMatrix(CAMERA_DEFAULTS, HD)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("matches the worked example", () => {
    // 1920x1080, world 1.5 (2880x1620), zoom 2, x 0.7, y 0.3
    const m = cameraMatrix({ x: 0.7, y: 0.3, zoom: 2, rotation: 0, tiltX: 0, tiltY: 0 }, WIDE);
    expect(m[0]).toBeCloseTo(2, 9);
    expect(m[1]).toBeCloseTo(0, 9);
    expect(m[2]).toBeCloseTo(0, 9);
    expect(m[3]).toBeCloseTo(2, 9);
    expect(m[4]).toBeCloseTo(-3072, 6);
    expect(m[5]).toBeCloseTo(-432, 6);
  });

  it("puts the camera centre at frame centre", () => {
    const state = { x: 0.7, y: 0.3, zoom: 2, rotation: 0, tiltX: 0, tiltY: 0 };
    const m = cameraMatrix(state, WIDE);
    const cx = state.x * WIDE.width * WIDE.world;
    const cy = state.y * WIDE.height * WIDE.world;
    expect(m[0] * cx + m[2] * cy + m[4]).toBeCloseTo(WIDE.width / 2, 6);
    expect(m[1] * cx + m[3] * cy + m[5]).toBeCloseTo(WIDE.height / 2, 6);
  });

  it("holds that invariant under roll too", () => {
    const state = { x: 0.4, y: 0.6, zoom: 1.8, rotation: 30, tiltX: 0, tiltY: 0 };
    const m = cameraMatrix(state, WIDE);
    const cx = state.x * WIDE.width * WIDE.world;
    const cy = state.y * WIDE.height * WIDE.world;
    expect(m[0] * cx + m[2] * cy + m[4]).toBeCloseTo(WIDE.width / 2, 6);
    expect(m[1] * cx + m[3] * cy + m[5]).toBeCloseTo(WIDE.height / 2, 6);
  });
});

describe("cameraMatrix depth", () => {
  const state = { x: 0.7, y: 0.3, zoom: 2, rotation: 0, tiltX: 0, tiltY: 0 };

  it("depth 1 is world-locked", () => {
    expect(cameraMatrix(state, WIDE, 1)).toEqual(cameraMatrix(state, WIDE));
  });

  it("depth 0 is screen-locked — constant for ANY camera state", () => {
    const expected = [1, 0, 0, 1, -480, -270];
    expect(cameraMatrix(state, WIDE, 0)).toEqual(expected);
    expect(cameraMatrix({ x: 0.1, y: 0.9, zoom: 4, rotation: 45, tiltX: 0, tiltY: 0 }, WIDE, 0)).toEqual(
      expected,
    );
    expect(cameraMatrix(CAMERA_DEFAULTS, WIDE, 0)).toEqual(expected);
  });

  it("matches the worked half-depth example", () => {
    const m = cameraMatrix(state, WIDE, 0.5);
    expect(m[0]).toBeCloseTo(Math.SQRT2, 9);
    expect(m[4]).toBeCloseTo(-1483.761, 3);
    expect(m[5]).toBeCloseTo(-376.41, 2);
  });

  it("moves a point monotonically as depth grows", () => {
    const worldCentre = [1440, 810] as const;
    const screenX = (d: number) => {
      const m = cameraMatrix(state, WIDE, d);
      return m[0] * worldCentre[0] + m[2] * worldCentre[1] + m[4];
    };
    expect(screenX(0)).toBeCloseTo(960, 6);
    expect(screenX(0.5)).toBeCloseTo(552.7, 1);
    expect(screenX(1)).toBeCloseTo(-192, 6);
  });

  it("composes multiplicatively — two half-depths make the whole zoom", () => {
    const half = cameraMatrix(state, WIDE, 0.5)[0];
    expect(half * half).toBeCloseTo(cameraMatrix(state, WIDE, 1)[0], 9);
  });
});

describe("cameraMatrixToCss", () => {
  it("serializes finite matrices", () => {
    expect(cameraMatrixToCss([1, 0, 0, 1, 0, 0])).toBe("matrix(1,0,0,1,0,0)");
  });

  it("returns null rather than emitting invalid CSS", () => {
    expect(cameraMatrixToCss([1, 0, 0, 1, Number.NaN, 0])).toBeNull();
    expect(cameraMatrixToCss([Infinity, 0, 0, 1, 0, 0])).toBeNull();
  });
});

describe("invertCameraMatrix", () => {
  it("round-trips a world point through the matrix", () => {
    const state = { x: 0.6, y: 0.4, zoom: 2.5, rotation: 22, tiltX: 0, tiltY: 0 };
    const m = cameraMatrix(state, WIDE);
    const world = { x: 1234, y: 567 };
    const sx = m[0] * world.x + m[2] * world.y + m[4];
    const sy = m[1] * world.x + m[3] * world.y + m[5];
    const back = invertCameraMatrix(m, sx, sy);
    expect(back.x).toBeCloseTo(world.x, 6);
    expect(back.y).toBeCloseTo(world.y, 6);
  });
});

describe("resolveCameraKeyframes", () => {
  it("inherits omitted fields from the previous keyframe", () => {
    const [a, b, c] = resolveCameraKeyframes([
      { at: 0, x: 0.2, y: 0.8, zoom: 1 },
      { at: 30, zoom: 2 },
      { at: 60, x: 0.9 },
    ]);
    expect(a).toMatchObject({ x: 0.2, y: 0.8, zoom: 1, rotation: 0, tiltX: 0, tiltY: 0 });
    expect(b).toMatchObject({ x: 0.2, y: 0.8, zoom: 2 });
    expect(c).toMatchObject({ x: 0.9, y: 0.8, zoom: 2 });
  });

  it("defaults the first keyframe to centre at zoom 1", () => {
    expect(resolveCameraKeyframes([{ at: 0 }])[0]).toMatchObject(CAMERA_DEFAULTS);
  });

  it("sorts by frame", () => {
    const out = resolveCameraKeyframes([{ at: 60 }, { at: 0 }, { at: 30 }]);
    expect(out.map((k) => k.at)).toEqual([0, 30, 60]);
  });
});

describe("cameraAt", () => {
  it("is the identity when there are no keyframes", () => {
    expect(cameraAt(42, [], opts(HD))).toMatchObject(CAMERA_DEFAULTS);
  });

  it("holds before the first and after the last keyframe", () => {
    const kfs = [
      { at: 30, zoom: 1 },
      { at: 60, zoom: 2 },
    ];
    expect(cameraAt(0, kfs, opts(WIDE)).zoom).toBeCloseTo(1, 9);
    expect(cameraAt(999, kfs, opts(WIDE)).zoom).toBeCloseTo(2, 9);
  });

  it("hits keyframe values exactly at their frame", () => {
    const kfs = [
      { at: 0, zoom: 1 },
      { at: 60, zoom: 3.5 },
    ];
    expect(cameraAt(0, kfs, opts(WIDE)).zoom).toBe(1);
    expect(cameraAt(60, kfs, opts(WIDE)).zoom).toBe(3.5);
  });

  it("interpolates zoom in log space, not linearly", () => {
    const kfs = [
      { at: 0, zoom: 1, ease: Easing.linear },
      { at: 60, zoom: 8, ease: Easing.linear },
    ];
    // Linear would give 4.5 here; log gives sqrt(8).
    expect(cameraAt(30, kfs, opts({ ...HD, world: 8 })).zoom).toBeCloseTo(
      Math.sqrt(8),
      9,
    );
  });

  it("applies each segment's own easing", () => {
    const eased = cameraAt(
      30,
      [
        { at: 0, zoom: 1 },
        { at: 60, zoom: 4, ease: Easing.linear },
      ],
      opts({ ...HD, world: 4 }),
    ).zoom;
    expect(eased).toBeCloseTo(2, 9); // linear ease at t=0.5 -> sqrt(4)
  });

  it("treats a duplicate `at` as a cut rather than throwing", () => {
    const kfs = [
      { at: 0, zoom: 1 },
      { at: 30, zoom: 3 },
      { at: 30, zoom: 1 },
      { at: 60, zoom: 1 },
    ];
    const geo = { ...HD, world: 3 };
    expect(() => cameraAt(29, kfs, opts(geo))).not.toThrow();
    // Approaching the cut we head for zoom 3; from it we are back at 1.
    expect(cameraAt(29, kfs, opts(geo)).zoom).toBeGreaterThan(2.5);
    expect(cameraAt(30, kfs, opts(geo)).zoom).toBeCloseTo(1, 9);
  });

  it("is deterministic regardless of evaluation order", () => {
    const kfs = [
      { at: 0, x: 0.2, y: 0.3, zoom: 1 },
      { at: 40, x: 0.8, y: 0.7, zoom: 2.5 },
      { at: 90, x: 0.5, y: 0.5, zoom: 1.2, path: "smooth" as const },
    ];
    const options = opts(WIDE, {
      drift: { amount: 10, speed: 0.5 },
      shake: { at: 20, amount: 24, duration: 15 },
    });
    const frames = [40, 3, 25, 9, 17, 88, 60];
    const first = frames.map((f) => cameraAt(f, kfs, options));
    const second = frames.map((f) => cameraAt(f, kfs, options));
    expect(first).toEqual(second);
    // ...and evaluating them ascending must not change anything either.
    const ascending = [...frames]
      .sort((a, b) => a - b)
      .map((f) => cameraAt(f, kfs, options));
    for (const [i, f] of frames.entries()) {
      const j = [...frames].sort((a, b) => a - b).indexOf(f);
      expect(first[i]).toEqual(ascending[j]);
    }
  });

  it("applies focus overrides in place of declared values", () => {
    const kfs = [
      { at: 0, zoom: 1 },
      { at: 30, x: 0.5, y: 0.5, zoom: 2, focus: "card" },
    ];
    const geo = { ...HD, world: 2 };
    const withOverride = cameraAt(30, kfs, {
      ...opts(geo),
      overrides: [undefined, { x: 0.8, y: 0.25, zoom: 3 }],
    });
    expect(withOverride.x).toBeCloseTo(0.8, 9);
    expect(withOverride.zoom).toBeCloseTo(3, 9);
  });

  it("falls back to declared values when a focus target is unresolved", () => {
    const kfs = [
      { at: 0, zoom: 1 },
      { at: 30, x: 0.6, y: 0.4, zoom: 2, focus: "missing" },
    ];
    const geo = { ...HD, world: 2 };
    const state = cameraAt(30, kfs, { ...opts(geo), overrides: [undefined, undefined] });
    expect(state.x).toBeCloseTo(0.6, 9);
    expect(state.zoom).toBeCloseTo(2, 9);
  });
});

describe("drift and shake", () => {
  it("drift leaves the camera untouched when amount is zero", () => {
    const plain = cameraAt(37, [{ at: 0 }], opts(WIDE));
    const drifted = cameraAt(37, [{ at: 0 }], opts(WIDE, { drift: { amount: 0 } }));
    expect(drifted).toEqual(plain);
  });

  it("drift moves the camera without accumulating", () => {
    const options = opts(WIDE, { drift: { amount: 20, speed: 0.5 } });
    const a = cameraAt(50, [{ at: 0, zoom: 1.5 }], options);
    const again = cameraAt(50, [{ at: 0, zoom: 1.5 }], options);
    expect(a).toEqual(again);
    const b = cameraAt(51, [{ at: 0, zoom: 1.5 }], options);
    expect(a.x).not.toBeCloseTo(b.x, 9);
  });

  it("shake is inert outside its window and decays to nothing", () => {
    const shake = { at: 20, amount: 40, duration: 10 };
    const still = cameraAt(5, [{ at: 0, zoom: 1.5 }], opts(WIDE, { shake }));
    const plain = cameraAt(5, [{ at: 0, zoom: 1.5 }], opts(WIDE));
    expect(still).toEqual(plain);
    expect(cameraAt(30, [{ at: 0, zoom: 1.5 }], opts(WIDE, { shake }))).toEqual(
      cameraAt(30, [{ at: 0, zoom: 1.5 }], opts(WIDE)),
    );
  });

  it("shake does not reach a depth-0 layer", () => {
    const shaken = cameraAt(
      22,
      [{ at: 0, zoom: 1.5 }],
      opts(WIDE, { shake: { at: 20, amount: 60, duration: 12 } }),
    );
    const calm = cameraAt(22, [{ at: 0, zoom: 1.5 }], opts(WIDE));
    expect(cameraMatrix(shaken, WIDE, 0)).toEqual(cameraMatrix(calm, WIDE, 0));
  });
});

describe("van Wijk path", () => {
  const geo: CameraGeometry = { width: 1920, height: 1080, world: 3 };

  it("matches the reference midpoint for a combined pan and zoom", () => {
    // p0 = (1440,810,w=1920) -> p1 = (2016,486,w=960), expressed in a world
    // big enough that no clamping interferes.
    const wide: CameraGeometry = { width: 1920, height: 1080, world: 1.5 };
    const kfs = [
      { at: 0, x: 0.5, y: 0.5, zoom: 1, ease: Easing.linear },
      {
        at: 60,
        x: 0.7,
        y: 0.3,
        zoom: 2,
        ease: Easing.linear,
        path: "smooth" as const,
      },
    ];
    const mid = cameraAt(30, kfs, { ...opts(wide), clamp: false });
    expect(mid.x).toBeCloseTo(0.6333, 3);
    expect(mid.y).toBeCloseTo(0.3667, 3);
    expect(mid.zoom).toBeCloseTo(1.2852, 3);
  });

  it("reduces to log zoom when there is no pan", () => {
    const kfs = [
      { at: 0, zoom: 1, ease: Easing.linear },
      { at: 60, zoom: 4, ease: Easing.linear, path: "smooth" as const },
    ];
    expect(cameraAt(30, kfs, { ...opts(geo), clamp: false }).zoom).toBeCloseTo(2, 6);
  });

  it("survives identical endpoints without dividing by zero", () => {
    const kfs = [
      { at: 0, x: 0.5, y: 0.5, zoom: 2 },
      { at: 60, x: 0.5, y: 0.5, zoom: 2, path: "smooth" as const },
    ];
    const mid = cameraAt(30, kfs, { ...opts(geo), clamp: false });
    expect(mid.x).toBeCloseTo(0.5, 9);
    expect(mid.zoom).toBeCloseTo(2, 9);
    expect(Number.isFinite(mid.zoom)).toBe(true);
  });

  it("arcs outward on a pure pan — which is why it is opt-in", () => {
    const kfs = [
      { at: 0, x: 0.35, y: 0.5, zoom: 2, ease: Easing.linear },
      {
        at: 60,
        x: 0.65,
        y: 0.5,
        zoom: 2,
        ease: Easing.linear,
        path: "smooth" as const,
      },
    ];
    const mid = cameraAt(30, kfs, { ...opts(geo), clamp: false });
    expect(mid.zoom).toBeLessThan(2);
  });

  it("falls back to the straight path when the arc would leave the world", () => {
    const tight: CameraGeometry = { width: 1920, height: 1080, world: 1 };
    const kfs = [
      { at: 0, x: 0.5, y: 0.5, zoom: 2, ease: Easing.linear },
      {
        at: 60,
        x: 0.5,
        y: 0.5,
        zoom: 4,
        ease: Easing.linear,
        path: "smooth" as const,
      },
    ];
    // No pan, so straight and smooth agree — the point is it stays finite.
    const mid = cameraAt(30, kfs, { ...opts(tight), clamp: false });
    expect(mid.zoom).toBeCloseTo(Math.sqrt(8), 6);
  });
});

describe("clampCamera", () => {
  it("pins to centre when the world is exactly the frame", () => {
    const clamped = clampCamera({ x: 0.9, y: 0.1, zoom: 1, rotation: 0, tiltX: 0, tiltY: 0 }, HD);
    expect(clamped.x).toBeCloseTo(0.5, 9);
    expect(clamped.y).toBeCloseTo(0.5, 9);
  });

  it("widens the legal range as zoom increases", () => {
    expect(clampCamera({ x: 1, y: 0.5, zoom: 1, rotation: 0, tiltX: 0, tiltY: 0 }, WIDE).x).toBeCloseTo(
      2 / 3,
      6,
    );
    expect(clampCamera({ x: 1, y: 0.5, zoom: 2, rotation: 0, tiltX: 0, tiltY: 0 }, WIDE).x).toBeCloseTo(
      5 / 6,
      6,
    );
  });

  it("leaves an in-bounds camera alone", () => {
    const state = { x: 0.7, y: 0.3, zoom: 2, rotation: 0, tiltX: 0, tiltY: 0 };
    expect(clampCamera(state, WIDE)).toEqual(state);
  });

  it("accounts for roll when computing the footprint", () => {
    // A 30-degree roll at zoom 1 needs more world than world=1.5 provides.
    const rolled = clampCamera({ x: 0.5, y: 0.2, zoom: 1, rotation: 30, tiltX: 0, tiltY: 0 }, WIDE);
    expect(rolled.y).toBeCloseTo(0.5, 6);
  });
});

describe("minZoomForWorld", () => {
  it("is 1 when the world is the frame", () => {
    expect(minZoomForWorld(HD)).toBeCloseTo(1, 9);
  });

  it("drops as the world grows", () => {
    expect(minZoomForWorld(WIDE)).toBeCloseTo(1 / 1.5, 9);
  });

  it("rises with roll", () => {
    expect(minZoomForWorld(WIDE, 30)).toBeGreaterThan(minZoomForWorld(WIDE, 0));
  });
});

describe("zoomToFit", () => {
  it("contains a rect at the requested fraction of the frame", () => {
    // A 960x540 rect contained at 80% of a 1920x1080 frame.
    expect(zoomToFit({ width: 960, height: 540 }, HD, 0.8)).toBeCloseTo(1.6, 9);
  });

  it("covers rather than contains when asked", () => {
    expect(zoomToFit({ width: 960, height: 200 }, HD, 1, "cover")).toBeCloseTo(5.4, 9);
  });

  it("returns NaN for a degenerate rect so the caller can hold its last value", () => {
    expect(Number.isNaN(zoomToFit({ width: 0, height: 100 }, HD, 1))).toBe(true);
  });
});

describe("cameraClampWarnings", () => {
  it("flags a push-in whose endpoints clamp differently", () => {
    const warnings = cameraClampWarnings(
      [
        { at: 0, x: 0.7, y: 0.3, zoom: 1 },
        { at: 60, x: 0.7, y: 0.3, zoom: 2 },
      ],
      WIDE,
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("frame 0");
  });

  it("stays quiet when every keyframe is in bounds", () => {
    expect(
      cameraClampWarnings(
        [
          { at: 0, x: 0.5, y: 0.5, zoom: 1 },
          { at: 60, x: 0.7, y: 0.4, zoom: 2 },
        ],
        WIDE,
      ),
    ).toEqual([]);
  });

  it("ignores keyframes whose position will be measured", () => {
    expect(
      cameraClampWarnings([{ at: 0, x: 0.95, y: 0.05, zoom: 1, focus: "card" }], WIDE),
    ).toEqual([]);
  });
});

describe("perspective tilt", () => {
  const TILT: CameraGeometry = {
    width: 1920,
    height: 1080,
    world: 2,
    perspective: 3840,
  };
  const tilted = (tiltX: number, tiltY: number): CameraState => ({
    ...CAMERA_DEFAULTS,
    tiltX,
    tiltY,
  });

  it("keeps the flat transform byte-identical when nothing tilts", () => {
    const state = tilted(0, 0);
    expect(cameraTransform(state, TILT)).toBe(
      cameraMatrixToCss(cameraMatrix(state, TILT)),
    );
  });

  it("emits rotations outside the matrix, pivoting about frame centre", () => {
    const css = cameraTransform({ ...tilted(12, -6), zoom: 1.5 }, TILT)!;
    expect(css).toContain("translate(960px,540px)");
    expect(css).toContain("rotateX(12deg)");
    expect(css).toContain("rotateY(-6deg)");
    // The recentre is pulled out of the matrix, so what remains maps the
    // camera target to the origin the rotations pivot around.
    const m = cameraMatrix({ ...tilted(12, -6), zoom: 1.5 }, TILT);
    expect(css).toContain(`${m[4] - TILT.width / 2},${m[5] - TILT.height / 2})`);
  });

  it("scales tilt by depth, so depth 0 stays flat", () => {
    const state = tilted(20, 10);
    expect(cameraTransform(state, TILT, 0.5)).toContain("rotateX(10deg)");
    // Depth 0 has no rotation left, so it falls back to the plain matrix.
    expect(cameraTransform(state, TILT, 0)).toBe(
      cameraMatrixToCss(cameraMatrix(state, TILT, 0)),
    );
  });

  it("interpolates tilt across a segment and inherits it per axis", () => {
    const kfs = [
      { at: 0, tilt: { x: 0, y: 0 } },
      { at: 60, tilt: { x: 10 }, ease: Easing.linear },
    ];
    const mid = cameraAt(30, kfs, { geometry: TILT, fps: 30 });
    expect(mid.tiltX).toBeCloseTo(5, 6);
    expect(mid.tiltY).toBeCloseTo(0, 9);
    // y was never set on the second keyframe, so it inherits rather than reset.
    expect(cameraAt(60, kfs, { geometry: TILT, fps: 30 }).tiltX).toBeCloseTo(10, 6);
  });

  it("reports shrinking headroom as the plane tips away", () => {
    expect(horizonHeadroom(0, 0, TILT)).toBeCloseTo(1, 9);
    const gentle = horizonHeadroom(10, 0, TILT);
    const steep = horizonHeadroom(30, 0, TILT);
    expect(gentle).toBeLessThan(1);
    expect(steep).toBeLessThan(gentle);
  });

  it("leaves a safe tilt alone but scales back one that would show the horizon", () => {
    expect(clampTilt(8, 4, TILT)).toEqual({ tiltX: 8, tiltY: 4 });
    // 85 degrees puts the horizon inside the frame at this viewer distance.
    const steep = clampTilt(85, 0, TILT);
    expect(steep.tiltX).toBeLessThan(85);
    expect(steep.tiltX).toBeGreaterThan(0);
    // Whatever it settles on must actually clear the horizon margin.
    expect(horizonHeadroom(steep.tiltX, steep.tiltY, TILT)).toBeGreaterThan(0.34);
  });

  it("binds sooner on a shallower (wider) lens", () => {
    const wide: CameraGeometry = { ...TILT, perspective: 900 };
    expect(horizonHeadroom(55, 0, wide)).toBeLessThan(horizonHeadroom(55, 0, TILT));
    // 55° is comfortably legal on the long lens but crosses on the wide one.
    expect(clampTilt(55, 0, TILT).tiltX).toBe(55);
    expect(clampTilt(55, 0, wide).tiltX).toBeLessThan(55);
  });

  it("caps tilt through cameraAt so a wild keyframe can't break the clamp", () => {
    const state = cameraAt(0, [{ at: 0, tilt: { x: 80 } }], {
      geometry: TILT,
      fps: 30,
    });
    expect(state.tiltX).toBeLessThan(80);
    expect(Number.isFinite(state.x)).toBe(true);
    expect(Number.isFinite(state.y)).toBe(true);
  });

  it("widens the clamped footprint once the plane tilts", () => {
    // A tilted plane covers more world than a flat one at the same zoom, so
    // the legal band for the camera centre shrinks.
    const flat = clampCamera({ ...tilted(0, 0), x: 0.02, y: 0.5 }, TILT);
    const tip = clampCamera({ ...tilted(14, 0), x: 0.02, y: 0.5 }, TILT);
    expect(tip.y).toBeGreaterThanOrEqual(flat.y - 1e-9);
    expect(Number.isFinite(tip.x)).toBe(true);
  });

  it("needs more zoom to fill the world once tilted", () => {
    expect(minZoomForWorld(TILT, 0, 14, 0)).toBeGreaterThan(minZoomForWorld(TILT, 0));
  });

  it("never emits a non-finite transform across a tilt move", () => {
    const kfs = [
      { at: 0, x: 0.5, y: 0.5, zoom: 1, tilt: { x: 0, y: 0 } },
      { at: 60, x: 0.6, y: 0.4, zoom: 2, tilt: { x: 16, y: -10 } },
    ];
    for (let f = 0; f <= 60; f++) {
      const s = cameraAt(f, kfs, { geometry: TILT, fps: 30 });
      for (const depth of [0, 0.4, 1]) {
        const css = cameraTransform(s, TILT, depth);
        expect(css).not.toBeNull();
        expect(css).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});

describe("depth from z", () => {
  const G: CameraGeometry = { width: 1920, height: 1080, world: 2, perspective: 3840 };

  it("puts the screen plane at full camera motion", () => {
    expect(depthForZ(0, G)).toBe(1);
  });

  it("halves motion at one lens distance behind the screen", () => {
    expect(depthForZ(3840, G)).toBeCloseTo(0.5, 9);
    expect(depthForZ(3840 * 3, G)).toBeCloseTo(0.25, 9);
  });

  it("overtakes the camera in front of the screen", () => {
    expect(depthForZ(-1920, G)).toBeCloseTo(2, 9);
  });

  it("approaches screen-lock as z grows, without ever dividing by zero", () => {
    expect(depthForZ(1e9, G)).toBeGreaterThan(0);
    expect(depthForZ(1e9, G)).toBeLessThan(1e-3);
    // Level with the viewer would blow up; the guard keeps it finite.
    expect(Number.isFinite(depthForZ(-3840, G))).toBe(true);
    expect(Number.isFinite(depthForZ(-1e9, G))).toBe(true);
  });

  it("round-trips through zForDepth", () => {
    for (const z of [0, 500, 3840, 12000, -900]) {
      expect(zForDepth(depthForZ(z, G), G)).toBeCloseTo(z, 6);
    }
  });

  it("tracks the lens: a longer lens flattens the parallax", () => {
    const long: CameraGeometry = { ...G, perspective: 20000 };
    expect(depthForZ(3840, long)).toBeGreaterThan(depthForZ(3840, G));
  });
});
