import { describe, expect, it } from "vitest";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameContext, VideoConfigContext } from "../context";
import { ScrambleText, TextAnimation } from "../components/text-animation";
import {
  getTextEffect,
  TEXT_EFFECTS,
  type TextEffect,
  type TextEffectName,
} from "../text/effects";
import { resolveTextStyle } from "../text/transform";

/**
 * Back-compat lock for the thirteen original presets.
 *
 * Scenes live in Postgres as TSX referencing these names, so their look has to
 * survive the move onto the declarative effect engine. The oracle below is the
 * original `unitStyle` switch, verbatim; the engine is required to reproduce it
 * numerically. Comparing rendered strings would fail on formatting alone, and
 * comparing rounded strings double-rounds — so this parses both sides back into
 * numbers and compares with a tolerance.
 */
const LEGACY_PRESETS = [
  "fadeUp",
  "fadeIn",
  "typewriter",
  "blurIn",
  "blurUp",
  "slideIn",
  "scaleIn",
  "scaleBlur",
  "dropIn",
  "flipUp",
  "clipReveal",
  "wordReveal",
  "riseMask",
] as const satisfies readonly TextEffectName[];

/** The original implementation, kept as the oracle. Do not "improve" this. */
function legacyUnitStyle(
  preset: (typeof LEGACY_PRESETS)[number],
  p: number,
): React.CSSProperties {
  switch (preset) {
    case "fadeUp":
      return { opacity: p, transform: `translateY(${(1 - p) * 0.6}em)` };
    case "fadeIn":
      return { opacity: p };
    case "typewriter":
      return { opacity: p >= 1 ? 1 : p > 0 ? 1 : 0 };
    case "blurIn":
      return { opacity: p, filter: `blur(${(1 - p) * 12}px)` };
    case "blurUp":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 0.5}em)`,
        filter: `blur(${(1 - p) * 10}px)`,
      };
    case "slideIn":
      return { opacity: p, transform: `translateX(${(1 - p) * 1.2}em)` };
    case "scaleIn":
      return { opacity: p, transform: `scale(${0.4 + 0.6 * p})` };
    case "scaleBlur":
      return {
        opacity: p,
        transform: `scale(${1 + (1 - p) * 0.35})`,
        filter: `blur(${(1 - p) * 8}px)`,
      };
    case "dropIn":
      return { opacity: p, transform: `translateY(${(1 - p) * -0.6}em)` };
    case "flipUp":
      return {
        opacity: p,
        transform: `perspective(600px) rotateX(${(1 - p) * -90}deg)`,
        transformOrigin: "bottom center",
      };
    case "clipReveal":
      return { opacity: 1, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case "wordReveal":
      return { opacity: p, transform: `translateY(${(1 - p) * 100}%)` };
    case "riseMask":
      return { opacity: 1, transform: `translateY(${(1 - p) * 110}%)` };
  }
}

interface Channel {
  value: number;
  unit: string;
}

const LENGTH = /^(-?\d*\.?\d+(?:e[-+]?\d+)?)(.*)$/i;

function parseChannel(raw: string): Channel {
  const m = LENGTH.exec(raw.trim());
  if (!m) return { value: NaN, unit: raw.trim() };
  return { value: Number(m[1]), unit: (m[2] ?? "").trim() };
}

/** Flattens a style object into comparable numeric channels. */
function channelsOf(style: React.CSSProperties): Record<string, Channel> {
  const out: Record<string, Channel> = {};
  if (style.opacity !== undefined) {
    out.opacity = { value: Number(style.opacity), unit: "" };
  }
  if (typeof style.transform === "string") {
    for (const [, fn, args] of style.transform.matchAll(
      /([a-zA-Z0-9]+)\(([^)]*)\)/g,
    )) {
      out[fn!] = parseChannel(args!);
    }
  }
  if (typeof style.filter === "string") {
    const m = /blur\(([^)]*)\)/.exec(style.filter);
    if (m) out.blur = parseChannel(m[1]!);
  }
  if (typeof style.clipPath === "string") {
    const nums = [...style.clipPath.matchAll(/-?\d*\.?\d+/g)];
    nums.forEach((n, i) => {
      out[`clip${i}`] = { value: Number(n[0]), unit: "" };
    });
    out.clipShape = { value: NaN, unit: style.clipPath.split("(")[0]! };
  }
  if (style.letterSpacing !== undefined) {
    out.letterSpacing = parseChannel(String(style.letterSpacing));
  }
  return out;
}

const PROGRESSES = [0, 0.0001, 0.15, 0.37, 0.5, 0.63, 0.9, 0.9999, 1];

describe("legacy preset equivalence", () => {
  for (const preset of LEGACY_PRESETS) {
    it(`${preset} matches the original implementation`, () => {
      const effect = getTextEffect(preset);
      for (const p of PROGRESSES) {
        const expected = channelsOf(legacyUnitStyle(preset, p));
        const actual = channelsOf(
          resolveTextStyle(effect.from, effect.to ?? effect.from, p, 0, effect.perspective, {
            step: effect.step,
          }),
        );

        expect(Object.keys(actual).sort(), `channels at p=${p}`).toEqual(
          Object.keys(expected).sort(),
        );
        for (const [key, want] of Object.entries(expected)) {
          const got = actual[key]!;
          expect(got.unit, `${preset}.${key} unit at p=${p}`).toBe(want.unit);
          if (!Number.isNaN(want.value)) {
            expect(got.value, `${preset}.${key} at p=${p}`).toBeCloseTo(want.value, 5);
          }
        }
      }
    });

    it(`${preset} keeps its transform-origin`, () => {
      const effect = getTextEffect(preset);
      const expected = legacyUnitStyle(preset, 0.5).transformOrigin;
      const actual = resolveTextStyle(effect.from, effect.to ?? effect.from, 0.5, 0)
        .transformOrigin;
      expect(actual).toBe(expected);
    });
  }
});

/**
 * The engine emits every channel declared on EITHER side on every frame, so a
 * `to` that mentions something `from` doesn't would silently alter the
 * entrance. Cheap structural guard against that whole class of mistake.
 */
describe("effect declarations", () => {
  const entries = Object.entries(TEXT_EFFECTS) as [string, TextEffect][];
  for (const [name, effect] of entries) {
    it(`${name}'s exit declares no channel its entrance lacks`, () => {
      if (!effect.to) return;
      const from = new Set(Object.keys(effect.from));
      for (const key of Object.keys(effect.to)) {
        expect(from.has(key), `${name}.to.${key} is missing from .from`).toBe(true);
      }
    });
  }
});

const CONFIG = { fps: 30, width: 1920, height: 1080, durationInFrames: 90 };

const render = (node: React.ReactNode, frame: number) =>
  renderToStaticMarkup(
    <VideoConfigContext.Provider value={CONFIG}>
      <FrameContext.Provider value={frame}>{node}</FrameContext.Provider>
    </VideoConfigContext.Provider>,
  );

describe("legacy TextAnimation rendering", () => {
  it("splits by word and preserves the spaces between them", () => {
    const markup = render(<TextAnimation text="Ship it faster" />, 40);
    expect(markup.match(/>Ship</g)).toHaveLength(1);
    expect(markup.match(/> </g)).toHaveLength(2);
    expect(markup).toContain("faster");
  });

  it("defaults to an 18-frame entrance staggered 4 apart", () => {
    // Word 3 starts at frame 8 and is still mid-flight at 24, settled by 26.
    expect(render(<TextAnimation text="a b c" />, 25)).not.toBe(
      render(<TextAnimation text="a b c" />, 26),
    );
    expect(render(<TextAnimation text="a b c" />, 26)).toBe(
      render(<TextAnimation text="a b c" />, 40),
    );
  });

  it("uses a 2-frame stagger when splitting by character", () => {
    expect(render(<TextAnimation text="abc" by="char" />, 21)).not.toBe(
      render(<TextAnimation text="abc" by="char" />, 22),
    );
    expect(render(<TextAnimation text="abc" by="char" />, 22)).toBe(
      render(<TextAnimation text="abc" by="char" />, 40),
    );
  });

  it("wraps masked presets in an overflow box", () => {
    expect(render(<TextAnimation text="Ship" preset="riseMask" />, 5)).toContain(
      "overflow:hidden",
    );
    expect(render(<TextAnimation text="Ship" preset="fadeUp" />, 5)).not.toContain(
      "overflow:hidden",
    );
  });

  it("does not animate out unless an exit is asked for", () => {
    expect(render(<TextAnimation text="Ship it" />, 40)).toBe(
      render(<TextAnimation text="Ship it" />, 89),
    );
  });
});

describe("legacy ScrambleText", () => {
  it("decodes left to right", () => {
    const text = (frame: number) =>
      render(<ScrambleText text="INITIALIZING" />, frame).replace(/<[^>]*>/g, "");
    expect(text(0)).not.toBe("INITIALIZING");
    expect(text(36)).toBe("INITIALIZING");
    // The front has passed the first characters but not the last.
    const mid = text(18);
    expect(mid.startsWith("INITIA")).toBe(true);
    expect(mid).not.toBe("INITIALIZING");
  });

  it("is deterministic under random frame access", () => {
    const forwards = new Map<number, string>();
    for (let f = 0; f < 40; f++) forwards.set(f, render(<ScrambleText text="BOOT" />, f));
    for (const f of [31, 2, 19, 7, 38, 0]) {
      expect(render(<ScrambleText text="BOOT" />, f)).toBe(forwards.get(f));
    }
  });
});
