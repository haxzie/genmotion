import { DownloadButton } from "@/components/marketing/download-button";
import type { AnswerTool } from "@/lib/marketing/content";

/*
 * The sticky card beside an article. It started on /answers and now also sits
 * beside every blog post, so it lives here rather than in either of them: one
 * set of words, one image, and a change to the offer is made once.
 */

/**
 * What the sticky card says, by what the reader is making. It sells the outcome
 * (an idea turned into a finished video) and lists what they get, and says
 * nothing about any other tool: the reader is a person making a video, not
 * someone shopping for a replacement. Comparisons belong in the closing section,
 * where they can be specific and honest.
 *
 * Every line is a claim the site already makes elsewhere: the free trial and its
 * unbranded exports (pricing page), the frame-accurate timeline, the local export.
 */
const CARD_COPY = {
  hyperframes: {
    title: "Turn an idea into a finished HyperFrames video",
    points: [
      "Describe it and the agent writes the scenes",
      "Preview every frame, then add narration and music",
      "Export the MP4 on your own machine",
    ],
  },
  remotion: {
    title: "Turn an idea into a finished motion video",
    points: [
      "Describe it and the agent animates every scene",
      "Refine it on a frame-accurate timeline, with narration and music",
      "Export the MP4 on your own machine",
    ],
  },
  general: {
    title: "Turn an idea into a finished motion video",
    points: [
      "Describe it and the agent animates every scene",
      "Preview every frame, so what you see is what exports",
      "Export the MP4 on your own machine",
    ],
  },
} as const;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-[0.2em] size-4 shrink-0 text-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * The sticky card beside an answer: the studio image over the offer for the kind
 * of video the reader is making.
 */
export function SidebarCard({ tool }: { tool: AnswerTool }) {
  const copy = CARD_COPY[tool];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, same as the rest of the marketing site */}
      <img src="/answers/studio.webp" width={1800} height={953} alt="" className="w-full" />
      <div className="p-5">
        <p className="font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-text-primary">
          {copy.title}
        </p>
        <ul className="mt-4 flex flex-col gap-2.5 text-[0.9rem] leading-snug text-text-secondary">
          {copy.points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <CheckIcon />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <DownloadButton label="Download for Mac" className="mt-5 w-full" />
        <p className="mt-3 text-center text-[0.8rem] text-text-tertiary">Free to start. No watermark.</p>
      </div>
    </div>
  );
}
