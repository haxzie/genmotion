import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("aspect-ratio-calculator");

export default function Image() {
  return toolOgImage("aspect-ratio-calculator");
}
