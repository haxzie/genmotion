import { ImageResponse } from "next/og";
import { getTool } from "@/lib/marketing/tools";

/**
 * Per-tool social card. Every tool page used to share the one static /og.png,
 * so a link to the star-count generator and a link to the timecode converter
 * looked identical in a timeline — this puts the tool's own name on the card.
 *
 * Satori (what ImageResponse runs on) supports a subset of CSS: every element
 * with more than one child needs an explicit `display: flex`, and `gap` is
 * unreliable, so the layout below is deliberately verbose. Matches the blog's
 * card so the two read as one family.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function toolOgAlt(slug: string): string {
  const tool = getTool(slug);
  return tool ? `${tool.name} — free, no sign-up` : "GenMotion free tools";
}

export function toolOgImage(slug: string): ImageResponse {
  const tool = getTool(slug);
  const title = tool?.name ?? "Free tools";
  const description = tool?.description ?? "";

  // Long names need to step down a size or they overflow the card.
  const fontSize = title.length > 40 ? 62 : title.length > 28 ? 72 : 82;

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
              border: "1px solid rgba(6,193,103,0.45)",
              background: "rgba(6,193,103,0.14)",
              color: "#5fe0a1",
              fontSize: 26,
            }}
          >
            Free tool
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#a0a0a6",
              maxWidth: 900,
            }}
          >
            {description}
          </div>
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
