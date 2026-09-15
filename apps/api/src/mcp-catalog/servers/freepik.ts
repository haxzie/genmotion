import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "freepik",
  name: "Freepik",
  description: "Stock photos, vectors and icons, plus Mystic image generation.",
  category: "Stock & assets",
  iconUrl: brand("freepik", "1273EB"),
  homepage: "https://www.pulsemcp.com/servers/freepik",
  transport: "http",
  url: "https://api.freepik.com/mcp",
  auth: { kind: "header", headerName: "x-freepik-api-key", hint: "Your Freepik API key.", tokenUrl: "https://www.freepik.com/developers/dashboard/api-key" },
  tags: ["stock", "icons", "vectors"],
});
