import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "exa",
  name: "Exa",
  description: "Web search built for agents — research a topic before writing the script.",
  category: "Research",
  iconUrl: favicon("exa.ai"),
  homepage: "https://docs.exa.ai/reference/exa-mcp",
  transport: "http",
  url: "https://mcp.exa.ai/mcp",
  auth: { kind: "none" },
  tags: ["search", "web"],
});
