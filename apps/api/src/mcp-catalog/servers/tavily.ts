import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "tavily",
  name: "Tavily",
  description: "Real-time search, extraction and crawling for fact-checked scripts.",
  category: "Research",
  iconUrl: favicon("tavily.com"),
  homepage: "https://docs.tavily.com/documentation/mcp",
  transport: "http",
  url: "https://mcp.tavily.com/mcp/",
  auth: { kind: "oauth" },
  tags: ["search", "web"],
});
