import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import displayRegularUrl from "../assets/InterDisplay-Regular.woff2";
import displayMediumUrl from "../assets/InterDisplay-Medium.woff2";
import displaySemiUrl from "../assets/InterDisplay-SemiBold.woff2";
import monoUrl from "../assets/JetBrainsMono.woff2";
import { withFonts } from "./type";

/**
 * Firebase palette. The three flame colours are the official logo colours
 * (firebase.google.com icon.svg); ink and greys are Google's (#202124, #5E5E5E wordmark).
 */
export const C = {
  black: "#000000",
  white: "#ffffff",
  paper: "#fcfcfd",
  ink: "#202124", // Google dark grey: type on light grounds
  wordmark: "#5E5E5E", // the Firebase wordmark grey
  red: "#DD2C00", // flame body: floods, pills, brand type on white (4.7:1 with white)
  orange: "#FF9100", // flame side: accents, lines, dots
  amber: "#FFC400", // flame core: highlights
  flood: "#DD2C00",
  floodDeep: "#2A0B02", // the dark end of the warm mosaic
  grid: "#ececf1",
  // kept so older imports still resolve
  purple: "#DD2C00",
  lilac: "#FFB74D",
} as const;

export { FONT as FONT_SANS } from "./type";
export const FONT_MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

/** Every scene wraps its builder in this, so no texture is drawn in a fallback face. */
export function withBrandFonts(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  return withFonts(
    ctx,
    [
      { family: "Inter", url: interUrl },
      { family: "Inter Display", url: displayRegularUrl, weight: "400" },
      { family: "Inter Display", url: displayMediumUrl, weight: "500" },
      { family: "Inter Display", url: displaySemiUrl, weight: "600" },
      { family: "JetBrains Mono", url: monoUrl, weight: "400" },
    ],
    build,
  );
}

/** Type roles used across the film (sizes in composition px, measured from the reference). */
export const TYPE = {
  hero: { size: 120, weight: 500, tracking: -0.035 },
  heroDark: { size: 120, weight: 500, tracking: -0.035, color: C.ink },
  mono: { size: 14, weight: 400, tracking: 0, font: FONT_MONO },
} as const;
