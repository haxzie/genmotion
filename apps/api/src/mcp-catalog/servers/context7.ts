import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "context7",
  name: "Context7",
  description: "Current documentation for any library, so generated scene code uses today's API.",
  category: "Docs",
  iconUrl: favicon("context7.com"),
  homepage: "https://context7.com",
  transport: "http",
  url: "https://mcp.context7.com/mcp",
  auth: { kind: "none" },
  tags: ["docs", "code"],
});
