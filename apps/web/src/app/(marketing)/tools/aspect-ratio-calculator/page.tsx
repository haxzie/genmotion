"use client";

import { useState } from "react";
import { ToolShell, Field } from "@/components/marketing/tool-shell";
import { Card } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { getTool } from "@/lib/marketing/tools";
import { cx } from "@/components/ui";

const FAQS = getTool("aspect-ratio-calculator")!.faqs;

const PRESETS = [
  { label: "16:9", w: 16, h: 9 },
  { label: "9:16", w: 9, h: 16 },
  { label: "1:1", w: 1, h: 1 },
  { label: "4:5", w: 4, h: 5 },
  { label: "4:3", w: 4, h: 3 },
  { label: "21:9", w: 21, h: 9 },
];

export default function AspectRatioCalculator() {
  const [ratio, setRatio] = useState(PRESETS[0]!);
  const [lock, setLock] = useState<"width" | "height">("width");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);

  // Derive the dependent dimension from the locked one and the chosen ratio.
  const derivedHeight = Math.round((width * ratio.h) / ratio.w);
  const derivedWidth = Math.round((height * ratio.w) / ratio.h);

  const outWidth = lock === "width" ? width : derivedWidth;
  const outHeight = lock === "width" ? derivedHeight : height;

  return (
    <>
    <ToolShell
      title="Aspect Ratio Calculator"
      description="Pick a ratio, enter one dimension, and get the exact pixel size for the other."
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-[0.857rem] text-text-secondary">Aspect ratio</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setRatio(preset)}
                className={cx(
                  "h-9 rounded-md border px-3.5 text-[0.95rem] transition-colors duration-150",
                  ratio.label === preset.label
                    ? "border-border-strong bg-surface-raised text-text-primary"
                    : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.857rem] text-text-secondary">Width</span>
              <button
                type="button"
                onClick={() => setLock("width")}
                className={cx(
                  "text-[0.786rem]",
                  lock === "width" ? "text-accent" : "text-text-tertiary hover:text-text-secondary",
                )}
              >
                {lock === "width" ? "locked" : "lock"}
              </button>
            </div>
            <Field
              label=""
              aria-label="Width"
              type="number"
              min={1}
              suffix="px"
              value={lock === "width" ? width : outWidth}
              onChange={(e) => {
                setLock("width");
                setWidth(Math.max(1, Number(e.target.value) || 0));
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.857rem] text-text-secondary">Height</span>
              <button
                type="button"
                onClick={() => setLock("height")}
                className={cx(
                  "text-[0.786rem]",
                  lock === "height" ? "text-accent" : "text-text-tertiary hover:text-text-secondary",
                )}
              >
                {lock === "height" ? "locked" : "lock"}
              </button>
            </div>
            <Field
              label=""
              aria-label="Height"
              type="number"
              min={1}
              suffix="px"
              value={lock === "height" ? height : outHeight}
              onChange={(e) => {
                setLock("height");
                setHeight(Math.max(1, Number(e.target.value) || 0));
              }}
            />
          </div>
        </div>

        <Card className="flex items-center justify-between">
          <span className="text-text-secondary">Result</span>
          <span className="font-mono text-lg text-text-primary tabular-nums">
            {outWidth} × {outHeight}
          </span>
        </Card>
      </div>
    </ToolShell>
    <FaqSection items={FAQS} />
    </>
  );
}
