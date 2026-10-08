import { defineMcpCatalogEntry } from "@genmotion/shared";
import { favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "stripe",
  name: "Stripe",
  description: "Customers, products and revenue from your Stripe account.",
  category: "Data",
  iconUrl: favicon("stripe.com"),
  homepage: "https://docs.stripe.com/mcp",
  transport: "http",
  url: "https://mcp.stripe.com",
  auth: { kind: "oauth" },
  tags: ["billing", "revenue"],
});
