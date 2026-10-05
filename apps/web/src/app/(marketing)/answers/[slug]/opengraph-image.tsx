import { ImageResponse } from "next/og";
import { getAllAnswers, getAnswerBySlug } from "@/lib/marketing/content";
import { TOOL_META } from "@/lib/marketing/answers";

/**
 * Per-answer social card, the same treatment as the blog's: without it a link
 * to an answer looks like a link to any other page. This renders the answer's
 * own title, and the tool it is about, on the brand background.
 *
 * Satori (what ImageResponse runs on) supports a subset of CSS: every element
 * with more than one child needs an explicit `display: flex`, and there is no
 * `gap` shorthand inheritance, so the layout below is deliberately verbose.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GenMotion answer";

export function generateStaticParams() {
  return getAllAnswers().map((a) => ({ slug: a.slug }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const answer = getAnswerBySlug(slug);
  const title = answer?.title ?? "GenMotion";
  const tag = answer ? `${TOOL_META[answer.tool].name} answer` : "answer";

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
