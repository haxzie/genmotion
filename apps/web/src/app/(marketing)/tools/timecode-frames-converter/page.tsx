"use client";

import { useState } from "react";
import { ToolShell, Field } from "@/components/marketing/tool-shell";
import { Card } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { getTool } from "@/lib/marketing/tools";
import { JsonLd } from "@/components/marketing/json-ld";
import { SITE_URL } from "@/lib/marketing/site";
import { cx } from "@/components/ui";

const TOOL = getTool("timecode-frames-converter")!;
const FAQS = TOOL.faqs;
const toolJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: TOOL.name,
  description: TOOL.description,
  url: `${SITE_URL}/tools/${TOOL.slug}`,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const FPS_PRESETS = [24, 25, 30, 50, 60];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function framesToParts(frames: number, fps: number) {
  const f = Math.max(0, Math.floor(frames));
  const ff = f % fps;
  const totalSeconds = Math.floor(f / fps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  return { hh, mm, ss, ff };
}

export default function TimecodeFramesConverter() {
  const [fps, setFps] = useState(30);
  const [frames, setFrames] = useState(900);

  const { hh, mm, ss, ff } = framesToParts(frames, fps);
  const seconds = frames / fps;

  function setPart(part: "hh" | "mm" | "ss" | "ff", value: number) {
    const next = { hh, mm, ss, ff, [part]: Math.max(0, value || 0) };
    const total =
      ((next.hh * 60 + next.mm) * 60 + next.ss) * fps + next.ff;
    setFrames(total);
  }

  return (
    <>
    <JsonLd data={toolJsonLd} />
    <ToolShell
      title="Timecode ↔ Frames Converter"
      description="Convert between a raw frame count and HH:MM:SS:FF timecode at any frame rate."
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-[0.857rem] text-text-secondary">Frame rate</p>
          <div className="flex flex-wrap items-center gap-2">
            {FPS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFps(preset)}
                className={cx(
                  "h-9 rounded-md border px-3.5 text-[0.95rem] transition-colors duration-150",
                  fps === preset
                    ? "border-border-strong bg-surface-raised text-text-primary"
                    : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                {preset} fps
              </button>
            ))}
            <input
              type="number"
              min={1}
              aria-label="Custom frame rate"
              value={fps}
              onChange={(e) => setFps(Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-24 rounded-md border border-border bg-surface px-3 text-text-primary tabular-nums outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        <Field
          label="Total frames"
          type="number"
          min={0}
          suffix="frames"
          value={frames}
          onChange={(e) => setFrames(Math.max(0, Number(e.target.value) || 0))}
        />

        <div>
          <p className="mb-2 text-[0.857rem] text-text-secondary">Timecode</p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["HH", hh, "hh"],
                ["MM", mm, "mm"],
                ["SS", ss, "ss"],
                ["FF", ff, "ff"],
              ] as const
            ).map(([label, value, key]) => (
              <label key={label} className="flex flex-col gap-1.5">
                <span className="text-[0.786rem] text-text-tertiary">{label}</span>
                <input
                  type="number"
                  min={0}
                  aria-label={label}
                  value={value}
                  onChange={(e) =>
                    setPart(key as "hh" | "mm" | "ss" | "ff", Number(e.target.value))
                  }
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-center text-text-primary tabular-nums outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Timecode</span>
            <span className="font-mono text-lg text-text-primary tabular-nums">
              {pad(hh)}:{pad(mm)}:{pad(ss)}:{pad(ff)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Duration</span>
            <span className="font-mono text-text-primary tabular-nums">
              {seconds.toFixed(2)} s
            </span>
          </div>
        </Card>
      </div>
    </ToolShell>
    <FaqSection items={FAQS} />
    </>
  );
}
