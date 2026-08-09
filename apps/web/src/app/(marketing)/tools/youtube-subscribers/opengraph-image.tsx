import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("youtube-subscribers");

export default function Image() {
  return toolOgImage("youtube-subscribers");
}
