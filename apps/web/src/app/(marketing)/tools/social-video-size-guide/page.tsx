"use client";

import { useState } from "react";
import { ToolShell } from "@/components/marketing/tool-shell";
import { FaqSection } from "@/components/marketing/faq";
import { getTool } from "@/lib/marketing/tools";
import { cx } from "@/components/ui";

const FAQS = getTool("social-video-size-guide")!.faqs;

type Spec = {
  platform: string;
  format: string;
  ratio: string;
  size: string;
};

const SPECS: Spec[] = [
  { platform: "YouTube", format: "Standard video", ratio: "16:9", size: "1920 × 1080" },
  { platform: "YouTube", format: "Shorts", ratio: "9:16", size: "1080 × 1920" },
  { platform: "Instagram", format: "Reels / Stories", ratio: "9:16", size: "1080 × 1920" },
  { platform: "Instagram", format: "Feed (portrait)", ratio: "4:5", size: "1080 × 1350" },
  { platform: "Instagram", format: "Feed (square)", ratio: "1:1", size: "1080 × 1080" },
  { platform: "TikTok", format: "Full screen", ratio: "9:16", size: "1080 × 1920" },
  { platform: "X (Twitter)", format: "Landscape", ratio: "16:9", size: "1920 × 1080" },
  { platform: "LinkedIn", format: "Feed (landscape)", ratio: "16:9", size: "1920 × 1080" },
  { platform: "LinkedIn", format: "Feed (square)", ratio: "1:1", size: "1080 × 1080" },
  { platform: "Facebook", format: "Feed video", ratio: "4:5", size: "1080 × 1350" },
  { platform: "Facebook", format: "Stories / Reels", ratio: "9:16", size: "1080 × 1920" },
  { platform: "Pinterest", format: "Standard pin", ratio: "2:3", size: "1000 × 1500" },
];

const PLATFORMS = ["All", ...Array.from(new Set(SPECS.map((s) => s.platform)))];

export default function SocialVideoSizeGuide() {
  const [filter, setFilter] = useState("All");
  const rows = filter === "All" ? SPECS : SPECS.filter((s) => s.platform === filter);

  return (
    <>
    <ToolShell
      title="Social Video Size Guide"
      description="Recommended video dimensions and aspect ratios for every major platform."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => setFilter(platform)}
              className={cx(
                "h-9 rounded-md border px-3.5 text-[0.95rem] transition-colors duration-150",
                filter === platform
                  ? "border-border-strong bg-surface-raised text-text-primary"
                  : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
              )}
            >
              {platform}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-[0.95rem]">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-[0.857rem] text-text-tertiary">
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Ratio</th>
                <th className="px-4 py-3 text-right font-medium">Size (px)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((spec, i) => (
                <tr
                  key={`${spec.platform}-${spec.format}`}
                  className={cx(
                    "border-border",
                    i !== rows.length - 1 && "border-b",
                  )}
                >
                  <td className="px-4 py-3 text-text-primary">{spec.platform}</td>
                  <td className="px-4 py-3 text-text-secondary">{spec.format}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary tabular-nums">
                    {spec.ratio}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-primary tabular-nums">
                    {spec.size}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[0.857rem] text-text-tertiary">
          Platforms display at these resolutions; uploading at the recommended size
          avoids cropping and re-compression. Last reviewed 2026.
        </p>
      </div>
    </ToolShell>
    <FaqSection items={FAQS} />
    </>
  );
}
