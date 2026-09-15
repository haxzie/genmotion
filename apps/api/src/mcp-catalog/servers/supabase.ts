import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand } from "../icons";

export default defineMcpCatalogEntry({
  id: "supabase",
  name: "Supabase",
  description: "Query your Supabase projects and tables for real numbers in a stats video.",
  category: "Data",
  iconUrl: brand("supabase", "3FCF8E"),
  homepage: "https://supabase.com/docs/guides/getting-started/mcp",
  transport: "http",
  url: "https://mcp.supabase.com/mcp",
  auth: { kind: "oauth" },
  tags: ["database"],
});
