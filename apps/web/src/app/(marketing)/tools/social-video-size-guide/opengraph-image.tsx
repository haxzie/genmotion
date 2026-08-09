import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("social-video-size-guide");

export default function Image() {
  return toolOgImage("social-video-size-guide");
}
