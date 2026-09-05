import type { MetadataRoute } from "next";
import { FEATURES } from "@/lib/marketing/features";
import { USE_CASES } from "@/lib/marketing/use-cases";
import { TOOLS } from "@/lib/marketing/tools";
import {
  getAllPosts,
  getAllShowcaseVideos,
  getAllTerms,
} from "@/lib/marketing/content";
import { getAllTemplateSummaries } from "@/lib/marketing/templates";
import { TEMPLATE_CATEGORIES } from "@/lib/marketing/template-categories";
import { SITE_URL } from "@/lib/marketing/site";

const BASE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/pricing",
    "/about",
    "/features",
    "/use-cases",
    "/blog",
    "/glossary",
    "/tools",
    "/showcase",
    "/templates",
  ].map((path) => ({ url: `${BASE}${path}`, changeFrequency: "weekly" as const }));

  const featureRoutes = FEATURES.map((f) => ({
    url: `${BASE}/features/${f.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const useCaseRoutes = USE_CASES.map((u) => ({
    url: `${BASE}/use-cases/${u.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const toolRoutes = TOOLS.map((t) => ({
    url: `${BASE}/tools/${t.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const postRoutes = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updated || p.date || undefined,
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

  const templateSummaries = await getAllTemplateSummaries();
  const templateRoutes = templateSummaries.map((t) => ({
    url: `${BASE}/templates/${t.id}`,
    changeFrequency: "monthly" as const,
  }));

  // Same "don't list an empty page" rule as generateStaticParams on the
  // category route itself.
  const templateCategoryRoutes = TEMPLATE_CATEGORIES.filter((c) =>
    templateSummaries.some((t) => t.tags.includes(c.tag)),
  ).map((c) => ({
    url: `${BASE}/templates/category/${c.slug}`,
    changeFrequency: "monthly" as const,
  }));

  return [
    ...staticRoutes,
    ...featureRoutes,
    ...useCaseRoutes,
    ...toolRoutes,
    ...postRoutes,
    ...termRoutes,
    ...showcaseRoutes,
    ...templateRoutes,
    ...templateCategoryRoutes,
  ];
}
