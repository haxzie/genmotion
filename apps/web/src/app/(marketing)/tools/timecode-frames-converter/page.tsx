import type { Metadata } from "next";
import { pageMetadata } from "@/lib/marketing/seo";
import { getTool } from "@/lib/marketing/tools";
import { TimecodeFramesConverter } from "./tool";

// The calculator itself is a client component, which can't export metadata —
// hence this server wrapper. Without it the page inherits the site-wide card,
// including a homepage og:url.
const TOOL = getTool("timecode-frames-converter")!;

export const metadata: Metadata = pageMetadata({
  title: `${TOOL.name} — Free Online Tool | GenMotion`,
  description: TOOL.description,
  path: `/tools/${TOOL.slug}`,
});

export default function Page() {
  return <TimecodeFramesConverter />;
}
