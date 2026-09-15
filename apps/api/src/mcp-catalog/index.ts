import { createMcpCatalog } from "./registry";
import elevenlabs from "./servers/elevenlabs";
import runway from "./servers/runway";
import replicate from "./servers/replicate";
import fal from "./servers/fal";
import huggingface from "./servers/huggingface";
import freepik from "./servers/freepik";
import cloudinary from "./servers/cloudinary";
import canva from "./servers/canva";
import mobbin from "./servers/mobbin";
import mux from "./servers/mux";
import firecrawl from "./servers/firecrawl";
import exa from "./servers/exa";
import tavily from "./servers/tavily";
import notion from "./servers/notion";
import linear from "./servers/linear";
import github from "./servers/github";
import posthog from "./servers/posthog";
import stripe from "./servers/stripe";
import supabase from "./servers/supabase";
import context7 from "./servers/context7";
import deepwiki from "./servers/deepwiki";

/**
 * The marketplace: remote MCP servers the desktop app offers to connect.
 *
 * Chosen for what a video needs — a voice, generated or stock footage, the
 * brand it should match, somewhere to publish, and the facts the script is
 * built on — rather than for what a coding agent needs. Served rather than
 * shipped in the app so a new server — or a vendor moving an endpoint —
 * lands without a desktop release.
 *
 * To add one: a file under `servers/` that default-exports
 * `defineMcpCatalogEntry({...})` (the schema in `@genmotion/shared` rejects
 * a half-described entry at load), then a line here in the group it belongs
 * to. `auth` is the whole contract with the app — see `McpCatalogAuth` —
 * and probing the vendor's authorization server first is worth the minute:
 * Figma allowlists registration and Adobe answers 403 outright.
 *
 * Not here, and why: Adobe for creativity — 403 with no discoverable
 * authorization server.
 */
export const MCP_CATALOG = createMcpCatalog([
  // Voice & audio
  elevenlabs,
  // Generative media
  runway,
  replicate,
  fal,
  huggingface,
  // Stock & assets
  freepik,
  cloudinary,
  // Design & brand — no Figma: the hosted server registers only partner
  // IDEs (403 for anyone else), and the desktop one ties a card to an app
  // that has to be open. Back once Figma lists GenMotion.
  canva,
  mobbin,
  // Publishing
  mux,
  // Research
  firecrawl,
  exa,
  tavily,
  // Content sources
  notion,
  linear,
  github,
  // Data
  posthog,
  stripe,
  supabase,
  // Docs for the agent
  context7,
  deepwiki,
]);

export const MCP_CATALOG_ENTRIES = MCP_CATALOG.entries;
