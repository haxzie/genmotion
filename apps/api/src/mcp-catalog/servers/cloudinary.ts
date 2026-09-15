import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "cloudinary",
  name: "Cloudinary",
  description: "Your media library: search, fetch and transform the images and video you already have.",
  category: "Stock & assets",
  iconUrl: brand("cloudinary", "3448C5"),
  homepage: "https://cloudinary.com/documentation/cloudinary_llm_mcp",
  transport: "http",
  url: "https://asset-management.mcp.cloudinary.com/sse",
  auth: { kind: "oauth" },
  tags: ["media library"],
});
