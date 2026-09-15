import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "firecrawl",
  name: "Firecrawl",
  description: "Read any website as clean text — the copy, the product, the brand — before writing the script.",
  category: "Research",
  iconUrl: favicon("firecrawl.dev"),
  homepage: "https://docs.firecrawl.dev/mcp-server",
  transport: "http",
  url: "https://mcp.firecrawl.dev/v2/mcp-oauth",
  auth: { kind: "oauth" },
  tags: ["web", "scraping"],
});
