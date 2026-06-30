"use client";

import { useState } from "react";
import { ToolShell, Field } from "@/components/marketing/tool-shell";
import { Card } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { getTool } from "@/lib/marketing/tools";

const FAQS = getTool("video-file-size-estimator")!.faqs;

export default function VideoFileSizeEstimator() {
  const [videoMbps, setVideoMbps] = useState(8);
  const [audioKbps, setAudioKbps] = useState(192);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(30);

  const duration = Math.max(0, minutes * 60 + seconds);
  // Total bits = (video Mbps * 1e6 + audio kbps * 1e3) * seconds. Bytes = bits / 8.
  const totalBits = (videoMbps * 1_000_000 + audioKbps * 1_000) * duration;
  const megabytes = totalBits / 8 / 1_000_000;

  const sizeLabel =
    megabytes >= 1000
      ? `${(megabytes / 1000).toFixed(2)} GB`
      : `${megabytes.toFixed(1)} MB`;

  return (
    <>
    <ToolShell
      title="Video File Size Estimator"
      description="Estimate how large an export will be from its bitrate and duration."
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Video bitrate"
            type="number"
            min={0}
            step={0.5}
            suffix="Mbps"
            value={videoMbps}
            onChange={(e) => setVideoMbps(Math.max(0, Number(e.target.value) || 0))}
          />
          <Field
            label="Audio bitrate"
            type="number"
            min={0}
            step={32}
            suffix="kbps"
            value={audioKbps}
            onChange={(e) => setAudioKbps(Math.max(0, Number(e.target.value) || 0))}
          />
          <Field
            label="Duration — minutes"
            type="number"
            min={0}
            suffix="min"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))}
          />
          <Field
            label="Duration — seconds"
            type="number"
            min={0}
            max={59}
            suffix="sec"
            value={seconds}
            onChange={(e) => setSeconds(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Estimated file size</span>
            <span className="font-mono text-lg text-text-primary tabular-nums">
              {sizeLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-[0.9rem]">
            <span className="text-text-tertiary">Total duration</span>
            <span className="font-mono text-text-secondary tabular-nums">
              {duration}s
            </span>
          </div>
        </Card>

        <p className="text-[0.857rem] text-text-tertiary">
          This is an estimate assuming a constant average bitrate. Variable-bitrate
          (VBR) encodes will vary with content complexity.
        </p>
      </div>
    </ToolShell>
    <FaqSection items={FAQS} />
    </>
  );
}
