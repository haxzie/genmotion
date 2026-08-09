import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("timecode-frames-converter");

export default function Image() {
  return toolOgImage("timecode-frames-converter");
}
