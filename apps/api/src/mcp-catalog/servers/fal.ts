import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "fal",
  name: "fal.ai",
  description: "Fast hosted models for images, video, music and speech — Flux, Kling, Veo and the rest.",
  category: "Generative media",
  iconUrl: favicon("fal.ai"),
  homepage: "https://fal.ai/docs/documentation/setting-up/mcp",
  transport: "http",
  url: "https://mcp.fal.ai/mcp",
  auth: { kind: "header", headerName: "Authorization", prefix: "Key ", hint: "Your fal API key.", tokenUrl: "https://fal.ai/dashboard/keys" },
  tags: ["image", "video", "audio"],
});
