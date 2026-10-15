/** fomo's palette and type, sampled from the reference frames and fomo.family. */
import aeonikRegular from "../assets/Aeonik-Regular.woff2";
import aeonikMedium from "../assets/Aeonik-Medium.woff2";
import aeonikBold from "../assets/Aeonik-Bold.woff2";
import type { FontFile } from "@genmotion/three-engine";

export const C = {
  /** Background gradient, top → bottom (linear in sRGB, sampled at y = 0 and 719). */
  bgTop: "#6572f2",
  bgBottom: "#9ca4f5",
  /** The fomo blue of the coin face. */
  blue: "#4b4ced",
  /** Pupils. */
  ink: "#090420",
  /** Eye whites, rim. */
  white: "#fcfefc",
  rim: "#e4e7fb",
  /** "easier" on white. */
  dark: "#1a1638",
  black: "#05040f",
};

export const FAMILY = "Aeonik";
export const FONTS: FontFile[] = [
  { family: FAMILY, url: aeonikRegular, weight: "400" },
  { family: FAMILY, url: aeonikMedium, weight: "500" },
  { family: FAMILY, url: aeonikBold, weight: "700" },
];
