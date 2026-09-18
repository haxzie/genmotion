// Reception.ai / ElevenLabs launch-film palette and type tokens.
export const brand = {
  font: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",

  // Warm paper world (first half)
  paper: "#efeeea",
  paperGrid: "rgba(0,0,0,0.055)",
  ink: "#111111",
  inkMuted: "#5c5c57",
  tile: "#e2e1dd",

  // Dither / halftone world
  ditherBlue: "linear-gradient(160deg, #1f6db5 0%, #2a7bbd 35%, #4a8a8a 62%, #8f9a4a 100%)",
  ditherGreen: "linear-gradient(160deg, #5a8a3a 0%, #3a7a76 55%, #2f5f98 100%)",

  // Orange "Until now" world
  orange: "linear-gradient(180deg, #e8462b 0%, #ee5a2a 45%, #f38a2c 100%)",

  // Dark world (second half)
  black: "#000000",
  white: "#f4f4f2",
  whiteMuted: "#9d9d9a",

  // Mesh gradient (blurred photo look)
  mesh: {
    green: "#5f9a3a",
    deep: "#1d3a20",
    olive: "#b9b73a",
    sky: "#8bb8d6",
    tan: "#c39a6b",
  },
} as const;

export const headline = {
  fontFamily: brand.font,
  fontWeight: 400,
  letterSpacing: "-0.02em",
  lineHeight: 1,
} as const;
