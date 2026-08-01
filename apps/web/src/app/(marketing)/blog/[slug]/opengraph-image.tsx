import { ImageResponse } from "next/og";
import { getAllPosts, getPostBySlug } from "@/lib/marketing/content";

/**
 * Per-post social card. Every page used to share the one static /og.png, so a
 * link to any post looked identical in a timeline — this renders the post's own
 * title on the brand background instead.
 *
 * Satori (what ImageResponse runs on) supports a subset of CSS: every element
 * with more than one child needs an explicit `display: flex`, and there is no
 * `gap` shorthand inheritance, so the layout below is deliberately verbose.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GenMotion blog post";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? "GenMotion";
  const tag = post?.tags[0] ?? "blog";

  // Long headlines need to step down a size or they overflow the card.
  const fontSize = title.length > 95 ? 54 : title.length > 60 ? 64 : 76;

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
          background:
            "radial-gradient(1100px 700px at 50% 0%, #141631 0%, #0a0a0c 70%)",
          color: "#ededef",
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              padding: "8px 22px",
              borderRadius: 999,
              border: "1px solid rgba(59,110,246,0.45)",
              background: "rgba(59,110,246,0.14)",
              color: "#9db3fb",
              fontSize: 26,
              textTransform: "capitalize",
            }}
          >
            {tag}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize,
            lineHeight: 1.12,
            letterSpacing: "-0.025em",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "#3b6ef6",
                marginRight: 16,
              }}
            />
            <div style={{ display: "flex", fontSize: 32 }}>GenMotion</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#8a8a93" }}>
            genmotion.dev
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
