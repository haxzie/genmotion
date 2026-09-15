import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "deepwiki",
  name: "DeepWiki",
  description: "Ask questions about any public GitHub repository.",
  category: "Docs",
  iconUrl: favicon("deepwiki.com"),
  homepage: "https://docs.devin.ai/work-with-devin/deepwiki-mcp",
  transport: "http",
  url: "https://mcp.deepwiki.com/mcp",
  auth: { kind: "none" },
  tags: ["docs", "code"],
});
