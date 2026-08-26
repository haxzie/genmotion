import { describe, expect, it } from "vitest";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameContext, VideoConfigContext } from "../context";
import { Sequence } from "../components/sequence";
import { Camera } from "../components/camera";
import { TextAnimation } from "../components/text-animation";
import {
  getTextEffect,
  TEXT_EFFECTS,
  TEXT_EFFECT_ALIASES,
  TEXT_EFFECT_NAMES,
  type TextEffect,
  type TextEffectName,
} from "../text/effects";
import { resolveTextStyle } from "../text/transform";
import { splitText, toLines } from "../text/split";
import { orderRanks } from "../text/order";
import { EXIT_TAIL_PAD } from "../text/timing";

const ALL_NAMES = [
  ...TEXT_EFFECT_NAMES,
  ...(Object.keys(TEXT_EFFECT_ALIASES) as TextEffectName[]),
];

const entries = Object.entries(TEXT_EFFECTS) as [string, TextEffect][];

/** Numbers appearing in a CSS value, in order. */
const numbersIn = (v: unknown): number[] =>
  typeof v === "string"
    ? [...v.matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map((m) => Number(m[0]))
    : typeof v === "number"
      ? [v]
      : [];

function transformFns(style: React.CSSProperties): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof style.transform !== "string") return out;
  for (const [, fn, args] of style.transform.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)) {
    out[fn!] = Number(numbersIn(args)[0]);
  }
  return out;
}

describe("every effect", () => {
  for (const [name, effect] of entries) {
    it(`${name} settles to identity`, () => {
      const style = resolveTextStyle(
        effect.from,
        effect.to ?? effect.from,
        1,
        0,
        effect.perspective,
        { step: effect.step },
      );

      expect(Number(style.opacity)).toBeCloseTo(1, 6);
      for (const [fn, value] of Object.entries(transformFns(style))) {
        if (fn === "perspective") continue;
        const settled = fn.startsWith("scale") ? 1 : 0;
        expect(value, `${name}: ${fn} should settle at ${settled}`).toBeCloseTo(
          settled,
          6,
        );
      }
      if (style.filter) expect(numbersIn(style.filter)[0]).toBeCloseTo(0, 6);
      if (style.letterSpacing !== undefined) {
        expect(numbersIn(style.letterSpacing)[0]).toBeCloseTo(0, 6);
      }
      if (typeof style.clipPath === "string") {
        // A settled clip is either a fully-open inset or a full-radius circle.
        const nums = numbersIn(style.clipPath);
        const expected = style.clipPath.startsWith("circle") ? 75 : 0;
        expect(nums[0]).toBeCloseTo(expected, 6);
      }
    });

    it(`${name} is displaced at the start of its entrance`, () => {
      const settled = resolveTextStyle(effect.from, effect.to ?? effect.from, 1, 0, effect.perspective, { step: effect.step });
      const start = resolveTextStyle(effect.from, effect.to ?? effect.from, 0, 0, effect.perspective, { step: effect.step });
      expect(JSON.stringify(start)).not.toBe(JSON.stringify(settled));
    });

    it(`${name} is displaced at the end of its exit`, () => {
      const settled = resolveTextStyle(effect.from, effect.to ?? effect.from, 1, 0, effect.perspective, { step: effect.step });
      const gone = resolveTextStyle(effect.from, effect.to ?? effect.from, 1, 1, effect.perspective, { step: effect.step });
      expect(JSON.stringify(gone)).not.toBe(JSON.stringify(settled));
    });

    it(`${name} is fully hidden once its exit completes`, () => {
      // Not all effects fade — the clip and mask families hold opacity at 1 and
      // hide by closing a clip or travelling out of an overflow box. Asserting
      // on opacity alone would let one of those ship a visible sliver.
      const style = resolveTextStyle(
        effect.from,
        effect.to ?? effect.from,
        1,
        1,
        effect.perspective,
        { step: effect.step },
      );

      const opacity = Number(style.opacity);
      if (opacity === 0) return;

      if (typeof style.clipPath === "string") {
        const nums = numbersIn(style.clipPath);
        if (style.clipPath.startsWith("circle")) {
          expect(nums[0], `${name}: iris should close`).toBeCloseTo(0, 6);
        } else {
          // inset(top right bottom left) is closed when opposing edges meet —
          // which a centre wipe does as 50% + 50%, not as a single 100%.
          const [top = 0, right = 0, bottom = 0, left = 0] = nums;
          expect(
            right + left >= 100 - 1e-6 || top + bottom >= 100 - 1e-6,
            `${name}: inset should close (${style.clipPath})`,
          ).toBe(true);
        }
        return;
      }

      expect(
        effect.mask,
        `${name} neither fades, clips, nor masks — it would still be visible after its exit`,
      ).toBe(true);
      // A masked unit has to clear its own box, so travel at least its height.
      const moved = Math.abs(transformFns(style).translateY ?? 0);
      expect(moved, `${name}: should travel out of its mask`).toBeGreaterThanOrEqual(100);
    });

    it(`${name} never emits NaN`, () => {
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        for (const e of [0, 0.5, 1]) {
          const style = resolveTextStyle(
            effect.from,
            effect.to ?? effect.from,
            p,
            e,
            effect.perspective,
            { step: effect.step },
          );
          for (const value of Object.values(style)) {
            expect(String(value), `${name} at enter=${p} exit=${e}`).not.toMatch(/NaN/);
            for (const n of numbersIn(value)) expect(Number.isFinite(n)).toBe(true);
          }
        }
      }
    });
  }
});

const CONFIG = { fps: 30, width: 1920, height: 1080, durationInFrames: 90 };

const render = (node: React.ReactNode, frame: number, durationInFrames = 90) =>
  renderToStaticMarkup(
    <VideoConfigContext.Provider value={{ ...CONFIG, durationInFrames }}>
      <FrameContext.Provider value={frame}>{node}</FrameContext.Provider>
    </VideoConfigContext.Provider>,
  );

const firstOpacity = (markup: string) => {
  const m = /opacity:([\d.]+)/.exec(markup);
  return m ? Number(m[1]) : null;
};

describe("rendering the whole catalog", () => {
  for (const name of ALL_NAMES) {
    it(`${name} renders at every stage without throwing`, () => {
      for (const frame of [0, 5, 20, 45, 80, 89]) {
        const markup = render(
          <TextAnimation text="Ship it faster" preset={name} exit="auto" />,
          frame,
        );
        // Char-splitting effects interleave markup between glyphs, so compare
        // the text content rather than looking for a contiguous substring.
        expect(markup.replace(/<[^>]*>/g, "")).toBe("Ship it faster");
        expect(markup).not.toContain("NaN");
        expect(markup).not.toContain("undefined");
      }
    });
  }
});

describe("exit timing", () => {
  it("auto-exit clears the window with the house tail pad", () => {
    // One word, an 18-frame entrance → a 12-frame exit starting at 90-6-12 = 72.
    const at = (f: number) =>
      firstOpacity(render(<TextAnimation text="Ship" exit="auto" />, f));

    expect(at(71)).toBe(1);
    expect(at(90 - EXIT_TAIL_PAD)).toBe(0);
    // ...and it stays gone for the remainder of the window.
    expect(at(89)).toBe(0);
  });

  it("times against the enclosing Sequence, not the whole scene", () => {
    const scene = (frame: number) =>
      firstOpacity(
        render(
          <Sequence from={0} durationInFrames={60}>
            <TextAnimation text="Ship" exit="auto" />
          </Sequence>,
          frame,
          200,
        ),
      );

    // Gone by the end of the 60-frame sequence, not the 200-frame scene.
    expect(scene(60 - EXIT_TAIL_PAD)).toBe(0);
    expect(scene(41)).toBe(1);
  });

  it("honours an explicit exit frame", () => {
    const at = (f: number) =>
      firstOpacity(render(<TextAnimation text="Ship" exit={{ at: 30, duration: 10 }} />, f));
    expect(at(29)).toBe(1);
    expect(at(40)).toBe(0);
  });

  it("does not exit when exit is false or omitted", () => {
    expect(firstOpacity(render(<TextAnimation text="Ship" />, 89))).toBe(1);
    expect(firstOpacity(render(<TextAnimation text="Ship" exit={false} />, 89))).toBe(1);
  });

  it("borrows another preset's shape when named", () => {
    const withPreset = render(
      <TextAnimation text="Ship" preset="fadeIn" exit="slideIn" />,
      86,
    );
    // fadeIn alone has no translate; the borrowed exit adds one.
    expect(withPreset).toContain("translateX");
  });
});

describe("splitting", () => {
  it("keeps a ZWJ emoji sequence as one character", () => {
    const family = "👨‍👩‍👧";
    expect([...family].length).toBeGreaterThan(1);
    expect(splitText(family, "char")).toHaveLength(1);
  });

  it("takes lines from newlines and from arrays alike", () => {
    expect(toLines("one\ntwo")).toEqual(["one", "two"]);
    expect(toLines(["one", "two"])).toEqual(["one", "two"]);
    expect(splitText("one\ntwo", "line")).toHaveLength(2);
  });

  it("preserves whitespace as non-animating units", () => {
    const units = splitText("a b", "word");
    expect(units.map((u) => u.text)).toEqual(["a", " ", "b"]);
    expect(units.map((u) => u.animate)).toEqual([true, false, true]);
  });

  it("renders multi-line text as stacked blocks", () => {
    const markup = render(<TextAnimation text={["one", "two"]} by="line" />, 40);
    expect(markup.match(/display:block/g)).toHaveLength(2);
  });
});

describe("stagger order", () => {
  it("reverses", () => {
    expect(orderRanks("reverse", 4, "s")).toEqual([3, 2, 1, 0]);
  });

  it("runs centre-out and edges-in", () => {
    expect(orderRanks("center", 5, "s")).toEqual([2, 1, 0, 1, 2]);
    expect(orderRanks("edges", 5, "s")).toEqual([0, 1, 2, 1, 0]);
  });

  it("produces a stable permutation when random", () => {
    const a = orderRanks("random", 8, "seed");
    const b = orderRanks("random", 8, "seed");
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(orderRanks("random", 8, "other")).not.toEqual(a);
  });
});

describe("determinism", () => {
  const scene = (frame: number) =>
    render(
      <>
        <TextAnimation text="Ship it faster" preset="blurUp" exit="auto" hold="float" />
        <TextAnimation text="now" preset="riseMask" order="random" exit="auto" />
        <TextAnimation text="really" preset="jitterIn" hold="wave" exit="auto" />
      </>,
      frame,
    );

  const forwards = new Map<number, string>();
  for (let f = 0; f < 90; f++) forwards.set(f, scene(f));

  it("renders identically backwards", () => {
    for (let f = 89; f >= 0; f--) expect(scene(f)).toBe(forwards.get(f));
  });

  it("renders identically under random access", () => {
    for (const f of [73, 4, 88, 31, 12, 60, 0, 45]) {
      expect(scene(f)).toBe(forwards.get(f));
    }
  });

  it("actually animates across the window", () => {
    expect(new Set(forwards.values()).size).toBeGreaterThan(45);
  });
});

describe("camera interaction", () => {
  it("drops will-change on text inside a camera", () => {
    // The hint pins a layer's raster scale, which a camera zoom would then
    // stretch. It's dropped for the whole camera subtree rather than only on
    // zoomed frames, so the promotion doesn't flip mid-timeline.
    const inCamera = (zoom: number) =>
      render(
        <Camera world={2} keyframes={[{ at: 0, x: 0.5, y: 0.5, zoom }]}>
          <TextAnimation text="Ship" preset="blurUp" />
        </Camera>,
        5,
      );

    // The camera sets will-change:auto on its own wrapper, so match the value
    // the text units use rather than the bare property.
    expect(inCamera(1)).not.toContain("will-change:transform");
    expect(inCamera(2.5)).not.toContain("will-change:transform");
    expect(render(<TextAnimation text="Ship" preset="blurUp" />, 5)).toContain(
      "will-change:transform",
    );
  });
});

describe("props", () => {
  it("passes an id through for camera focus and the inspector", () => {
    expect(render(<TextAnimation text="Ship" id="headline" />, 10)).toContain(
      'id="headline"',
    );
  });

  it("renders as the requested tag", () => {
    expect(render(<TextAnimation text="Ship" as="h1" />, 10)).toContain("<h1");
  });

  it("resolves aliases to the same look as their canonical effect", () => {
    expect(getTextEffect("fade")).toBe(getTextEffect("fadeIn"));
    expect(getTextEffect("wipeRight")).toBe(getTextEffect("clipReveal"));
  });
});
