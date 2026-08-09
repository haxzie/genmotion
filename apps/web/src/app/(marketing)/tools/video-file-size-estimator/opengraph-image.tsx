import { toolOgAlt, toolOgImage } from "@/lib/marketing/tool-og";

export { size, contentType } from "@/lib/marketing/tool-og";
export const alt = toolOgAlt("video-file-size-estimator");

export default function Image() {
  return toolOgImage("video-file-size-estimator");
}
