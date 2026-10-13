import { defineMcpCatalogEntry } from "@genmotion/shared";
import { favicon } from "../icons";

/**
 * Mapbox's hosted server — the geography behind a map scene.
 *
 * A map shot is the one thing an agent cannot invent: a city has a real
 * place on the globe, a route has a real shape, and a wrong one is the
 * first thing a viewer spots. This answers all of it — geocoding, POI
 * search, directions, travel-time matrices, isochrones — plus a static
 * map image to draw the scene over.
 *
 * `oauth`: it registers a client dynamically (loopback redirect, PKCE,
 * public client) and the scopes it asks for are read-only, so Connect is
 * one click and no key is pasted.
 */
export default defineMcpCatalogEntry({
  id: "mapbox",
  name: "Mapbox",
  description: "Real geography for a map scene: geocoding, places, routes, travel times and static map images.",
  category: "Maps",
  iconUrl: favicon("mapbox.com"),
  homepage: "https://docs.mapbox.com/location-ai/mcp-servers/",
  transport: "http",
  url: "https://mcp.mapbox.com/mcp",
  auth: { kind: "oauth" },
  tags: ["maps", "geocoding", "routing"],
});
