/**
 * The marketplace, as the homepage shows it.
 *
 * A curated mirror of `apps/api/src/mcp-catalog`, not a fetch of it: the
 * homepage is static and the copy here is marketing rather than the
 * catalog's tool descriptions. When an entry is added to the catalog, add it
 * here too. Icons come from the same two sources the desktop marketplace
 * uses, so the marks match what people see in the app.
 */

/** Brand mark from Simple Icons, in the brand's own colour. */
const brand = (slug: string, color: string) => `https://cdn.simpleicons.org/${slug}/${color}`;

/** A vendor without a Simple Icons entry: its favicon, via Google's resolver. */
const favicon = (domain: string) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

export type Integration = {
  id: string;
  name: string;
  iconUrl: string;
  /** The marketplace category, as the app's pills read. */
  category: string;
};

/** In marketplace order: what a video needs first. */
export const INTEGRATIONS: Integration[] = [
  { id: "elevenlabs", name: "ElevenLabs", iconUrl: brand("elevenlabs", "FFFFFF"), category: "Voice & audio" },
  { id: "fal", name: "fal.ai", iconUrl: favicon("fal.ai"), category: "Generative media" },
  { id: "runway", name: "Runway", iconUrl: favicon("runwayml.com"), category: "Generative media" },
  { id: "replicate", name: "Replicate", iconUrl: brand("replicate", "FFFFFF"), category: "Generative media" },
  { id: "huggingface", name: "Hugging Face", iconUrl: brand("huggingface", "FFD21E"), category: "Generative media" },
  { id: "freepik", name: "Freepik", iconUrl: brand("freepik", "1273EB"), category: "Stock & assets" },
  { id: "cloudinary", name: "Cloudinary", iconUrl: brand("cloudinary", "3448C5"), category: "Stock & assets" },
  { id: "canva", name: "Canva", iconUrl: favicon("canva.com"), category: "Design & brand" },
  { id: "mobbin", name: "Mobbin", iconUrl: favicon("mobbin.com"), category: "Design & brand" },
  { id: "notion", name: "Notion", iconUrl: brand("notion", "FFFFFF"), category: "Content sources" },
  { id: "github", name: "GitHub", iconUrl: brand("github", "FFFFFF"), category: "Content sources" },
  { id: "linear", name: "Linear", iconUrl: brand("linear", "5E6AD2"), category: "Content sources" },
  { id: "stripe", name: "Stripe", iconUrl: brand("stripe", "635BFF"), category: "Data" },
  { id: "posthog", name: "PostHog", iconUrl: brand("posthog", "F9BD2B"), category: "Data" },
  { id: "supabase", name: "Supabase", iconUrl: brand("supabase", "3FCF8E"), category: "Data" },
  { id: "firecrawl", name: "Firecrawl", iconUrl: favicon("firecrawl.dev"), category: "Research" },
  { id: "exa", name: "Exa", iconUrl: favicon("exa.ai"), category: "Research" },
  { id: "tavily", name: "Tavily", iconUrl: favicon("tavily.com"), category: "Research" },
  { id: "context7", name: "Context7", iconUrl: favicon("context7.com"), category: "Docs" },
  { id: "deepwiki", name: "DeepWiki", iconUrl: favicon("deepwiki.com"), category: "Docs" },
  { id: "mux", name: "Mux", iconUrl: favicon("mux.com"), category: "Publishing" },
];

