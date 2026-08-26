import { describe, expect, it } from "vitest";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameContext, VideoConfigContext } from "../context";
import {
  CountText,
  HighlightText,
  TextSwap,
  Typewriter,
} from "../components/text-effects";

const CONFIG = { fps: 30, width: 1920, height: 1080, durationInFrames: 300 };

const render = (node: React.ReactNode, frame: number) =>
  renderToStaticMarkup(
    <VideoConfigContext.Provider value={CONFIG}>
      <FrameContext.Provider value={frame}>{node}</FrameContext.Provider>
    </VideoConfigContext.Provider>,
  );

const textOf = (markup: string) => markup.replace(/<[^>]*>/g, "");

describe("Typewriter", () => {
  it("reveals one character at a time", () => {
    const typed = (frame: number) => {
      const markup = render(<Typewriter text="Hello" caret={false} />, frame);
      // Only the visible span counts; the remainder is hidden but present.
      const m = /<span>([^<]*)<\/span>/.exec(markup);
      return m?.[1] ?? "";
    };
    expect(typed(0)).toBe("");
    expect(typed(4)).toBe("He");
    expect(typed(10)).toBe("Hello");
    expect(typed(60)).toBe("Hello");
  });

  it("reserves the full width from the first frame", () => {
    // The untyped remainder stays in the DOM so the line never reflows.
    expect(textOf(render(<Typewriter text="Hello" caret={false} />, 0))).toBe("Hello");
    expect(textOf(render(<Typewriter text="Hello" caret={false} />, 60))).toBe("Hello");
  });

  it("blinks the caret deterministically and keeps it laid out", () => {
    // Long enough that all the sampled frames are still mid-typing.
    const long = "Initializing systems";
    const visible = (frame: number) =>
      /visibility:visible/.test(render(<Typewriter text={long} />, frame));
    expect(visible(0)).toBe(true);
    expect(visible(8)).toBe(false);
    expect(visible(16)).toBe(true);
    // Hidden, never unmounted — otherwise the text after it would shift.
    expect(render(<Typewriter text={long} />, 8)).toContain("visibility:hidden");
  });

  it("drops the caret once typing finishes unless asked to keep it", () => {
    expect(render(<Typewriter text="Hi" />, 100)).not.toContain("visibility:visible");
    expect(
      render(<Typewriter text="Hi" caretAfterTyping />, 96),
    ).toContain("visibility:visible");
  });
});

describe("TextSwap", () => {
  it("advances through the words on schedule", () => {
    const word = (frame: number) =>
      textOf(render(<TextSwap words={["one", "two", "three"]} every={30} />, frame));
    expect(word(5)).toBe("one");
    expect(word(35)).toBe("two");
    expect(word(65)).toBe("three");
  });

  it("holds the last word instead of re-entering it", () => {
    // The bug this guards: an unpinned slot keeps sliding `from` forward, so
    // the final word sits at local frame 0 and animates in on every frame.
    const late = render(<TextSwap words={["one", "two"]} every={30} />, 200);
    const later = render(<TextSwap words={["one", "two"]} every={30} />, 260);
    expect(textOf(late)).toBe("two");
    expect(late).toBe(later);
  });

  it("cycles when looping", () => {
    const word = (frame: number) =>
      textOf(render(<TextSwap words={["one", "two"]} every={30} loop />, frame));
    expect(word(5)).toBe("one");
    expect(word(65)).toBe("one");
    expect(word(95)).toBe("two");
  });

  it("renders nothing before it starts", () => {
    expect(render(<TextSwap words={["one"]} startFrom={20} />, 5)).toBe("");
  });
});

describe("CountText", () => {
  it("counts from its start value to its target", () => {
    const at = (frame: number) =>
      textOf(render(<CountText to={100} duration={30} />, frame));
    expect(at(0)).toBe("0");
    expect(at(30)).toBe("100");
    expect(at(120)).toBe("100");
  });

  it("groups, fixes decimals, and wraps in affixes", () => {
    expect(textOf(render(<CountText to={1234567} duration={10} />, 10))).toBe(
      "1,234,567",
    );
    expect(
      textOf(render(<CountText to={99.5} decimals={2} prefix="$" suffix=" MRR" duration={10} />, 10)),
    ).toBe("$99.50 MRR");
    expect(textOf(render(<CountText to={2400} compact duration={10} />, 10))).toBe("2.4K");
  });

  it("pins the locale so preview and export agree", () => {
    // An unpinned Intl default would follow the host, and the render sandbox is
    // not guaranteed to share the editor's locale.
    expect(textOf(render(<CountText to={1000} duration={1} />, 5))).toBe("1,000");
    expect(textOf(render(<CountText to={1000} locale={false} duration={1} />, 5))).toBe(
      "1000",
    );
  });

  it("uses tabular figures so digits don't shuffle width", () => {
    expect(render(<CountText to={10} />, 5)).toContain("font-variant-numeric:tabular-nums");
  });
});

describe("HighlightText", () => {
  it("draws the bar with scaleX over its duration", () => {
    const scale = (frame: number) => {
      const m = /scaleX\(([\d.]+)\)/.exec(
        render(<HighlightText duration={10}>hi</HighlightText>, frame),
      );
      return Number(m?.[1]);
    };
    expect(scale(0)).toBe(0);
    expect(scale(10)).toBe(1);
    expect(scale(5)).toBeGreaterThan(0);
    expect(scale(5)).toBeLessThan(1);
  });

  it("puts a strike over the text and a highlight behind it", () => {
    expect(render(<HighlightText variant="strike">hi</HighlightText>, 20)).toContain(
      "z-index:1",
    );
    expect(render(<HighlightText>hi</HighlightText>, 20)).toContain("z-index:0");
  });

  it("keeps its children readable", () => {
    expect(textOf(render(<HighlightText>hello</HighlightText>, 20))).toBe("hello");
  });
});

describe("determinism", () => {
  const scene = (frame: number) =>
    render(
      <>
        <Typewriter text="Initializing" />
        <TextSwap words={["fast", "safe", "cheap"]} every={40} loop />
        <CountText to={98.6} decimals={1} />
        <HighlightText variant="underline">done</HighlightText>
      </>,
      frame,
    );

  const forwards = new Map<number, string>();
  for (let f = 0; f < 150; f++) forwards.set(f, scene(f));

  it("renders identically under out-of-order access", () => {
    for (const f of [149, 3, 88, 41, 120, 0, 66]) {
      expect(scene(f)).toBe(forwards.get(f));
    }
  });

  it("actually animates", () => {
    expect(new Set(forwards.values()).size).toBeGreaterThan(60);
  });
});
