/**
 * Lovable brand tokens — taken from the official brand hub
 * (lovablebrand.lovable.app). Change a value here and the whole video reskins.
 */

export const c = {
  // Neutrals
  creme: "#F7F4ED",
  white: "#FFFFFF",
  ink: "#1B1B1B",
  muted: "#5C5A55",
  line: "rgba(27,27,27,0.10)",
  block: "rgba(27,27,27,0.13)",
  blockSoft: "rgba(27,27,27,0.07)",

  // Brand spectrum
  yellow: "#FFA517",
  orange: "#FF6D1B",
  red: "#F7101D",
  pink: "#FF0178",
  bubblegum: "#FFA6F9",
  violet: "#BBC1FF",
  blue: "#4B73FF",
  lightBlue: "#4E93FF",
} as const;

/**
 * Horizontal full-spectrum gradient — the signature brand fill.
 * Intermediate anchors keep the hue path curved (and the ramp seam-free) even
 * when it is squeezed into a 12px underline.
 */
export const gradFull = `linear-gradient(90deg, ${c.yellow} 0%, #FF8C18 7%, ${c.orange} 14%, #FD531B 21%, #FA331C 27%, ${c.red} 33%, #F9084A 40%, ${c.pink} 47%, #FF3596 54%, #FF6FCB 60%, ${c.bubblegum} 66%, #E9B2FC 72%, ${c.violet} 78%, #96AAFF 85%, #6688FF 91%, ${c.blue} 96%, ${c.lightBlue} 100%)`;

/**
 * Mesh fills — soft colour blobs layered over a base ramp, the same way the
 * Lovable mark is built. Every stop is a percentage, so they stay perfectly
 * smooth whether they fill a 720px card or a 40px pill.
 */
export const meshWarm = [
  `radial-gradient(140% 160% at 8% 4%, ${c.yellow} 0%, rgba(255,165,23,0) 64%)`,
  `radial-gradient(150% 150% at 92% 8%, ${c.orange} 0%, rgba(255,109,27,0) 68%)`,
  `radial-gradient(160% 170% at 34% 104%, ${c.pink} 0%, rgba(255,1,120,0) 72%)`,
  `linear-gradient(145deg, ${c.orange} 0%, ${c.red} 100%)`,
].join(", ");

export const meshCool = [
  `radial-gradient(150% 160% at 6% 6%, ${c.pink} 0%, rgba(255,1,120,0) 66%)`,
  `radial-gradient(150% 150% at 96% 14%, ${c.bubblegum} 0%, rgba(255,166,249,0) 70%)`,
  `radial-gradient(170% 170% at 40% 106%, ${c.blue} 0%, rgba(75,115,255,0) 74%)`,
  `linear-gradient(150deg, #FF4FA6 0%, ${c.violet} 100%)`,
].join(", ");

export const meshVert = [
  `radial-gradient(160% 150% at 14% 0%, ${c.orange} 0%, rgba(255,109,27,0) 62%)`,
  `radial-gradient(150% 160% at 88% 40%, ${c.pink} 0%, rgba(255,1,120,0) 68%)`,
  `radial-gradient(170% 160% at 30% 108%, ${c.lightBlue} 0%, rgba(78,147,255,0) 74%)`,
  `linear-gradient(170deg, #FF5A4A 0%, #A57BFF 62%, ${c.blue} 100%)`,
].join(", ");

/** Small round spectrum fill — smooth at dot scale, unlike a stripe ramp. */
export const gradDot = `radial-gradient(circle at 28% 22%, ${c.yellow} 0%, ${c.orange} 26%, ${c.red} 46%, ${c.pink} 66%, ${c.violet} 88%, ${c.blue} 112%)`;

/** Brand typeface is Camera Plain; Inter is the substitute in-render. */
export const font = '"Camera Plain", Inter, system-ui, sans-serif';

/** Brand type scale, scaled up for 1080p motion. */
export const type = {
  hero: { fontSize: 220, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 },
  h1: { fontSize: 92, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.02 },
  h2: { fontSize: 62, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 },
  body: { fontSize: 36, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 },
  small: { fontSize: 30, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 },
  eyebrow: {
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
  },
} as const;

export const soft =
  "0 34px 90px rgba(27,27,27,0.10), 0 3px 8px rgba(27,27,27,0.04)";

/** Creme scrim strength used to push the app-wall back behind copy. */
export const WALL_SCRIM = 0.85;
