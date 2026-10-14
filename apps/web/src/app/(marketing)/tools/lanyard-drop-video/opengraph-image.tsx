import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("lanyard-drop-video");

export default function Image() {
  return toolOgImage("lanyard-drop-video");
}
