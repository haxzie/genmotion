import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://genmotion.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the authenticated app and project editor out of the index.
      disallow: ["/dashboard", "/projects", "/skills", "/brand-assets", "/p/", "/login", "/signup"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
