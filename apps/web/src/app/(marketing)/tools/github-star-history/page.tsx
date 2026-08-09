import type { Metadata } from "next";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { toolJsonLd } from "@/lib/marketing/tool-jsonld";
import { getTool } from "@/lib/marketing/tools";
import { Tool } from "./tool";

// The tool itself is a client component, which can't export metadata — hence
// this server wrapper. It also owns the structured data: it's static, so there
// is no reason to ship it in the client bundle.
const TOOL = getTool("github-star-history")!;

export const metadata: Metadata = pageMetadata({
  title: `${TOOL.name} — Free Online Tool | GenMotion`,
  description: TOOL.metaDescription,
  path: `/tools/${TOOL.slug}`,
  // This route ships its own opengraph-image; Next replaces openGraph.images
  // rather than merging, so the default card would shadow the generated one.
  image: null,
});

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd(TOOL)} />
      <Tool />
    </>
  );
}
