import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "huggingface",
  name: "Hugging Face",
  description: "Search models and Spaces on the Hub and run image or audio generation there.",
  category: "Generative media",
  iconUrl: brand("huggingface", "FFD21E"),
  homepage: "https://huggingface.co/settings/mcp",
  transport: "http",
  url: "https://huggingface.co/mcp",
  auth: { kind: "none" },
  tags: ["image", "audio", "models"],
});
