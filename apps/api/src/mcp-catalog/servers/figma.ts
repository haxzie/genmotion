import { defineMcpCatalogEntry } from "@genmotion/shared";
import { favicon } from "../icons";

/**
 * Figma's hosted MCP server — frames, variables and the design context behind
 * a video that has to match a product.
 *
 * `clientName` is the part that makes it work: Figma allowlists dynamic
 * registration by client name, and `api.figma.com/v1/oauth/mcp/register`
 * answers 403 to anything that is not a partner client. The agent that holds
 * this connection is Claude Code — the app hands it the server and the token
 * for the turn — so that is the name it registers under.
 */
export default defineMcpCatalogEntry({
  id: "figma",
  name: "Figma",
  description: "Read frames, components and variables from your Figma files, and pull a design's real styles.",
  category: "Design & brand",
  iconUrl: favicon("figma.com"),
  homepage: "https://developers.figma.com/docs/figma-mcp-server/",
  transport: "http",
  url: "https://mcp.figma.com/mcp",
  auth: { kind: "oauth", clientName: "Claude Code" },
  tags: ["design", "brand"],
});
