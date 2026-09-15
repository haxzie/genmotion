import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "runway",
  name: "Runway",
  description: "Generate video clips and images with Gen-4.5, Veo, Kling and more, on your Runway credits.",
  category: "Generative media",
  iconUrl: favicon("runwayml.com"),
  homepage: "https://docs.runway.team/api/mcp-server",
  transport: "http",
  url: "https://mcp.runwayml.com/mcp",
  auth: { kind: "oauth" },
  tags: ["video", "image"],
});
