import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "canva",
  name: "Canva",
  description: "Search and read your Canva designs and brand kits.",
  category: "Design & brand",
  iconUrl: favicon("canva.com"),
  homepage: "https://www.canva.dev/docs/apps/mcp-server/",
  transport: "http",
  url: "https://mcp.canva.com/mcp",
  auth: { kind: "oauth" },
  tags: ["design", "brand"],
});
