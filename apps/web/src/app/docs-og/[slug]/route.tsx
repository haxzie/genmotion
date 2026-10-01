import { ImageResponse } from "next/og";
import { getAllDocs, getDoc } from "@/lib/docs/content";

/**
 * A social card per docs page: the section, the page title and what it covers.
 * A route rather than the `opengraph-image` file convention so `pageMetadata`
 * can name one URL for both the Open Graph and the Twitter card.
 *
 * Satori needs `display: flex` on anything with more than one child.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: d.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const doc = getDoc((await params).slug);
  const title = doc?.title ?? "GenMotion Docs";
  const fontSize = title.length > 40 ? 68 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(1000px 640px at 15% 0%, #0f2a1d 0%, #0a0a0c 65%)",
          color: "#ededef",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#ededef" }}>GenMotion Docs</div>
          <div style={{ display: "flex", margin: "0 18px", width: 2, height: 30, background: "rgba(255,255,255,0.18)" }} />
          <div style={{ display: "flex", fontSize: 28, color: "#06c167" }}>{doc?.group ?? "Documentation"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize, lineHeight: 1.08, letterSpacing: "-0.03em", maxWidth: 1000 }}>{title}</div>
          {doc?.description && (
            <div style={{ display: "flex", marginTop: 28, fontSize: 30, lineHeight: 1.4, color: "#a0a0a6", maxWidth: 980 }}>
              {doc.description.length > 130 ? `${doc.description.slice(0, 127)}…` : doc.description}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, background: "#06c167", marginRight: 16 }} />
            <div style={{ display: "flex", fontSize: 28, color: "#a0a0a6" }}>genmotion.dev/docs</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
