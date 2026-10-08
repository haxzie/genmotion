import { defineMcpCatalogEntry } from "@genmotion/shared";
import { favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "notion",
  name: "Notion",
  description: "Pull scripts, briefs and product copy straight from your Notion pages.",
  category: "Content sources",
  iconUrl: favicon("notion.so"),
  homepage: "https://developers.notion.com/docs/mcp",
  transport: "http",
  url: "https://mcp.notion.com/mcp",
  auth: { kind: "oauth" },
  tags: ["docs", "notes"],
});
