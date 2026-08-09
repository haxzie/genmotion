import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("github-star-count");

export default function Image() {
  return toolOgImage("github-star-count");
}
