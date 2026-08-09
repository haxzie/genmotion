import type { IconKey } from "@/components/marketing/icons";
import type { Faq } from "@/lib/marketing/faq";

/** A card in the "how it works" or "who it's for" strip. */
export type ToolCard = {
  icon: IconKey;
  title: string;
  body: string;
};

export type Tool = {
  slug: string;
  name: string;
  description: string;
  icon: IconKey;
  /** Short label for the tool's own name in running copy — "star count video". */
  shortName: string;
  /** Exactly three, in order: the three steps to a finished result. */
  steps: [ToolCard, ToolCard, ToolCard];
  /** Exactly three: who reaches for this, and what they do with it. */
  personas: [ToolCard, ToolCard, ToolCard];
  faqs: Faq[];
};

export const TOOLS: Tool[] = [
  {
    slug: "github-star-count",
    name: "GitHub Star Count Video Generator",
    description:
      "Turn any public repository's star count into a shareable animated video.",
    icon: "github",
    shortName: "star count video",
    steps: [
      {
        icon: "github",
        title: "Paste a repository",
        body:
          "Type any public repo as owner/repo, or paste its GitHub URL. We read the live star count straight from the public GitHub API.",
      },
      {
        icon: "palette",
        title: "Pick a style and size",
        body:
          "Choose Count up or Stat card, then 16:9 for YouTube, 1:1 for the feed, or 9:16 for Reels, Shorts and Stories.",
      },
      {
        icon: "export",
        title: "Download the MP4",
        body:
          "The video renders in your browser in a few seconds and saves straight to your machine. No account, no queue, no watermark beyond a small badge.",
      },
    ],
    personas: [
      {
        icon: "github",
        title: "Open-source maintainers",
        body:
          "Mark the moment a project crosses 1k, 10k or 100k stars with something more shareable than a screenshot of the repo page.",
      },
      {
        icon: "rocket",
        title: "Founders and indie hackers",
        body:
          "Traction is proof. Drop a star-count clip into a launch thread, an investor update, or the top of a landing page.",
      },
      {
        icon: "sparkles",
        title: "Developer advocates",
        body:
          "Give a community win the production value it deserves without opening an editor or waiting on a designer.",
      },
    ],
    faqs: [
      {
        q: "How do I make a GitHub star count video?",
        a: "Enter a repository as owner/repo — for example facebook/react — pick a style and a size, then hit Download. The video is generated in your browser and saved as an MP4 in a few seconds.",
      },
      {
        q: "Is this GitHub star video generator free?",
        a: "Yes. It's free, needs no sign-up, and there's no limit on how many videos you make. Videos carry a small GenMotion badge.",
      },
      {
        q: "Where does the star count come from?",
        a: "Straight from the public GitHub API, cached for an hour. It's the same number shown on the repository page, so it's accurate to within that hour.",
      },
      {
        q: "Can I use the video on social media?",
        a: "Yes — that's what it's for. Pick 1:1 or 9:16 for feed and Stories posts, or 16:9 for YouTube and slides. The MP4 is H.264, which every platform accepts.",
      },
      {
        q: "Does it work for private repositories?",
        a: "No. Only public repositories are readable, so private ones return a not-found error.",
      },
    ],
  },
  {
    slug: "npm-downloads",
    name: "NPM Downloads Video Generator",
    description:
      "Turn a package's weekly npm download count into an animated video.",
    icon: "npm",
    shortName: "npm downloads video",
    steps: [
      {
        icon: "npm",
        title: "Enter a package name",
        body:
          "Type any package on npm — react, typescript, or a scoped name like @tanstack/react-query. We pull live figures from the registry's own API.",
      },
      {
        icon: "palette",
        title: "Pick a style and size",
        body:
          "Chart rise plots the last 52 weeks so the trend reads at a glance. Count up and Stat card put the headline number front and centre.",
      },
      {
        icon: "export",
        title: "Download the MP4",
        body:
          "Rendered in your browser, ready to post. Nothing is uploaded, so there is no wait and no sign-up.",
      },
    ],
    personas: [
      {
        icon: "npm",
        title: "Package authors",
        body:
          "Show adoption climbing week over week — far more persuasive in a release post than a static downloads badge.",
      },
      {
        icon: "wrench",
        title: "Platform and DX teams",
        body:
          "Report internal library uptake in a format people actually watch, for demos, all-hands and quarterly reviews.",
      },
      {
        icon: "sparkles",
        title: "Developer advocates",
        body:
          "Turn a milestone — a first million downloads, a big release week — into a clip that travels on social.",
      },
    ],
    faqs: [
      {
        q: "How do I make an npm downloads video?",
        a: "Type a package name — react, typescript, or a scoped name like @tanstack/react-query — choose a style and size, and download. Everything renders in your browser.",
      },
      {
        q: "What number does it show?",
        a: "Downloads for the last week, from the official npm registry API. The chart style plots the last 52 weeks so you can see the trend as well as the total.",
      },
      {
        q: "Do npm download counts include CI and mirrors?",
        a: "Yes. npm counts every download, including continuous integration runs, Docker builds, and registry mirrors, so the figure reflects install traffic rather than unique users. That's true of every npm download badge, not just this one.",
      },
      {
        q: "Is it free?",
        a: "Yes — free, no sign-up, and no limit on the number of videos.",
      },
    ],
  },
  {
    slug: "youtube-subscribers",
    name: "YouTube Subscriber Count Video Generator",
    description:
      "Turn a channel's subscriber count into a shareable animated video.",
    icon: "youtube",
    shortName: "subscriber count video",
    steps: [
      {
        icon: "youtube",
        title: "Enter your channel",
        body:
          "A handle like @mkbhd, a channel URL, or a UC… channel ID. We fetch the live subscriber count from the YouTube Data API.",
      },
      {
        icon: "palette",
        title: "Pick a style and size",
        body:
          "Count up or Stat card, sized 16:9 for a video intro, 1:1 for the feed, or 9:16 for Shorts and Stories.",
      },
      {
        icon: "export",
        title: "Download the MP4",
        body:
          "Generated in your browser and saved instantly — drop it straight into your edit or post it as-is.",
      },
    ],
    personas: [
      {
        icon: "youtube",
        title: "Creators",
        body:
          "Celebrate a subscriber milestone with your audience, or open a video with a clean animated count instead of a static card.",
      },
      {
        icon: "frame",
        title: "Editors and channel managers",
        body:
          "Grab a milestone clip in seconds and cut it into the timeline, without building a counter animation by hand.",
      },
      {
        icon: "rocket",
        title: "Brands and agencies",
        body:
          "Show channel growth in a pitch deck or campaign wrap-up with something more alive than a bar chart.",
      },
    ],
    faqs: [
      {
        q: "How do I make a YouTube subscriber count video?",
        a: "Enter a channel handle like @mkbhd, a channel URL, or a UC… channel ID. Pick a style and size, then download the MP4 — it's generated in your browser.",
      },
      {
        q: "Why is the subscriber count rounded?",
        a: "YouTube's API only returns subscriber counts rounded to three significant figures — 20.1M rather than 20,143,882. Every tool built on the official API shows the same rounded figure; nobody has access to the exact number except the channel owner.",
      },
      {
        q: "Why can't it find my channel?",
        a: "Check that you're using the handle (starting with @) rather than the display name, and that the channel is public. Channels that hide their subscriber count can't be shown either.",
      },
      {
        q: "Is the YouTube subscriber video generator free?",
        a: "Yes, completely free and no account is needed.",
      },
    ],
  },
  {
    slug: "aspect-ratio-calculator",
    name: "Aspect Ratio Calculator",
    description:
      "Lock an aspect ratio and solve for the missing width or height in pixels.",
    icon: "frame",
    shortName: "aspect ratio calculator",
    steps: [
      {
        icon: "frame",
        title: "Pick an aspect ratio",
        body:
          "Start from a preset — 16:9, 9:16, 1:1, 4:5, 4:3 or 21:9 — covering every common video and social format.",
      },
      {
        icon: "type",
        title: "Lock one dimension",
        body:
          "Enter the width or height you already know and lock it. The calculator solves for the other side.",
      },
      {
        icon: "sparkles",
        title: "Read the exact pixels",
        body:
          "Get the matching dimension instantly, ready to paste into your editor's export settings or a CSS rule.",
      },
    ],
    personas: [
      {
        icon: "frame",
        title: "Video editors",
        body:
          "Work out a matching frame size when repurposing a landscape edit for vertical, without guessing at the crop.",
      },
      {
        icon: "palette",
        title: "Social media managers",
        body:
          "Hit each platform's expected shape exactly, so nothing gets auto-cropped or recompressed on upload.",
      },
      {
        icon: "wrench",
        title: "Front-end developers",
        body:
          "Size a video embed or thumbnail container to a precise ratio and keep the layout from shifting.",
      },
    ],
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
    shortName: "timecode converter",
    steps: [
      {
        icon: "timeline",
        title: "Enter timecode or frames",
        body:
          "Type an HH:MM:SS:FF timecode, or a raw frame count. The converter works in both directions.",
      },
      {
        icon: "frame",
        title: "Set the frame rate",
        body:
          "Pick the fps your project runs at — the same frame count means a different duration at 24, 30 or 60fps.",
      },
      {
        icon: "sparkles",
        title: "Read the conversion",
        body:
          "Get the exact counterpart immediately, ready for an edit note, a bug report, or a render range.",
      },
    ],
    personas: [
      {
        icon: "timeline",
        title: "Editors and assistants",
        body:
          "Translate a frame number from a review note into a timecode you can scrub to, and back again.",
      },
      {
        icon: "wrench",
        title: "Motion designers",
        body:
          "Convert a duration into frames when animating on a frame-based timeline rather than in seconds.",
      },
      {
        icon: "chat",
        title: "QA and reviewers",
        body:
          "Reference an exact moment in feedback so nobody has to hunt for the frame you meant.",
      },
    ],
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
    shortName: "file size estimator",
    steps: [
      {
        icon: "export",
        title: "Enter bitrate and duration",
        body:
          "Give the video bitrate, the audio bitrate and how long the piece runs. Or work backwards from a size you have to hit.",
      },
      {
        icon: "frame",
        title: "Check against your target",
        body:
          "See the estimate in MB or GB immediately, so you know whether an export will clear an upload limit.",
      },
      {
        icon: "sparkles",
        title: "Adjust before you render",
        body:
          "Tune the bitrate until the size fits, instead of discovering the problem after a long export.",
      },
    ],
    personas: [
      {
        icon: "export",
        title: "Video editors",
        body:
          "Plan an export that lands under a platform's file-size cap before committing to a render.",
      },
      {
        icon: "wrench",
        title: "Developers",
        body:
          "Budget storage and bandwidth for video assets, or size uploads against a limit you enforce.",
      },
      {
        icon: "rocket",
        title: "Marketers",
        body:
          "Check an ad or landing-page video will meet a channel's spec without a round trip to the editor.",
      },
    ],
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
    shortName: "social video size guide",
    steps: [
      {
        icon: "palette",
        title: "Find your platform",
        body:
          "Scan the table for the network and placement you're posting to — feed, Stories, Reels, Shorts or standard video.",
      },
      {
        icon: "frame",
        title: "Read the ratio and pixels",
        body:
          "Every entry lists the aspect ratio and the exact recommended pixel dimensions, side by side.",
      },
      {
        icon: "export",
        title: "Export at that size",
        body:
          "Match those numbers in your editor so the platform shows your video as you cut it.",
      },
    ],
    personas: [
      {
        icon: "palette",
        title: "Social media managers",
        body:
          "Post to a dozen placements without keeping a dozen specs in your head or re-checking each help centre.",
      },
      {
        icon: "frame",
        title: "Video editors",
        body:
          "Set up a sequence at the right size from the start, rather than reformatting after the fact.",
      },
      {
        icon: "rocket",
        title: "Small teams and founders",
        body:
          "Get platform-ready video without a dedicated designer or a subscription to look it up.",
      },
    ],
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
