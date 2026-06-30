import type { IconKey } from "@/components/marketing/icons";
import type { Faq } from "@/lib/marketing/faq";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  icon: IconKey;
  faqs: Faq[];
};

export const TOOLS: Tool[] = [
  {
    slug: "aspect-ratio-calculator",
    name: "Aspect Ratio Calculator",
    description:
      "Lock an aspect ratio and solve for the missing width or height in pixels.",
    icon: "frame",
    faqs: [
      {
        q: "What is an aspect ratio?",
        a: "An aspect ratio is the proportional relationship between a frame's width and height — for example 16:9 (widescreen) or 9:16 (vertical). It determines the shape of your video regardless of its pixel size.",
      },
      {
        q: "How do I calculate the height from a width for a given ratio?",
        a: "Multiply the width by the ratio's height and divide by its width. For 16:9 at 1920px wide: 1920 × 9 ÷ 16 = 1080px tall. This calculator does that for you — pick a ratio, lock one dimension, and read off the other.",
      },
      {
        q: "Which aspect ratio should I use?",
        a: "Use 16:9 for YouTube and desktop, 9:16 for Reels, Shorts, Stories, and TikTok, 1:1 for square feed posts, and 4:5 for portrait feed posts. See our Social Video Size Guide for exact pixel sizes per platform.",
      },
      {
        q: "Is this aspect ratio calculator free?",
        a: "Yes — it's completely free, runs entirely in your browser, and requires no sign-up.",
      },
    ],
  },
  {
    slug: "timecode-frames-converter",
    name: "Timecode ↔ Frames Converter",
    description:
      "Convert between HH:MM:SS:FF timecode and a raw frame count at any frame rate.",
    icon: "timeline",
    faqs: [
      {
        q: "What is timecode?",
        a: "Timecode is a standard way to label an exact position in a video, written HH:MM:SS:FF — hours, minutes, seconds, and frames. The frames field counts up to the frame rate before the seconds roll over.",
      },
      {
        q: "How do I convert frames to timecode?",
        a: "Divide the total frame count by the frame rate to get total seconds, then break that into hours, minutes, and seconds; the remainder of frames becomes the FF field. This tool handles the math at any frame rate.",
      },
      {
        q: "Why does the frame rate matter?",
        a: "The same frame count represents a different duration at different frame rates. 900 frames is 30 seconds at 30fps but only 15 seconds at 60fps, so the converter always asks for an fps value.",
      },
      {
        q: "Does this support drop-frame timecode?",
        a: "This converter uses non-drop-frame (NDF) timecode, where every frame is counted sequentially. NDF is the right choice for web and most modern workflows.",
      },
    ],
  },
  {
    slug: "video-file-size-estimator",
    name: "Video File Size Estimator",
    description:
      "Estimate an export's file size from its bitrate and duration — and vice versa.",
    icon: "export",
    faqs: [
      {
        q: "How is video file size calculated?",
        a: "File size equals total bitrate multiplied by duration. In bytes: (video Mbps × 1,000,000 + audio kbps × 1,000) × seconds ÷ 8. This tool does the conversion and shows the result in MB or GB.",
      },
      {
        q: "What bitrate should I use?",
        a: "As a rough guide, 8 Mbps suits 1080p, 16–20 Mbps suits 1440p, and 35–45 Mbps suits 4K. Higher bitrates preserve more detail but produce larger files.",
      },
      {
        q: "Why is my actual file size different from the estimate?",
        a: "This estimate assumes a constant average bitrate. Variable-bitrate (VBR) encodes allocate more data to complex scenes and less to simple ones, so the real size varies with content.",
      },
      {
        q: "Is the estimate in MB or MiB?",
        a: "It uses decimal units (1 MB = 1,000,000 bytes), which matches how bitrates and storage are usually advertised.",
      },
    ],
  },
  {
    slug: "social-video-size-guide",
    name: "Social Video Size Guide",
    description:
      "A cheat sheet of recommended video dimensions and ratios for every major platform.",
    icon: "palette",
    faqs: [
      {
        q: "What is the best video size for Instagram Reels?",
        a: "Instagram Reels and Stories use a 9:16 vertical ratio at 1080 × 1920 pixels. The same size works for TikTok and YouTube Shorts.",
      },
      {
        q: "What size should a YouTube video be?",
        a: "Standard YouTube videos are 16:9 at 1920 × 1080 (1080p). For YouTube Shorts, switch to 9:16 vertical at 1080 × 1920.",
      },
      {
        q: "Why does uploading at the recommended size matter?",
        a: "Platforms display video at specific resolutions and ratios. Matching them avoids automatic cropping and a second round of compression, which keeps your video sharp.",
      },
      {
        q: "How often do these recommended sizes change?",
        a: "Platform specs are fairly stable but do shift occasionally. This guide was last reviewed in 2026; always double-check a platform's current help docs for edge cases.",
      },
    ],
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
