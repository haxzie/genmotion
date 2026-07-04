import type { MetadataRoute } from "next";
import { FEATURES } from "@/lib/marketing/features";
import { TOOLS } from "@/lib/marketing/tools";
import {
  getAllPosts,
  getAllShowcaseVideos,
  getAllTerms,
} from "@/lib/marketing/content";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://genmotion.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/pricing",
    "/about",
    "/features",
    "/blog",
    "/glossary",
    "/tools",
    "/showcase",
  ].map((path) => ({ url: `${BASE}${path}`, changeFrequency: "weekly" as const }));

  const featureRoutes = FEATURES.map((f) => ({
    url: `${BASE}/features/${f.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const toolRoutes = TOOLS.map((t) => ({
    url: `${BASE}/tools/${t.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const postRoutes = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date || undefined,
    changeFrequency: "monthly" as const,
  }));

  const termRoutes = getAllTerms().map((t) => ({
    url: `${BASE}/glossary/${t.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const showcaseRoutes = getAllShowcaseVideos().map((v) => ({
    url: `${BASE}/showcase/${v.slug}`,
    lastModified: v.date || undefined,
    changeFrequency: "monthly" as const,
  }));

  return [
    ...staticRoutes,
    ...featureRoutes,
    ...toolRoutes,
    ...postRoutes,
    ...termRoutes,
    ...showcaseRoutes,
  ];
}
