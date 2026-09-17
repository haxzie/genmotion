import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("product-hunt-launch");

export default function Image() {
  return toolOgImage("product-hunt-launch");
}
