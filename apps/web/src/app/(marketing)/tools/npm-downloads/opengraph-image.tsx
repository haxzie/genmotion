import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("npm-downloads");

export default function Image() {
  return toolOgImage("npm-downloads");
}
