import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "linear",
  name: "Linear",
  description: "Issues, projects and cycles — turn a release into a changelog video.",
  category: "Content sources",
  iconUrl: brand("linear", "5E6AD2"),
  homepage: "https://linear.app/docs/mcp",
  transport: "http",
  url: "https://mcp.linear.app/mcp",
  auth: { kind: "oauth" },
  tags: ["issues", "roadmap"],
});
