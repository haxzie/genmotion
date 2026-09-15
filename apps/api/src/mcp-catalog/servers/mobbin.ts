import { defineMcpCatalogEntry } from "@genmotion/shared";
import { favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "mobbin",
  name: "Mobbin",
  description: "Real app and web UI screens, flows and patterns to reference when a scene shows a product.",
  category: "Design & brand",
  iconUrl: favicon("mobbin.com"),
  homepage: "https://mobbin.com",
  transport: "http",
  url: "https://api.mobbin.com/mcp",
  auth: { kind: "oauth" },
  tags: ["design", "reference"],
});
