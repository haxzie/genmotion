import { Img } from "@genmotion/motion";
import swooshInk from "../assets/nike-swoosh-ink.svg";
import swooshWhite from "../assets/nike-swoosh-white.svg";

/**
 * The mark, as a saved asset rather than a redrawn path — a hand-traced
 * swoosh is always slightly wrong and slightly wrong is worse than absent.
 */
export function Swoosh({
  width = 400,
  variant = "ink",
  clip = 1,
  id,
}: {
  width?: number;
  variant?: "ink" | "white";
  /** 0 → 1 left-to-right reveal. */
  clip?: number;
  id?: string;
}) {
  // The Simple Icons glyph is square; the swoosh occupies the middle band.
  const height = width * 0.36;
  return (
    <div
      id={id}
      style={{
        width,
        height,
        overflow: "hidden",
        clipPath: `inset(0 ${(1 - clip) * 100}% 0 0)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Img
        src={variant === "ink" ? swooshInk : swooshWhite}
        style={{
          width,
          height: width,
          objectFit: "contain",
          marginTop: -width * 0.32,
          marginBottom: -width * 0.32,
        }}
      />
    </div>
  );
}
