import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "mux",
  name: "Mux",
  description: "Upload finished videos to Mux for hosting, playback and analytics.",
  category: "Publishing",
  iconUrl: favicon("mux.com"),
  homepage: "https://www.mux.com/docs/integrations/mcp-server",
  transport: "http",
  url: "https://mcp.mux.com",
  auth: { kind: "oauth" },
  tags: ["hosting", "analytics"],
});
