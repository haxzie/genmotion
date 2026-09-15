import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "posthog",
  name: "PostHog",
  description: "Product analytics — real numbers for a stats or growth video.",
  category: "Data",
  iconUrl: brand("posthog", "F9BD2B"),
  homepage: "https://posthog.com/docs/model-context-protocol",
  transport: "http",
  url: "https://mcp.posthog.com/mcp",
  auth: { kind: "header", headerName: "Authorization", prefix: "Bearer ", hint: "A personal API key.", tokenUrl: "https://app.posthog.com/settings/user-api-keys" },
  tags: ["analytics"],
});
