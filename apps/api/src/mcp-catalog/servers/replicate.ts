import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "replicate",
  name: "Replicate",
  description: "Thousands of open image, video, audio and upscaling models behind one API.",
  category: "Generative media",
  iconUrl: brand("replicate", "FFFFFF"),
  homepage: "https://replicate.com/docs/reference/mcp",
  transport: "http",
  url: "https://mcp.replicate.com/sse",
  auth: { kind: "oauth" },
  tags: ["image", "video", "audio"],
});
