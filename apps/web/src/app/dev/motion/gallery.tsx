"use client";

import { useEffect, useRef, useState } from "react";
import {
  CountText,
  FrameContext,
  HighlightText,
  ScrambleText,
  TEXT_EFFECTS,
  TextAnimation,
  TextSwap,
  Typewriter,
  VideoConfigContext,
  type EffectGroup,
  type HoldBehaviour,
  type SplitMode,
  type StaggerOrder,
  type TextEffect,
  type TextEffectName,
} from "@genmotion/motion";
import { Button, cx } from "@/components/ui";

const FPS = 30;
/** Long enough to see enter → hold → exit before it loops. */
const LOOP = 120;

const GROUP_TITLES: Record<EffectGroup, string> = {
  blur: "Blur — the house look",
  mask: "Masks & wipes",
  fade: "Fades & slides",
  scale: "Scale",
  editorial: "Editorial",
  dimensional: "3D",
  rotate: "Rotate & skew",
  kinetic: "Kinetic",
};

const GROUP_ORDER: EffectGroup[] = [
  "blur",
  "mask",
  "fade",
  "scale",
  "editorial",
  "dimensional",
  "rotate",
  "kinetic",
];

const SAMPLES = [
  { label: "Headline", value: "Ship it faster" },
  { label: "Two lines", value: "Ship it faster.\nShip it safer." },
  { label: "One word", value: "Horizon" },
  { label: "Numerals", value: "0123456789" },
  { label: "Long", value: "Everything you need to ship, in one place" },
];

const ORDERS: StaggerOrder[] = ["forward", "reverse", "center", "edges", "random"];
const HOLDS: HoldBehaviour[] = ["none", "float", "breathe", "wave", "shimmer", "glow"];
const SPLITS = ["auto", "word", "char", "line", "none"] as const;

/**
 * One rAF loop for the whole page. Mounting ~46 players would be absurd; every
 * tile is just a React subtree reading the same FrameContext, so a single
 * clock drives all of them.
 */
function useLoopClock(playing: boolean) {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  frameRef.current = frame;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const startedAt = performance.now();
    const startFrame = frameRef.current;

    const tick = (now: number) => {
      const elapsed = ((now - startedAt) / 1000) * FPS;
      setFrame(Math.floor(startFrame + elapsed) % LOOP);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  return [frame, setFrame] as const;
}

interface Controls {
  text: string;
  by: (typeof SPLITS)[number];
  order: StaggerOrder;
  hold: HoldBehaviour;
  exit: boolean;
}

function EffectTile({
  name,
  effect,
  controls,
}: {
  name: TextEffectName;
  effect: TextEffect;
  controls: Controls;
}) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex h-32 items-center justify-center overflow-hidden px-4">
        <div className="text-center text-[26px] leading-tight font-medium text-text-primary">
          <TextAnimation
            text={controls.text}
            preset={name}
            by={controls.by === "auto" ? undefined : (controls.by as SplitMode)}
            order={controls.order}
            hold={controls.hold}
            exit={controls.exit ? "auto" : undefined}
          />
        </div>
      </div>
      <figcaption className="border-t border-border px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <code className="font-mono text-sm text-accent">{name}</code>
          <span className="font-mono text-[11px] text-text-secondary">
            {effect.duration ?? 18}f · {effect.stagger ?? 4}
            {effect.by && effect.by !== "word" ? ` · ${effect.by}s` : ""}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">{effect.blurb}</p>
      </figcaption>
    </figure>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectClass =
  "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-text-primary";

/** Live demos of the components that aren't expressible as a style function. */
export function TextComponentsDemo() {
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useLoopClock(playing);

  const demos: { name: string; code: string; node: React.ReactNode }[] = [
    {
      name: "Typewriter",
      code: '<Typewriter text="Initializing systems" speed={3} caretAfterTyping />',
      node: (
        <span style={{ fontFamily: "ui-monospace, monospace" }}>
          <Typewriter text="Initializing systems" speed={3} caretAfterTyping />
        </span>
      ),
    },
    {
      name: "TextSwap",
      code: '<TextSwap words={["faster", "safer", "cheaper"]} every={40} loop />',
      node: (
        <span>
          Ship it{" "}
          <TextSwap words={["faster", "safer", "cheaper"]} every={40} loop preset="blurUp" />
        </span>
      ),
    },
    {
      name: "CountText",
      code: '<CountText to={1284000} compact prefix="$" suffix=" ARR" duration={50} />',
      node: <CountText to={1284000} compact prefix="$" suffix=" ARR" duration={50} />,
    },
    {
      name: "HighlightText",
      code: '<HighlightText variant="underline" color="#7c8aff">one place</HighlightText>',
      node: (
        <span>
          All in{" "}
          <HighlightText variant="underline" color="#7c8aff" startFrom={20} duration={16}>
            one place
          </HighlightText>
        </span>
      ),
    },
    {
      name: "ScrambleText",
      code: '<ScrambleText text="DECRYPTING" duration={50} />',
      node: (
        <span style={{ fontFamily: "ui-monospace, monospace" }}>
          <ScrambleText text="DECRYPTING" duration={50} />
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </Button>
        <input
          type="range"
          min={0}
          max={LOOP - 1}
          value={frame}
          onChange={(e) => {
            setPlaying(false);
            setFrame(Number(e.target.value));
          }}
          className="flex-1 accent-accent"
        />
        <span className="w-24 shrink-0 font-mono text-xs text-text-secondary">
          frame {String(frame).padStart(3, "0")} / {LOOP}
        </span>
      </div>

      <VideoConfigContext.Provider
        value={{ fps: FPS, width: 1920, height: 1080, durationInFrames: LOOP }}
      >
        <FrameContext.Provider value={frame}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {demos.map((demo) => (
              <figure
                key={demo.name}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div className="flex h-24 items-center justify-center px-4 text-center text-[26px] font-medium text-text-primary">
                  {demo.node}
                </div>
                <figcaption className="border-t border-border px-3 py-2">
                  <code className="font-mono text-xs break-all text-text-secondary">
                    {demo.code}
                  </code>
                </figcaption>
              </figure>
            ))}
          </div>
        </FrameContext.Provider>
      </VideoConfigContext.Provider>
    </div>
  );
}

export function TextGallery() {
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useLoopClock(playing);
  const [controls, setControls] = useState<Controls>({
    text: SAMPLES[0]!.value,
    by: "auto",
    order: "forward",
    hold: "none",
    exit: true,
  });

  const set = <K extends keyof Controls>(key: K, value: Controls[K]) =>
    setControls((c) => ({ ...c, [key]: value }));

  const entries = Object.entries(TEXT_EFFECTS) as [TextEffectName, TextEffect][];

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-surface/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <Button size="sm" variant="primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </Button>

          <Field label="Copy">
            <select
              className={selectClass}
              value={controls.text}
              onChange={(e) => set("text", e.target.value)}
            >
              {SAMPLES.map((s) => (
                <option key={s.label} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Split">
            <select
              className={selectClass}
              value={controls.by}
              onChange={(e) => set("by", e.target.value as Controls["by"])}
            >
              {SPLITS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Order">
            <select
              className={selectClass}
              value={controls.order}
              onChange={(e) => set("order", e.target.value as StaggerOrder)}
            >
              {ORDERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Hold">
            <select
              className={selectClass}
              value={controls.hold}
              onChange={(e) => set("hold", e.target.value as HoldBehaviour)}
            >
              {HOLDS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 pb-1.5 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={controls.exit}
              onChange={(e) => set("exit", e.target.checked)}
              className="accent-accent"
            />
            exit=&quot;auto&quot;
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={LOOP - 1}
            value={frame}
            onChange={(e) => {
              setPlaying(false);
              setFrame(Number(e.target.value));
            }}
            className="flex-1 accent-accent"
          />
          <span className="w-24 shrink-0 font-mono text-xs text-text-secondary">
            frame {String(frame).padStart(3, "0")} / {LOOP}
          </span>
        </div>
      </div>

      <VideoConfigContext.Provider
        value={{ fps: FPS, width: 1920, height: 1080, durationInFrames: LOOP }}
      >
        <FrameContext.Provider value={frame}>
          {GROUP_ORDER.map((group) => {
            const inGroup = entries.filter(([, e]) => e.group === group);
            if (inGroup.length === 0) return null;
            return (
              <section key={group} className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-text-primary">
                  {GROUP_TITLES[group]}
                  <span className="ml-2 font-mono text-xs text-text-secondary">
                    {inGroup.length}
                  </span>
                </h3>
                <div
                  className={cx(
                    "grid gap-3",
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )}
                >
                  {inGroup.map(([name, effect]) => (
                    <EffectTile
                      key={name}
                      name={name}
                      effect={effect}
                      controls={controls}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </FrameContext.Provider>
      </VideoConfigContext.Provider>
    </div>
  );
}
